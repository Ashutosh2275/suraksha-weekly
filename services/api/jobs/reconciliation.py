"""Payout reconciliation job and APScheduler wiring."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable

import redis.asyncio as aioredis
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.payout_gateway import PayoutGateway, PayoutGatewayFactory, PayoutResult
from core.database import DatabaseManager
from core.config import settings
from models import AuditLog, PayoutTransaction
from services.audit import log_event

logger = logging.getLogger(__name__)

_UNCERTAIN_RECHECK_MINUTES = 5
_ESCALATION_HOURS = 2
_SUCCESS_REVIEW_HOURS = 24
_ALERT_CHANNEL = "admin_alerts"
_QUEUE_CHANNEL = "bull:admin-alerts:wait"


@dataclass(slots=True)
class ReconciliationAlertPublisher:
    redis_client: aioredis.Redis

    async def emit(self, event_name: str, payload: dict[str, Any]) -> None:
        envelope = {
            "name": event_name,
            "data": payload,
            "timestamp": datetime.utcnow().isoformat(),
        }
        body = json.dumps(envelope)
        await self.redis_client.publish(_ALERT_CHANNEL, body)
        await self.redis_client.lpush(_QUEUE_CHANNEL, body)


@dataclass(slots=True)
class ReconciliationSummary:
    inspected_uncertain: int = 0
    confirmed_success: int = 0
    confirmed_failed: int = 0
    escalated_for_manual_review: int = 0
    verified_success: int = 0
    mismatches: int = 0
    unresolved_uncertain: int = 0
    total_amount: float = 0.0
    status_counts: dict[str, int] = field(default_factory=dict)


class PayoutReconciliationJob:
    def __init__(
        self,
        *,
        gateway: PayoutGateway | None = None,
        alert_publisher: ReconciliationAlertPublisher | None = None,
        session_factory: Callable[[], Any] | None = None,
        now_factory: Callable[[], datetime] | None = None,
    ) -> None:
        self.gateway = gateway or PayoutGatewayFactory.create()
        self.alert_publisher = alert_publisher
        self.session_factory = session_factory
        self.now_factory = now_factory or datetime.utcnow

    async def run_due_reconciliation(self) -> ReconciliationSummary:
        if self.session_factory is None:
            if DatabaseManager._session_factory is None:
                raise RuntimeError("Database not initialized. Call init_db() first.")
            session_factory = DatabaseManager._session_factory
        else:
            session_factory = self.session_factory

        async with session_factory() as session:  # type: ignore[misc]
            return await self.reconcile(session)

    async def reconcile(self, session: AsyncSession, now: datetime | None = None) -> ReconciliationSummary:
        current_time = now or self.now_factory()
        summary = ReconciliationSummary()

        uncertain_cutoff = current_time - timedelta(minutes=_UNCERTAIN_RECHECK_MINUTES)
        uncertain_rows = await self._load_uncertain(session, uncertain_cutoff)
        for payout in uncertain_rows:
            summary.inspected_uncertain += 1
            result = await self._check_gateway(payout.gateway_ref)
            if result.status == "SUCCESS":
                payout.status = "SUCCESS"
                payout.reconciled = True
                payout.confirmed_at = current_time
                payout.updated_at = current_time
                payout.gateway = payout.gateway or self._gateway_name()
                await self._audit_transition(
                    session,
                    payout,
                    action="reconciled_success",
                    payload={
                        "from": "UNCERTAIN",
                        "to": "SUCCESS",
                        "gateway_ref": payout.gateway_ref,
                        "gateway_amount": result.amount,
                    },
                )
                summary.confirmed_success += 1
                continue

            if result.status == "FAILED":
                payout.status = "FAILED"
                payout.reconciled = True
                payout.updated_at = current_time
                await self._audit_transition(
                    session,
                    payout,
                    action="reconciled_failed",
                    payload={
                        "from": "UNCERTAIN",
                        "to": "FAILED",
                        "gateway_ref": payout.gateway_ref,
                        "gateway_amount": result.amount,
                    },
                )
                summary.confirmed_failed += 1
                continue

            age = current_time - self._coerce_dt(payout.initiated_at, current_time)
            if age >= timedelta(hours=_ESCALATION_HOURS):
                payout.reconciled = False
                payout.updated_at = current_time
                await self._audit_transition(
                    session,
                    payout,
                    action="reconciliation_escalated",
                    payload={
                        "from": "UNCERTAIN",
                        "to": "UNCERTAIN",
                        "gateway_ref": payout.gateway_ref,
                        "age_hours": round(age.total_seconds() / 3600.0, 2),
                        "manual_review_required": True,
                    },
                )
                await self._alert(
                    session,
                    event_name="payout.reconciliation.escalated",
                    payload={
                        "payout_id": payout.id,
                        "claim_id": payout.claim_id,
                        "worker_id": payout.worker_id,
                        "gateway_ref": payout.gateway_ref,
                        "age_hours": round(age.total_seconds() / 3600.0, 2),
                        "audience": "RISK_ADMIN",
                        "reason": "gateway still uncertain after 2 hours",
                    },
                )
                summary.escalated_for_manual_review += 1
                summary.unresolved_uncertain += 1
                continue

            summary.unresolved_uncertain += 1

        success_cutoff = current_time - timedelta(hours=_SUCCESS_REVIEW_HOURS)
        success_rows = await self._load_unreconciled_success(session, success_cutoff)
        for payout in success_rows:
            result = await self._check_gateway(payout.gateway_ref)
            if result.status != "SUCCESS":
                summary.mismatches += 1
                await self._audit_transition(
                    session,
                    payout,
                    action="reconciliation_mismatch",
                    payload={
                        "reason": "gateway_status_not_success",
                        "gateway_ref": payout.gateway_ref,
                        "gateway_status": result.status,
                        "gateway_amount": result.amount,
                        "expected_amount": payout.amount,
                    },
                )
                await self._alert(
                    session,
                    event_name="payout.reconciliation.mismatch",
                    payload={
                        "payout_id": payout.id,
                        "claim_id": payout.claim_id,
                        "worker_id": payout.worker_id,
                        "gateway_ref": payout.gateway_ref,
                        "expected_amount": payout.amount,
                        "gateway_amount": result.amount,
                        "gateway_status": result.status,
                        "audience": "RISK_ADMIN",
                    },
                )
                continue

            if result.amount is not None and round(float(result.amount), 2) != round(float(payout.amount), 2):
                summary.mismatches += 1
                await self._audit_transition(
                    session,
                    payout,
                    action="reconciliation_mismatch",
                    payload={
                        "reason": "amount_mismatch",
                        "gateway_ref": payout.gateway_ref,
                        "gateway_amount": result.amount,
                        "expected_amount": payout.amount,
                    },
                )
                await self._alert(
                    session,
                    event_name="payout.reconciliation.mismatch",
                    payload={
                        "payout_id": payout.id,
                        "claim_id": payout.claim_id,
                        "worker_id": payout.worker_id,
                        "gateway_ref": payout.gateway_ref,
                        "expected_amount": payout.amount,
                        "gateway_amount": result.amount,
                        "gateway_status": result.status,
                        "audience": "RISK_ADMIN",
                    },
                )
                continue

            payout.reconciled = True
            payout.updated_at = current_time
            await self._audit_transition(
                session,
                payout,
                action="reconciliation_verified",
                payload={
                    "from": "SUCCESS",
                    "to": "SUCCESS",
                    "gateway_ref": payout.gateway_ref,
                    "gateway_amount": result.amount,
                    "expected_amount": payout.amount,
                },
            )
            summary.verified_success += 1

        await session.commit()
        summary.status_counts = await self._status_counts(session)
        summary.total_amount = await self._total_amount(session)
        return summary

    async def generate_daily_report(self, session: AsyncSession, now: datetime | None = None) -> dict[str, Any]:
        current_time = now or self.now_factory()
        summary = await self._summarize_state(session, current_time)
        report = {
            "generated_at": current_time.isoformat(),
            "status_counts": summary.status_counts,
            "total_amount": round(summary.total_amount, 2),
            "mismatch_count": summary.mismatches,
            "uncertain_unresolved": summary.unresolved_uncertain,
            "confirmed_success": summary.confirmed_success,
            "confirmed_failed": summary.confirmed_failed,
            "escalated_for_manual_review": summary.escalated_for_manual_review,
            "verified_success": summary.verified_success,
        }

        await log_event(
            session,
            entity_type="ReconciliationReport",
            entity_id=current_time.strftime("%Y-%m-%d"),
            action="daily_summary",
            actor="reconciliation_job",
            payload=report,
        )
        await session.commit()

        if summary.mismatches > 0:
            await self._alert(
                session,
                event_name="payout.reconciliation.report_alert",
                payload={
                    "generated_at": current_time.isoformat(),
                    "mismatch_count": summary.mismatches,
                    "uncertain_unresolved": summary.unresolved_uncertain,
                    "audience": "RISK_ADMIN",
                },
            )

        return report

    def build_scheduler(self) -> AsyncIOScheduler:
        scheduler = AsyncIOScheduler(timezone="UTC")
        scheduler.add_job(self.run_due_reconciliation, trigger="interval", minutes=30, id="payout_reconciliation_30m", replace_existing=True)
        scheduler.add_job(self._daily_report_job, trigger=CronTrigger(hour=0, minute=30, timezone="UTC"), id="payout_reconciliation_daily_report", replace_existing=True)
        return scheduler

    async def _daily_report_job(self) -> dict[str, Any]:
        if DatabaseManager._session_factory is None:
            raise RuntimeError("Database not initialized. Call init_db() first.")
        async with DatabaseManager._session_factory() as session:
            return await self.generate_daily_report(session)

    async def _load_uncertain(self, session: AsyncSession, cutoff: datetime) -> list[PayoutTransaction]:
        result = await session.execute(
            select(PayoutTransaction).where(
                func.upper(PayoutTransaction.status) == "UNCERTAIN",
                PayoutTransaction.initiated_at <= cutoff,
            )
        )
        return list(result.scalars().all())

    async def _load_unreconciled_success(self, session: AsyncSession, cutoff: datetime) -> list[PayoutTransaction]:
        result = await session.execute(
            select(PayoutTransaction).where(
                func.upper(PayoutTransaction.status) == "SUCCESS",
                PayoutTransaction.reconciled.is_(False),
                PayoutTransaction.initiated_at <= cutoff,
            )
        )
        return list(result.scalars().all())

    async def _status_counts(self, session: AsyncSession) -> dict[str, int]:
        result = await session.execute(
            select(func.upper(PayoutTransaction.status), func.count()).group_by(func.upper(PayoutTransaction.status))
        )
        counts = {str(status): int(count) for status, count in result.all()}
        return dict(sorted(counts.items()))

    async def _summarize_state(self, session: AsyncSession, now: datetime) -> ReconciliationSummary:
        summary = ReconciliationSummary()
        summary.status_counts = await self._status_counts(session)
        summary.total_amount = await self._total_amount(session)

        day_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        mismatch_rows = await session.execute(
            select(func.count()).select_from(AuditLog).where(
                AuditLog.entity_type == "PayoutTransaction",
                AuditLog.action == "reconciliation_mismatch",
                AuditLog.created_at >= day_start,
            )
        )
        summary.mismatches = int(mismatch_rows.scalar_one() or 0)

        unresolved_rows = await session.execute(
            select(func.count()).select_from(PayoutTransaction).where(
                func.upper(PayoutTransaction.status) == "UNCERTAIN",
                PayoutTransaction.reconciled.is_(False),
                PayoutTransaction.initiated_at <= now - timedelta(hours=_ESCALATION_HOURS),
            )
        )
        summary.unresolved_uncertain = int(unresolved_rows.scalar_one() or 0)
        return summary

    async def _total_amount(self, session: AsyncSession) -> float:
        result = await session.execute(select(func.coalesce(func.sum(PayoutTransaction.amount), 0.0)))
        return float(result.scalar_one() or 0.0)

    async def _check_gateway(self, gateway_reference: str | None) -> PayoutResult:
        if not gateway_reference:
            return PayoutResult(status="UNCERTAIN", error_message="Missing gateway reference.")
        return await self.gateway.check_status(gateway_reference)

    async def _alert(self, session: AsyncSession, *, event_name: str, payload: dict[str, Any]) -> None:
        await self._audit_alert(session, event_name=event_name, payload=payload)
        if self.alert_publisher is not None:
            await self.alert_publisher.emit(event_name, payload)
            return

        client: aioredis.Redis | None = None
        try:
            client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await client.publish(
                _ALERT_CHANNEL,
                json.dumps({"name": event_name, "data": payload, "timestamp": datetime.utcnow().isoformat()}),
            )
            await client.lpush(
                _QUEUE_CHANNEL,
                json.dumps({"name": event_name, "data": payload, "timestamp": datetime.utcnow().isoformat()}),
            )
        finally:
            if client is not None:
                await client.aclose()

    async def _audit_transition(self, session: AsyncSession, payout: PayoutTransaction, *, action: str, payload: dict[str, Any]) -> None:
        await log_event(
            session,
            entity_type="PayoutTransaction",
            entity_id=payout.id,
            action=action,
            actor="reconciliation_job",
            payload=payload,
        )

    async def _audit_alert(self, session: AsyncSession, *, event_name: str, payload: dict[str, Any]) -> None:
        await log_event(
            session,
            entity_type="ReconciliationAlert",
            entity_id=str(payload.get("payout_id") or payload.get("generated_at") or event_name),
            action=event_name,
            actor="reconciliation_job",
            payload=payload,
        )

    def _gateway_name(self) -> str:
        return self.gateway.__class__.__name__

    def _coerce_dt(self, value: Any, fallback: datetime) -> datetime:
        return value if isinstance(value, datetime) else fallback


def build_reconciliation_scheduler() -> AsyncIOScheduler:
    job = PayoutReconciliationJob(alert_publisher=None)
    return job.build_scheduler()

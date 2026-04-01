"""Payout processing service for claim.approved events."""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import redis.asyncio as aioredis
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from adapters.payout_gateway import PayoutGateway, PayoutGatewayFactory, PayoutResult
from models import Claim, PayoutTransaction, Policy, TriggerEvent, Worker
from services.audit import log_event
from services.payout_service import compute_payout_amount

logger = logging.getLogger(__name__)

_STALE_PENDING_MINUTES = 10


class PayoutProcessorError(RuntimeError):
    pass


@dataclass(slots=True)
class PayoutEventPublisher:
    redis: aioredis.Redis

    async def emit(self, event_name: str, payload: dict[str, Any]) -> None:
        envelope = {
            "name": event_name,
            "data": payload,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        body = json.dumps(envelope)
        await self.redis.publish("payout_events", body)
        await self.redis.lpush("bull:payout-events:wait", body)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _handle_for_worker(worker: Worker, claim: Claim) -> str:
    trace = claim.decision_trace or {}
    if isinstance(trace, dict):
        handle = trace.get("beneficiary_handle") or trace.get("payout_handle")
        if handle:
            return str(handle)
    return worker.phone


def _normalize_status(value: str | None) -> str:
    return (value or "").strip().upper()


class PayoutProcessor:
    def __init__(self, gateway: PayoutGateway | None = None) -> None:
        self.gateway = gateway or PayoutGatewayFactory.create()

    async def process_claim_approved(
        self,
        claim_id: str,
        session: AsyncSession,
        *,
        publisher: PayoutEventPublisher | None = None,
        gateway: PayoutGateway | None = None,
    ) -> PayoutTransaction:
        active_gateway = gateway or self.gateway
        now = _utcnow()

        claim_q = await session.execute(select(Claim).where(Claim.id == claim_id))
        claim = claim_q.scalar_one_or_none()
        if claim is None:
            raise PayoutProcessorError(f"Claim '{claim_id}' not found.")
        if _normalize_status(claim.status) != "APPROVED":
            raise PayoutProcessorError(f"Claim '{claim_id}' must be APPROVED before payout processing.")

        worker_q = await session.execute(select(Worker).where(Worker.id == claim.worker_id))
        worker = worker_q.scalar_one_or_none()
        if worker is None:
            raise PayoutProcessorError(f"Worker '{claim.worker_id}' not found.")

        policy_q = await session.execute(select(Policy).where(Policy.id == claim.policy_id))
        policy = policy_q.scalar_one_or_none()
        if policy is None:
            raise PayoutProcessorError(f"Policy '{claim.policy_id}' not found.")

        trigger_q = await session.execute(select(TriggerEvent).where(TriggerEvent.id == claim.trigger_event_id))
        trigger = trigger_q.scalar_one_or_none()
        if trigger is None:
            raise PayoutProcessorError(f"TriggerEvent '{claim.trigger_event_id}' not found.")

        handle = _handle_for_worker(worker, claim)
        idempotency_key = hashlib.sha256(f"{claim_id}:{worker.id}:{handle}".encode("utf-8")).hexdigest()

        payout_q = await session.execute(select(PayoutTransaction).where(PayoutTransaction.idempotency_key == idempotency_key))
        payout = payout_q.scalar_one_or_none()

        if payout is not None:
            current_status = _normalize_status(payout.status)
            if current_status == "SUCCESS":
                logger.info("[payout] duplicate success detected for claim=%s payout=%s", claim_id, payout.id)
                return payout
            if current_status == "PENDING":
                age = now - (payout.initiated_at or now)
                if age <= timedelta(minutes=_STALE_PENDING_MINUTES):
                    return payout
                await self._transition_status(
                    session,
                    payout,
                    "UNCERTAIN",
                    now,
                    actor="payout_processor",
                    metadata={"reason": "stale_pending", "age_minutes": round(age.total_seconds() / 60, 2)},
                )
                await session.commit()

        if payout is None:
            calc = compute_payout_amount(worker, policy, trigger.type, await self._weekly_paid_amount(session, worker.id))
            payout = PayoutTransaction(
                idempotency_key=idempotency_key,
                claim_id=claim.id,
                worker_id=worker.id,
                amount=calc["payout_amount"],
                gateway="pending",
                gateway_ref=None,
                status="PENDING",
                initiated_at=now,
                confirmed_at=None,
                created_at=now,
                updated_at=now,
                beneficiary_handle=handle,
            )
            session.add(payout)
            try:
                await session.flush()
            except IntegrityError:
                await session.rollback()
                payout_q = await session.execute(select(PayoutTransaction).where(PayoutTransaction.idempotency_key == idempotency_key))
                payout = payout_q.scalar_one_or_none()
                if payout is None:
                    raise
                if _normalize_status(payout.status) == "SUCCESS":
                    return payout

            await self._audit_status_change(session, payout, None, "PENDING", actor="payout_processor", metadata={"idempotency_key": idempotency_key})
            await session.commit()
        else:
            previous_status = _normalize_status(payout.status)
            if previous_status != "PENDING":
                await self._transition_status(
                    session,
                    payout,
                    "PENDING",
                    now,
                    actor="payout_processor",
                    metadata={"idempotency_key": idempotency_key, "resume": True},
                )
                await session.commit()

        gateway_result = await self._call_gateway(active_gateway, payout.amount, handle, idempotency_key)
        if gateway_result.status == "SUCCESS":
            await self._transition_status(
                session,
                payout,
                "SUCCESS",
                _utcnow(),
                actor="payout_gateway",
                metadata={
                    "gateway_ref": gateway_result.gateway_ref,
                    "idempotency_key": idempotency_key,
                },
            )
            payout.gateway = self._gateway_name(active_gateway)
            payout.gateway_ref = gateway_result.gateway_ref
            payout.confirmed_at = _utcnow()
            payout.updated_at = _utcnow()
            await session.commit()
            if publisher is not None:
                await publisher.emit(
                    "payout.completed",
                    {
                        "payout_id": payout.id,
                        "claim_id": claim.id,
                        "worker_id": worker.id,
                        "amount": payout.amount,
                        "gateway_ref": payout.gateway_ref,
                        "idempotency_key": idempotency_key,
                    },
                )
            return payout

        if gateway_result.status == "FAILED":
            await self._transition_status(
                session,
                payout,
                "FAILED",
                _utcnow(),
                actor="payout_gateway",
                metadata={
                    "gateway_ref": gateway_result.gateway_ref,
                    "error_message": gateway_result.error_message,
                    "idempotency_key": idempotency_key,
                },
            )
            payout.gateway = self._gateway_name(active_gateway)
            payout.gateway_ref = gateway_result.gateway_ref
            payout.updated_at = _utcnow()
            await session.commit()
            if publisher is not None:
                await publisher.emit(
                    "payout.failed",
                    {
                        "payout_id": payout.id,
                        "claim_id": claim.id,
                        "worker_id": worker.id,
                        "amount": payout.amount,
                        "gateway_ref": payout.gateway_ref,
                        "idempotency_key": idempotency_key,
                        "error_message": gateway_result.error_message,
                    },
                )
            return payout

        await self._transition_status(
            session,
            payout,
            "UNCERTAIN",
            _utcnow(),
            actor="payout_gateway",
            metadata={
                "gateway_ref": gateway_result.gateway_ref,
                "error_message": gateway_result.error_message,
                "idempotency_key": idempotency_key,
            },
        )
        payout.gateway = self._gateway_name(active_gateway)
        payout.gateway_ref = gateway_result.gateway_ref
        payout.updated_at = _utcnow()
        await session.commit()
        if publisher is not None:
            await publisher.emit(
                "payout.uncertain",
                {
                    "payout_id": payout.id,
                    "claim_id": claim.id,
                    "worker_id": worker.id,
                    "amount": payout.amount,
                    "gateway_ref": payout.gateway_ref,
                    "idempotency_key": idempotency_key,
                    "error_message": gateway_result.error_message,
                },
            )
        return payout

    async def process_claim_approved_event(
        self,
        event: dict[str, Any],
        session: AsyncSession,
        *,
        publisher: PayoutEventPublisher | None = None,
        gateway: PayoutGateway | None = None,
    ) -> PayoutTransaction:
        claim_id = str(event.get("claim_id") or "")
        if not claim_id:
            raise PayoutProcessorError("claim_id missing from claim.approved event payload.")
        return await self.process_claim_approved(claim_id, session, publisher=publisher, gateway=gateway)

    async def _weekly_paid_amount(self, session: AsyncSession, worker_id: str) -> float:
        week_start = _utcnow() - timedelta(days=7)
        result = await session.execute(
            select(func.coalesce(func.sum(PayoutTransaction.amount), 0.0)).where(
                PayoutTransaction.worker_id == worker_id,
                PayoutTransaction.initiated_at >= week_start,
                PayoutTransaction.status.in_(["SUCCESS", "CONFIRMED", "confirmed", "success"]),
            )
        )
        return float(result.scalar_one() or 0.0)

    async def _call_gateway(self, gateway: PayoutGateway, amount: float, handle: str, idempotency_key: str) -> PayoutResult:
        try:
            return await gateway.initiate(amount, handle, idempotency_key)
        except TimeoutError as exc:
            return PayoutResult(status="UNCERTAIN", error_message=str(exc))
        except Exception as exc:  # pragma: no cover - defensive
            return PayoutResult(status="UNCERTAIN", error_message=str(exc))

    def _gateway_name(self, gateway: PayoutGateway) -> str:
        return gateway.__class__.__name__

    async def _audit_status_change(
        self,
        session: AsyncSession,
        payout: PayoutTransaction,
        previous_status: str | None,
        new_status: str,
        *,
        actor: str,
        metadata: dict[str, Any],
    ) -> None:
        await log_event(
            session,
            entity_type="PayoutTransaction",
            entity_id=payout.id,
            action="status_transition",
            actor=actor,
            payload={
                "previous_status": previous_status,
                "new_status": new_status,
                **metadata,
            },
        )

    async def _transition_status(
        self,
        session: AsyncSession,
        payout: PayoutTransaction,
        new_status: str,
        when: datetime,
        *,
        actor: str,
        metadata: dict[str, Any],
    ) -> None:
        previous_status = _normalize_status(payout.status)
        payout.status = new_status
        payout.updated_at = when
        await self._audit_status_change(session, payout, previous_status, new_status, actor=actor, metadata=metadata)

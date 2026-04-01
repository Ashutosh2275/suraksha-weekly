"""Manual review queue endpoints for admin reviewers."""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Annotated, Any, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.auth_dependencies import CurrentUser, get_current_user, require_role
from core.database import get_db
from core.redis import get_redis
from core.roles import Role
from models import AuditLog, Claim, FraudAssessment, Policy, TriggerEvent, Worker
from services.audit import log_event
from services.claim_state_machine import ClaimStateMachine, ClaimStateMachineError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/review-queue")


CRITICAL_REASON_CODES = {
    "identity_mismatch",
    "impossible_travel",
    "duplicate_payout_destination",
}

_REVIEWER_ROLES = (Role.REVIEWER, Role.RISK_ADMIN)
_RISK_ADMIN_ONLY_ROLES = (Role.RISK_ADMIN,)


class WorkerSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    phone: str
    city: str
    service_zones: list[str] = Field(default_factory=list)
    trust_score: float
    trust_tier: str


class ClaimSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    status: str
    trigger_type: str | None = None
    zone: str | None = None
    plan_variant: str | None = None
    payout_amount: float = 0.0
    initiated_at: datetime


class ReviewQueueItem(BaseModel):
    claim: ClaimSummary
    fraud_score: float
    risk_tier: str
    reason_tags: list[str]
    sla_deadline: datetime
    worker: WorkerSummary


class ReviewQueueListResponse(BaseModel):
    total: int
    page: int
    limit: int
    items: list[ReviewQueueItem]


class ReviewDecisionRequest(BaseModel):
    decision: str = Field(..., pattern="^(APPROVE|REJECT)$")
    reviewer_notes: str = Field(..., min_length=20, max_length=4000)


class AuditLogEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    entity_type: str
    entity_id: str
    action: str
    actor: str
    actor_id: str | None = None
    payload: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime


class FraudAssessmentDetail(BaseModel):
    id: str
    claim_id: str
    score: float
    decision: str
    reason_codes: list[str]
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class PolicyDetail(BaseModel):
    id: str
    worker_id: str
    plan_variant: str
    status: str
    weekly_premium: float
    coverage_cap: float
    start_date: datetime
    end_date: datetime
    renewal_count: int
    waiting_period_until: datetime | None = None
    created_at: datetime
    updated_at: datetime


class TriggerEventDetail(BaseModel):
    id: str
    type: str
    zone: str
    value: float
    threshold: float
    confidence_score: float
    sources: list[str]
    status: str
    triggered_at: datetime
    audit_snapshot: dict[str, Any]
    created_at: datetime


class ReviewQueueDetail(BaseModel):
    claim: ClaimSummary
    worker: WorkerSummary
    policy: PolicyDetail
    trigger_event: TriggerEventDetail
    fraud_assessment: FraudAssessmentDetail | None = None
    decision_trace: dict[str, Any] = Field(default_factory=dict)
    audit_logs: list[AuditLogEntry] = Field(default_factory=list)
    sla_deadline: datetime


class ReviewMetricsResponse(BaseModel):
    queue_depth: int
    avg_wait_time_minutes: float
    sla_breach_count_today: int
    decisions_per_reviewer: dict[str, int]


@dataclass
class _ClaimStateProxy:
    id: str
    status: str
    updated_at: datetime | None = None


def _normalize_risk_tier(score: float, reason_codes: list[str] | None = None) -> str:
    normalized_reasons = {str(code).strip().lower() for code in (reason_codes or [])}
    if normalized_reasons.intersection(CRITICAL_REASON_CODES):
        return "CRITICAL"
    if score >= 85:
        return "CRITICAL"
    if score >= 65:
        return "HIGH"
    if score >= 30:
        return "MEDIUM"
    return "LOW"


def _sla_deadline(initiated_at: datetime, risk_tier: str) -> datetime:
    tier = risk_tier.upper()
    if tier in {"HIGH", "CRITICAL"}:
        return initiated_at + timedelta(minutes=30)
    return initiated_at + timedelta(hours=4)


def _is_critical_item(risk_tier: str, reason_tags: list[str]) -> bool:
    normalized = {tag.strip().lower() for tag in reason_tags}
    return risk_tier.upper() == "CRITICAL" or bool(normalized.intersection(CRITICAL_REASON_CODES))


def _build_worker_summary(worker: Worker) -> WorkerSummary:
    return WorkerSummary(
        id=worker.id,
        name=worker.name,
        phone=worker.phone,
        city=worker.city,
        service_zones=list(worker.service_zones or []),
        trust_score=float(worker.trust_score or 0.0),
        trust_tier=worker.trust_tier,
    )


def _build_claim_summary(claim: Claim, trigger: TriggerEvent | None, policy: Policy | None) -> ClaimSummary:
    return ClaimSummary(
        id=claim.id,
        status=claim.status,
        trigger_type=trigger.type if trigger is not None else None,
        zone=trigger.zone if trigger is not None else None,
        plan_variant=policy.plan_variant if policy is not None else None,
        payout_amount=float(claim.payout_amount or 0.0),
        initiated_at=claim.initiated_at,
    )


def _build_queue_item(claim: Claim) -> ReviewQueueItem:
    assessment = claim.fraud_assessment
    worker = claim.worker
    policy = claim.policy
    trigger = claim.trigger_event

    fraud_score = float((assessment.score if assessment is not None else claim.fraud_score) or 0.0)
    reason_tags = list((assessment.reason_codes if assessment is not None else claim.fraud_reason_tags) or [])
    risk_tier = _normalize_risk_tier(fraud_score, reason_tags)
    sla_deadline = _sla_deadline(claim.initiated_at, risk_tier)

    return ReviewQueueItem(
        claim=_build_claim_summary(claim, trigger, policy),
        fraud_score=fraud_score,
        risk_tier=risk_tier,
        reason_tags=reason_tags,
        sla_deadline=sla_deadline,
        worker=_build_worker_summary(worker),
    )


def _queue_sort_key(item: ReviewQueueItem) -> tuple[int, datetime, str]:
    critical_rank = 0 if _is_critical_item(item.risk_tier, item.reason_tags) else 1
    return (critical_rank, item.sla_deadline, item.claim.id)


def _sort_and_page(items: list[ReviewQueueItem], page: int, limit: int) -> tuple[list[ReviewQueueItem], int]:
    sorted_items = sorted(items, key=_queue_sort_key)
    total = len(sorted_items)
    offset = (page - 1) * limit
    return sorted_items[offset : offset + limit], total


async def _load_review_queue_items(session: AsyncSession) -> list[ReviewQueueItem]:
    result = await session.execute(
        select(Claim)
        .options(
            selectinload(Claim.worker),
            selectinload(Claim.policy),
            selectinload(Claim.trigger_event),
            selectinload(Claim.fraud_assessment),
        )
        .where(Claim.status == "in_review")
    )
    claims = list(result.scalars().all())
    return [_build_queue_item(claim) for claim in claims]


async def _load_claim_detail(session: AsyncSession, claim_id: str) -> ReviewQueueDetail:
    result = await session.execute(
        select(Claim)
        .options(
            selectinload(Claim.worker),
            selectinload(Claim.policy),
            selectinload(Claim.trigger_event),
            selectinload(Claim.fraud_assessment),
        )
        .where(Claim.id == claim_id)
    )
    claim = result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    audit_rows = await session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "Claim", AuditLog.entity_id == claim_id)
        .order_by(AuditLog.timestamp.desc())
    )
    audits = list(audit_rows.scalars().all())

    assessment = claim.fraud_assessment
    fraud_detail = None
    risk_tier = _normalize_risk_tier(float((assessment.score if assessment is not None else claim.fraud_score) or 0.0), list((assessment.reason_codes if assessment is not None else claim.fraud_reason_tags) or []))
    sla_deadline = _sla_deadline(claim.initiated_at, risk_tier)

    if assessment is not None:
        fraud_detail = FraudAssessmentDetail(
            id=assessment.id,
            claim_id=assessment.claim_id,
            score=float(assessment.score),
            decision=assessment.decision,
            reason_codes=list(assessment.reason_codes or []),
            reviewed_by=assessment.reviewed_by,
            reviewed_at=assessment.reviewed_at,
            created_at=assessment.created_at,
            updated_at=assessment.updated_at,
        )

    return ReviewQueueDetail(
        claim=_build_claim_summary(claim, claim.trigger_event, claim.policy),
        worker=_build_worker_summary(claim.worker),
        policy=PolicyDetail(
            id=claim.policy.id,
            worker_id=claim.policy.worker_id,
            plan_variant=claim.policy.plan_variant,
            status=claim.policy.status,
            weekly_premium=float(claim.policy.weekly_premium),
            coverage_cap=float(claim.policy.coverage_cap),
            start_date=claim.policy.start_date,
            end_date=claim.policy.end_date,
            renewal_count=claim.policy.renewal_count,
            waiting_period_until=claim.policy.waiting_period_until,
            created_at=claim.policy.created_at,
            updated_at=claim.policy.updated_at,
        ),
        trigger_event=TriggerEventDetail(
            id=claim.trigger_event.id,
            type=claim.trigger_event.type,
            zone=claim.trigger_event.zone,
            value=float(claim.trigger_event.value),
            threshold=float(claim.trigger_event.threshold),
            confidence_score=float(claim.trigger_event.confidence_score),
            sources=list(claim.trigger_event.sources or []),
            status=claim.trigger_event.status,
            triggered_at=claim.trigger_event.triggered_at,
            audit_snapshot=dict(claim.trigger_event.audit_snapshot or {}),
            created_at=claim.trigger_event.created_at,
        ),
        fraud_assessment=fraud_detail,
        decision_trace=dict(claim.decision_trace or {}),
        audit_logs=[
            AuditLogEntry(
                id=row.id,
                entity_type=row.entity_type,
                entity_id=row.entity_id,
                action=row.action,
                actor=row.actor,
                actor_id=row.actor_id,
                payload=dict(row.payload or {}),
                timestamp=row.timestamp,
            )
            for row in audits
        ],
        sla_deadline=sla_deadline,
    )


def _auth_role_for_tier(risk_tier: str) -> Role:
    return Role.RISK_ADMIN if risk_tier.upper() in {"HIGH", "CRITICAL"} else Role.REVIEWER


def _ensure_decision_authorized(current_user: CurrentUser, risk_tier: str) -> None:
    required = _auth_role_for_tier(risk_tier)
    if required == Role.RISK_ADMIN and current_user.role != Role.RISK_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="RISK_ADMIN role required for HIGH or CRITICAL review items.",
        )
    if required == Role.REVIEWER and current_user.role not in {Role.REVIEWER, Role.RISK_ADMIN}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="REVIEWER role required for this review item.",
        )


async def _publish_claim_event(redis: aioredis.Redis, event_name: str, payload: dict[str, Any]) -> None:
    await redis.publish(
        "claim_events",
        json.dumps(
            {
                "name": event_name,
                "data": payload,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        ),
    )


async def _process_review_decision(
    *,
    session: AsyncSession,
    redis: aioredis.Redis,
    claim: Claim,
    current_user: CurrentUser,
    decision: str,
    reviewer_notes: str,
    now: datetime,
) -> ReviewQueueDetail:
    if claim.status != "in_review":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Claim is '{claim.status}' and cannot be decided from the review queue.",
        )

    assessment = claim.fraud_assessment
    if assessment is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Fraud assessment is missing for this claim.",
        )

    risk_tier = _normalize_risk_tier(float(assessment.score or 0.0), list(assessment.reason_codes or []))
    _ensure_decision_authorized(current_user, risk_tier)

    sla_deadline = _sla_deadline(claim.initiated_at, risk_tier)
    sla_breached = now > sla_deadline

    state_proxy = _ClaimStateProxy(id=claim.id, status=claim.status.upper(), updated_at=claim.updated_at)
    state_machine = ClaimStateMachine()

    decision_upper = decision.upper()
    next_state = "APPROVED" if decision_upper == "APPROVE" else "REJECTED"

    try:
        await state_machine.transition(
            state_proxy,
            next_state,
            actor_role=current_user.role.value,
            actor_id=current_user.user_id,
            metadata={
                "source": "review_queue",
                "reviewer_notes": reviewer_notes,
                "risk_tier": risk_tier,
                "sla_deadline": sla_deadline.isoformat(),
                "sla_breached": sla_breached,
            },
        )
    except ClaimStateMachineError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    claim.status = state_proxy.status.lower()
    claim.updated_at = now
    if decision_upper == "REJECT":
        claim.resolved_at = now
        claim.rejection_reason = reviewer_notes

    trace = dict(claim.decision_trace or {})
    trace.update(
        {
            "review_queue_decision": decision_upper,
            "reviewer_id": current_user.user_id,
            "reviewer_role": current_user.role.value,
            "reviewer_notes": reviewer_notes,
            "risk_tier": risk_tier,
            "sla_deadline": sla_deadline.isoformat(),
            "sla_breached": sla_breached,
            "reviewed_at": now.isoformat(),
        }
    )
    if decision_upper == "REJECT":
        trace["rejection_reason"] = reviewer_notes
    claim.decision_trace = trace

    assessment.reviewed_by = current_user.user_id
    assessment.reviewed_at = now

    action_name = "review_queue_approved" if decision_upper == "APPROVE" else "review_queue_rejected"
    await log_event(
        session,
        entity_type="Claim",
        entity_id=claim.id,
        action=action_name,
        actor=current_user.role.value,
        actor_id=current_user.user_id,
        payload={
            "decision": decision_upper,
            "reviewer_id": current_user.user_id,
            "reviewer_role": current_user.role.value,
            "reviewer_notes": reviewer_notes,
            "risk_tier": risk_tier,
            "sla_deadline": sla_deadline.isoformat(),
            "sla_breached": sla_breached,
        },
    )

    await session.commit()

    if decision_upper == "APPROVE":
        await _publish_claim_event(
            redis,
            "claim.approved",
            {
                "claim_id": claim.id,
                "policy_id": claim.policy_id,
                "worker_id": claim.worker_id,
                "fraud_score": float(assessment.score or 0.0),
                "risk_tier": risk_tier,
                "reviewer_id": current_user.user_id,
                "reviewer_notes": reviewer_notes,
                "sla_breached": sla_breached,
            },
        )

    await session.refresh(claim)
    await session.refresh(assessment)
    return await _load_claim_detail(session, claim.id)


@router.get(
    "",
    response_model=ReviewQueueListResponse,
    summary="List manual review queue",
    dependencies=[Depends(require_role(Role.REVIEWER, Role.RISK_ADMIN))],
)
async def list_review_queue(
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> ReviewQueueListResponse:
    items = await _load_review_queue_items(session)
    page_items, total = _sort_and_page(items, page, limit)
    return ReviewQueueListResponse(total=total, page=page, limit=limit, items=page_items)


@router.get(
    "/metrics",
    response_model=ReviewMetricsResponse,
    summary="Review queue metrics",
    dependencies=[Depends(require_role(Role.RISK_ADMIN))],
)
async def review_queue_metrics(session: AsyncSession = Depends(get_db)) -> ReviewMetricsResponse:
    now = datetime.now(timezone.utc)
    queue_items = await _load_review_queue_items(session)
    queue_depth = len(queue_items)
    avg_wait_time_minutes = 0.0
    if queue_items:
        avg_wait_time_minutes = round(
            sum((now - item.claim.initiated_at).total_seconds() / 60 for item in queue_items) / len(queue_items),
            2,
        )

    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    reviewed_today = await session.execute(
        select(Claim)
        .join(FraudAssessment)
        .options(
            selectinload(Claim.fraud_assessment),
            selectinload(Claim.worker),
            selectinload(Claim.policy),
            selectinload(Claim.trigger_event),
        )
        .where(FraudAssessment.reviewed_at >= start_of_day)
    )
    reviewed_claims = list(reviewed_today.scalars().all())

    sla_breach_count_today = 0
    decisions_per_reviewer: dict[str, int] = {}
    for claim in reviewed_claims:
        assessment = claim.fraud_assessment
        if assessment is None or assessment.reviewed_at is None:
            continue
        risk_tier = _normalize_risk_tier(float(assessment.score or 0.0), list(assessment.reason_codes or []))
        if assessment.reviewed_at > _sla_deadline(claim.initiated_at, risk_tier):
            sla_breach_count_today += 1
        reviewer = assessment.reviewed_by
        if reviewer:
            decisions_per_reviewer[reviewer] = decisions_per_reviewer.get(reviewer, 0) + 1

    return ReviewMetricsResponse(
        queue_depth=queue_depth,
        avg_wait_time_minutes=avg_wait_time_minutes,
        sla_breach_count_today=sla_breach_count_today,
        decisions_per_reviewer=dict(sorted(decisions_per_reviewer.items())),
    )


@router.get(
    "/{claim_id}",
    response_model=ReviewQueueDetail,
    summary="Get full review queue item",
    dependencies=[Depends(require_role(Role.REVIEWER, Role.RISK_ADMIN))],
)
async def get_review_queue_item(
    claim_id: str,
    session: AsyncSession = Depends(get_db),
) -> ReviewQueueDetail:
    return await _load_claim_detail(session, claim_id)


@router.post(
    "/{claim_id}/decide",
    response_model=ReviewQueueDetail,
    summary="Resolve a review queue item",
    dependencies=[Depends(require_role(Role.REVIEWER, Role.RISK_ADMIN))],
)
async def decide_review_queue_item(
    claim_id: str,
    body: ReviewDecisionRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> ReviewQueueDetail:
    claim_result = await session.execute(
        select(Claim)
        .options(selectinload(Claim.fraud_assessment))
        .where(Claim.id == claim_id)
    )
    claim = claim_result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found.")

    return await _process_review_decision(
        session=session,
        redis=redis,
        claim=claim,
        current_user=current_user,
        decision=body.decision,
        reviewer_notes=body.reviewer_notes,
        now=datetime.now(timezone.utc),
    )

"""
Claims Router — Suraksha Weekly (FR-5 / PRD §5)

Worker endpoints (JWT required):
    GET  /claims              — paginated list of the caller's own claims
    GET  /claims/{id}         — claim detail with fraud tags, payout, timeline
    POST /claims/{id}/appeal  — submit an appeal for a rejected claim

Admin endpoints (X-Admin-Token required):
    GET   /admin/claims                — all claims, filterable
    PATCH /admin/claims/{id}/review    — approve or reject a held/flagged claim
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Annotated, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from jose import JWTError
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.rate_limiter import rate_limit
from core.redis import get_redis
from core.security import JWTHandler
from core.auth_dependencies import require_role, require_reviewer, CurrentUser
from core.roles import Role
from models import AuditLog, Claim, Policy, PayoutTransaction, TriggerEvent, Worker
from services.audit import log_event
from services.fraud_scoring_service import score_claim
from services.payout_service import initiate_payout
from services.trust_service import recompute_trust_score

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Auth dependencies ─────────────────────────────────────────────────────────

async def get_current_worker_id(
    authorization: Annotated[Optional[str], Header()] = None,
) -> str:
    """
    Extract and validate the worker_id from the Bearer JWT.

    Raises HTTP 401 if the header is missing or the token is invalid.
    The JWT payload is expected to contain 'sub' or 'worker_id'.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:]
    try:
        payload   = JWTHandler.verify_token(token)
        worker_id = payload.get("sub") or payload.get("worker_id")
        if not worker_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload.",
            )
        return str(worker_id)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _require_admin(
    x_admin_token: Annotated[Optional[str], Header()] = None,
) -> None:
    """Verify the X-Admin-Token header (same guard used by triggers router)."""
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-Admin-Token header required.",
        )


# ── Pydantic response schemas ─────────────────────────────────────────────────

class TimelineEvent(BaseModel):
    """One entry in a claim's audit timeline."""
    timestamp: str
    action:    str
    actor:     str
    detail:    Optional[str] = None


class PayoutDetail(BaseModel):
    payout_id:    str
    amount:       float
    gateway:      str
    gateway_ref:  Optional[str]
    status:       str
    initiated_at: str


class ClaimSummary(BaseModel):
    """Lightweight claim row for list views."""
    id:                str
    status:            str
    trigger_type:      Optional[str]
    zone:              Optional[str]
    plan_variant:      Optional[str]
    payout_amount:     float
    fraud_score:       float
    fraud_reason_tags: list[str]
    initiated_at:      str


class ClaimDetail(ClaimSummary):
    """Full claim detail including timeline and payout info."""
    policy_id:         str
    trigger_event_id:  str
    trigger_value:     Optional[float]
    trigger_threshold: Optional[float]
    confidence_score:  Optional[float]
    payout:            Optional[PayoutDetail]
    timeline:          list[TimelineEvent]


class ClaimListResponse(BaseModel):
    total:  int
    page:   int
    limit:  int
    claims: list[ClaimSummary]


class AppealRequest(BaseModel):
    reason: str = Field(
        ..., min_length=10, max_length=2000,
        description="Worker's written justification for the appeal.",
    )


class AppealResponse(BaseModel):
    claim_id: str
    status:   str
    message:  str


class ApplyClaimRequest(BaseModel):
    trigger_event_id: Optional[str] = Field(
        default=None,
        description="Optional active trigger ID. If omitted, the latest eligible active trigger is used.",
    )


class ApplyClaimResponse(BaseModel):
    claim: ClaimSummary
    message: str


class AdminReviewRequest(BaseModel):
    decision: str = Field(
        ..., pattern="^(approve|reject)$",
        description="'approve' or 'reject'.",
    )
    notes: Optional[str] = Field(None, max_length=1000)


class AdminReviewResponse(BaseModel):
    claim_id: str
    status:   str
    message:  str


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _get_claim_or_404(session: AsyncSession, claim_id: str) -> Claim:
    result = await session.execute(select(Claim).where(Claim.id == claim_id))
    claim  = result.scalar_one_or_none()
    if claim is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Claim '{claim_id}' not found.",
        )
    return claim


async def _enrich_summary(claim: Claim, session: AsyncSession) -> ClaimSummary:
    """Enrich a Claim row with trigger/policy metadata for list views."""
    trigger_type = zone = plan_variant = None

    if claim.trigger_event_id:
        t_q = await session.execute(
            select(TriggerEvent).where(TriggerEvent.id == claim.trigger_event_id)
        )
        trig = t_q.scalar_one_or_none()
        if trig:
            trigger_type = trig.type
            zone         = trig.zone

    if claim.policy_id:
        p_q = await session.execute(select(Policy).where(Policy.id == claim.policy_id))
        pol = p_q.scalar_one_or_none()
        if pol:
            plan_variant = pol.plan_variant

    return ClaimSummary(
        id                = claim.id,
        status            = claim.status,
        trigger_type      = trigger_type,
        zone              = zone,
        plan_variant      = plan_variant,
        payout_amount     = claim.payout_amount or 0.0,
        fraud_score       = claim.fraud_score or 0.0,
        fraud_reason_tags = claim.fraud_reason_tags or [],
        initiated_at      = claim.initiated_at.isoformat(),
    )


_PLAN_TRIGGER_COVERAGE: dict[str, frozenset[str]] = {
    "basic": frozenset({"HeavyRain", "SeverePollution"}),
    "standard": frozenset({"HeavyRain", "SeverePollution", "ExtremeHeat", "LocalRestriction"}),
    "pro": frozenset({"HeavyRain", "SeverePollution", "ExtremeHeat", "LocalRestriction", "PlatformOutage"}),
}


async def _resolve_worker_active_policy(session: AsyncSession, worker_id: str) -> tuple[Worker, Policy]:
    now = datetime.utcnow()

    worker_q = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = worker_q.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker profile not found.")

    policy_q = await session.execute(
        select(Policy)
        .where(
            Policy.worker_id == worker_id,
            Policy.status == "active",
            Policy.start_date <= now,
            Policy.end_date >= now,
        )
        .order_by(desc(Policy.start_date))
        .limit(1)
    )
    policy = policy_q.scalar_one_or_none()
    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active policy found. Purchase or renew a policy before applying for claims.",
        )

    return worker, policy


async def _resolve_target_trigger(
    session: AsyncSession,
    worker: Worker,
    policy: Policy,
    requested_trigger_id: Optional[str],
) -> TriggerEvent:
    eligible_types = _PLAN_TRIGGER_COVERAGE.get(policy.plan_variant, frozenset())
    if not eligible_types:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Plan variant '{policy.plan_variant}' does not have trigger coverage configured.",
        )

    if requested_trigger_id:
        trigger_q = await session.execute(
            select(TriggerEvent).where(
                TriggerEvent.id == requested_trigger_id,
                TriggerEvent.status == "active",
            )
        )
        trigger = trigger_q.scalar_one_or_none()
        if trigger is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Requested trigger not found or no longer active.",
            )
        if trigger.type not in eligible_types:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Plan '{policy.plan_variant}' does not cover trigger '{trigger.type}'.",
            )
        if trigger.zone not in (worker.service_zones or []):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Requested trigger is outside your registered service zones.",
            )
        return trigger

    trigger_q = await session.execute(
        select(TriggerEvent)
        .where(
            TriggerEvent.status == "active",
            TriggerEvent.type.in_(list(eligible_types)),
            TriggerEvent.zone.in_(worker.service_zones or []),
        )
        .order_by(desc(TriggerEvent.triggered_at))
        .limit(1)
    )
    trigger = trigger_q.scalar_one_or_none()
    if trigger is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No active eligible trigger found in your service zones right now.",
        )
    return trigger


# ── Worker routes ─────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=ClaimListResponse,
    summary="List my claims",
    description="Returns the authenticated worker's claim history, newest first.",
    dependencies=[Depends(rate_limit(per_ip=60, per_identity=40, burst=10))],
)
async def list_my_claims(
    page:    int          = Query(1,  ge=1),
    limit:   int          = Query(20, ge=1, le=100),
    wid:     str          = Depends(get_current_worker_id),
    session: AsyncSession = Depends(get_db),
) -> ClaimListResponse:
    offset  = (page - 1) * limit

    total_q = await session.execute(
        select(func.count(Claim.id)).where(Claim.worker_id == wid)
    )
    total   = total_q.scalar_one() or 0

    rows_q  = await session.execute(
        select(Claim)
        .where(Claim.worker_id == wid)
        .order_by(desc(Claim.initiated_at))
        .offset(offset)
        .limit(limit)
    )
    claims    = list(rows_q.scalars().all())
    summaries = [await _enrich_summary(c, session) for c in claims]

    return ClaimListResponse(total=total, page=page, limit=limit, claims=summaries)


@router.post(
    "/apply",
    response_model=ApplyClaimResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Apply for a claim against an active trigger",
    description=(
        "Creates a claim for the authenticated worker using their active policy and an active trigger "
        "in their service zones. If an identical claim already exists for the same worker-policy-trigger "
        "triplet, that claim is returned instead of creating a duplicate."
    ),
    dependencies=[Depends(rate_limit(per_ip=12, per_identity=6, burst=2))],
)
async def apply_for_claim(
    body: ApplyClaimRequest,
    wid: str = Depends(get_current_worker_id),
    session: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> ApplyClaimResponse:
    worker, policy = await _resolve_worker_active_policy(session, wid)
    trigger = await _resolve_target_trigger(session, worker, policy, body.trigger_event_id)

    idem_key = f"{worker.id}:{policy.id}:{trigger.id}"
    existing_q = await session.execute(select(Claim).where(Claim.idempotency_key == idem_key))
    existing = existing_q.scalar_one_or_none()
    if existing is not None:
        summary = await _enrich_summary(existing, session)
        return ApplyClaimResponse(
            claim=summary,
            message="A claim for this trigger already exists. Returning existing claim.",
        )

    now = datetime.utcnow()
    claim = Claim(
        worker_id=worker.id,
        policy_id=policy.id,
        trigger_event_id=trigger.id,
        status="initiated",
        fraud_score=0.0,
        fraud_reason_tags=[],
        payout_amount=0.0,
        idempotency_key=idem_key,
        initiated_at=now,
        created_at=now,
        updated_at=now,
    )
    session.add(claim)
    await session.flush()

    await log_event(
        session,
        entity_type="Claim",
        entity_id=claim.id,
        action="manual_apply_initiated",
        actor=wid,
        actor_id=wid,
        payload={
            "trigger_event_id": trigger.id,
            "trigger_type": trigger.type,
            "zone": trigger.zone,
            "policy_id": policy.id,
            "plan_variant": policy.plan_variant,
            "idempotency_key": idem_key,
        },
    )

    fraud = await score_claim(claim.id, session, catastrophe_mode=False)
    decision = fraud.decision

    if decision == "auto_approve":
        claim.status = "approved"
        claim.updated_at = datetime.utcnow()
        await log_event(
            session,
            entity_type="Claim",
            entity_id=claim.id,
            action="auto_approved",
            actor="claim_apply",
            payload={
                "from": "initiated",
                "to": "approved",
                "fraud_score": claim.fraud_score,
            },
        )
        await session.flush()
        await initiate_payout(claim.id, session)
        try:
            await recompute_trust_score(claim.worker_id, session, trigger="claim_resolved")
        except Exception as trust_exc:
            logger.warning("[trust] recompute failed after claim apply approve (worker=%s): %s", claim.worker_id, trust_exc)
    elif decision in ("hold", "manual_review"):
        claim.status = "in_review"
        claim.updated_at = datetime.utcnow()
        await log_event(
            session,
            entity_type="Claim",
            entity_id=claim.id,
            action="held_for_review",
            actor="claim_apply",
            payload={
                "from": "initiated",
                "to": "in_review",
                "fraud_score": claim.fraud_score,
                "reason_tags": claim.fraud_reason_tags,
                "sla_minutes": 30,
            },
        )
    else:
        claim.status = "blocked"
        claim.updated_at = datetime.utcnow()
        await log_event(
            session,
            entity_type="Claim",
            entity_id=claim.id,
            action="auto_blocked",
            actor="claim_apply",
            payload={
                "from": "initiated",
                "to": "blocked",
                "fraud_score": claim.fraud_score,
                "reason_tags": claim.fraud_reason_tags,
            },
        )
        try:
            await recompute_trust_score(claim.worker_id, session, trigger="fraud_flag")
        except Exception as trust_exc:
            logger.warning("[trust] recompute failed after claim apply block (worker=%s): %s", claim.worker_id, trust_exc)

    await redis.publish(
        "trigger_events",
        f'{{"trigger_id":"{trigger.id}","source":"worker_apply","worker_id":"{wid}"}}',
    )

    await session.commit()

    summary = await _enrich_summary(claim, session)
    return ApplyClaimResponse(claim=summary, message="Claim submitted successfully.")


@router.get(
    "/{claim_id}",
    response_model=ClaimDetail,
    summary="Get claim detail",
    description=(
        "Returns a single claim with fraud reason tags (human-readable), "
        "payout status, and a full audit timeline."
    ),
    dependencies=[Depends(rate_limit(per_ip=60, per_identity=40, burst=10))],
)
async def get_claim(
    claim_id: str,
    wid:      str          = Depends(get_current_worker_id),
    session:  AsyncSession = Depends(get_db),
) -> ClaimDetail:
    claim = await _get_claim_or_404(session, claim_id)
    if claim.worker_id != wid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to view this claim.",
        )

    summary = await _enrich_summary(claim, session)

    # Trigger extra fields
    trigger_value = trigger_threshold = confidence_score = None
    if claim.trigger_event_id:
        t_q = await session.execute(
            select(TriggerEvent).where(TriggerEvent.id == claim.trigger_event_id)
        )
        trig = t_q.scalar_one_or_none()
        if trig:
            trigger_value     = trig.value
            trigger_threshold = trig.threshold
            confidence_score  = trig.confidence_score

    # Payout
    payout_detail: Optional[PayoutDetail] = None
    payout_q = await session.execute(
        select(PayoutTransaction).where(PayoutTransaction.claim_id == claim_id)
    )
    payout = payout_q.scalar_one_or_none()
    if payout:
        payout_detail = PayoutDetail(
            payout_id    = payout.id,
            amount       = payout.amount,
            gateway      = payout.gateway,
            gateway_ref  = payout.gateway_ref,
            status       = payout.status,
            initiated_at = payout.initiated_at.isoformat(),
        )

    # Audit timeline
    tl_q = await session.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "Claim", AuditLog.entity_id == claim_id)
        .order_by(AuditLog.timestamp)
    )
    timeline = [
        TimelineEvent(
            timestamp = entry.timestamp.isoformat(),
            action    = entry.action,
            actor     = entry.actor,
            detail    = (
                ", ".join(entry.payload.get("reason_tags", []))
                or entry.payload.get("notes")
                if entry.payload else None
            ),
        )
        for entry in tl_q.scalars().all()
    ]

    return ClaimDetail(
        **summary.model_dump(),
        policy_id         = claim.policy_id,
        trigger_event_id  = claim.trigger_event_id,
        trigger_value     = trigger_value,
        trigger_threshold = trigger_threshold,
        confidence_score  = confidence_score,
        payout            = payout_detail,
        timeline          = timeline,
    )


@router.post(
    "/{claim_id}/appeal",
    response_model=AppealResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit an appeal for a rejected claim",
    description=(
        "Allows a worker to write a reason for appealing a rejected or blocked claim. "
        "The claim status transitions to 'in_review' and the appeal text is stored "
        "in the immutable audit log for admin review."
    ),
    dependencies=[Depends(rate_limit(per_ip=5, per_identity=3, burst=1))],
)
async def submit_appeal(
    claim_id: str,
    body:     AppealRequest,
    wid:      str          = Depends(get_current_worker_id),
    session:  AsyncSession = Depends(get_db),
) -> AppealResponse:
    claim = await _get_claim_or_404(session, claim_id)

    if claim.worker_id != wid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorised to appeal this claim.",
        )
    if claim.status not in ("rejected", "blocked"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Claim status is '{claim.status}'. "
                "Only 'rejected' or 'blocked' claims can be appealed."
            ),
        )

    now              = datetime.utcnow()
    previous_status  = claim.status
    claim.status     = "in_review"
    claim.updated_at = now

    await log_event(
        session,
        entity_type = "Claim",
        entity_id   = claim_id,
        action      = "appeal_submitted",
        actor       = wid,
        actor_id    = wid,
        payload     = {
            "appeal_reason": body.reason,
            "from":          previous_status,
            "to":            "in_review",
        },
    )

    await session.commit()

    return AppealResponse(
        claim_id = claim_id,
        status   = "in_review",
        message  = (
            "Your appeal has been submitted. "
            "Our team will review it within 30 minutes and update you on the outcome."
        ),
    )


# ── Admin routes ──────────────────────────────────────────────────────────────

@router.get(
    "/admin/claims",
    response_model=ClaimListResponse,
    summary="[Admin] List all claims",
    description="Returns all claims with optional filters. Requires REVIEWER role or higher.",
    dependencies=[Depends(require_reviewer), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
)
async def admin_list_claims(
    page:         int            = Query(1,  ge=1),
    limit:        int            = Query(50, ge=1, le=200),
    claim_status: Optional[str]  = Query(None, alias="status"),
    zone:         Optional[str]  = Query(None),
    trigger_type: Optional[str]  = Query(None),
    min_fraud:    Optional[float] = Query(None, ge=0, le=100),
    session:      AsyncSession   = Depends(get_db),
) -> ClaimListResponse:
    base_q = select(Claim)

    if claim_status:
        base_q = base_q.where(Claim.status == claim_status)
    if min_fraud is not None:
        base_q = base_q.where(Claim.fraud_score >= min_fraud)
    if zone or trigger_type:
        base_q = base_q.join(TriggerEvent, Claim.trigger_event_id == TriggerEvent.id)
        if zone:
            base_q = base_q.where(TriggerEvent.zone == zone)
        if trigger_type:
            base_q = base_q.where(TriggerEvent.type == trigger_type)

    offset    = (page - 1) * limit
    total_res = await session.execute(
        select(func.count()).select_from(base_q.subquery())
    )
    total     = total_res.scalar_one() or 0

    rows_q    = await session.execute(
        base_q.order_by(desc(Claim.initiated_at)).offset(offset).limit(limit)
    )
    claims    = list(rows_q.scalars().all())
    summaries = [await _enrich_summary(c, session) for c in claims]

    return ClaimListResponse(total=total, page=page, limit=limit, claims=summaries)


@router.patch(
    "/admin/claims/{claim_id}/review",
    response_model=AdminReviewResponse,
    summary="[Admin] Approve or reject a held/flagged claim",
    description=(
        "Admin manually resolves a claim in 'in_review' status. "
        "'approve' initiates an immediate payout; 'reject' closes the claim. "
        "Requires REVIEWER role or higher."
    ),
    dependencies=[Depends(require_reviewer), Depends(rate_limit(per_ip=100, per_identity=100, burst=20))],
)
async def admin_review_claim(
    claim_id:      str,
    body:          AdminReviewRequest,
    current_user:  CurrentUser = Depends(require_reviewer),
    session:       AsyncSession   = Depends(get_db),
    redis:         aioredis.Redis = Depends(get_redis),
) -> AdminReviewResponse:
    claim = await _get_claim_or_404(session, claim_id)

    if claim.status not in ("in_review", "initiated"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Claim is '{claim.status}' — only 'in_review' claims can be reviewed.",
        )

    now   = datetime.utcnow()
    actor = f"admin:{x_admin_token[:8]}…" if x_admin_token else "admin"

    if body.decision == "approve":
        prev_status      = claim.status
        claim.status     = "approved"
        claim.updated_at = now

        await log_event(
            session,
            entity_type = "Claim",
            entity_id   = claim_id,
            action      = "admin_approved",
            actor       = actor,
            payload     = {
                "from":        prev_status,
                "to":          "approved",
                "notes":       body.notes or "",
                "fraud_score": claim.fraud_score,
            },
        )
        await session.flush()
        try:
            await initiate_payout(claim_id, session)
        except ValueError as payout_err:
            await session.rollback()
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Payout initiation failed: {payout_err}",
            )
        try:
            await recompute_trust_score(claim.worker_id, session, trigger="claim_resolved")
        except Exception as _te:
            logger.warning("[trust] recompute failed after admin_approve (worker=%s): %s", claim.worker_id, _te)
        await session.commit()

        return AdminReviewResponse(
            claim_id = claim_id,
            status   = "paid",
            message  = f"Claim approved and payout initiated for worker {claim.worker_id}.",
        )

    # decision == "reject"
    prev_status       = claim.status
    claim.status      = "rejected"
    claim.resolved_at = now
    claim.updated_at  = now

    await log_event(
        session,
        entity_type = "Claim",
        entity_id   = claim_id,
        action      = "admin_rejected",
        actor       = actor,
        payload     = {
            "from":        prev_status,
            "to":          "rejected",
            "notes":       body.notes or "",
            "fraud_score": claim.fraud_score,
        },
    )
    try:
        await recompute_trust_score(claim.worker_id, session, trigger="claim_resolved")
    except Exception as _te:
        logger.warning("[trust] recompute failed after admin_reject (worker=%s): %s", claim.worker_id, _te)
    await session.commit()

    return AdminReviewResponse(
        claim_id = claim_id,
        status   = "rejected",
        message  = "Claim rejected.",
    )

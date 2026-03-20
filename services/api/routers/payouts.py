"""
Payouts Router — Suraksha Weekly (FR-7 / PRD §5 Flow D)

Worker endpoints (JWT required):
    GET  /payouts              — paginated payout history for the authenticated worker
    GET  /payouts/{id}         — full payout detail with gateway reference and timestamps

Admin endpoints (X-Admin-Token required):
    POST /admin/payouts/{id}/retry — manually retry a failed payout
"""
from __future__ import annotations

import logging
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from core.security import JWTHandler
from models import Claim, PayoutTransaction, TriggerEvent
from services.payout_service import retry_failed_payout

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Auth helpers (same pattern as claims router) ──────────────────────────────

async def get_current_worker_id(
    authorization: Annotated[Optional[str], Header()] = None,
) -> str:
    """Extract and validate the worker_id from the Bearer JWT."""
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
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                                detail="Invalid token payload.")
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
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Valid X-Admin-Token header required.")


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PayoutSummary(BaseModel):
    """Lightweight row for list views."""
    id:           str
    claim_id:     str
    amount:       float
    gateway:      str
    gateway_ref:  Optional[str]
    status:       str
    trigger_type: Optional[str]
    zone:         Optional[str]
    initiated_at: str
    confirmed_at: Optional[str]


class PayoutDetail(PayoutSummary):
    """Full payout detail including computation breakdown and claim context."""
    worker_id:             str
    idempotency_key:       str
    # Payout formula breakdown (from audit log)
    avg_hourly_earnings:   Optional[float] = None
    lost_covered_hours:    Optional[float] = None
    severity_factor:       Optional[float] = None
    base_payout:           Optional[float] = None
    coverage_cap:          Optional[float] = None
    weekly_cap:            Optional[float] = None
    weekly_already_paid:   Optional[float] = None
    capped_by:             Optional[str]   = None


class PayoutListResponse(BaseModel):
    total:    int
    page:     int
    limit:    int
    payouts:  list[PayoutSummary]


class RetryResponse(BaseModel):
    payout_id:   str
    status:      str
    gateway_ref: Optional[str]
    message:     str


# ── Internal helpers ──────────────────────────────────────────────────────────

async def _get_payout_or_404(session: AsyncSession, payout_id: str) -> PayoutTransaction:
    result = await session.execute(
        select(PayoutTransaction).where(PayoutTransaction.id == payout_id)
    )
    pt = result.scalar_one_or_none()
    if pt is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail=f"PayoutTransaction '{payout_id}' not found.")
    return pt


async def _enrich_summary(pt: PayoutTransaction, session: AsyncSession) -> PayoutSummary:
    """Enrich a PayoutTransaction with trigger metadata."""
    trigger_type = zone = None
    claim_q = await session.execute(select(Claim).where(Claim.id == pt.claim_id))
    claim   = claim_q.scalar_one_or_none()
    if claim and claim.trigger_event_id:
        tq = await session.execute(
            select(TriggerEvent).where(TriggerEvent.id == claim.trigger_event_id)
        )
        trig = tq.scalar_one_or_none()
        if trig:
            trigger_type = trig.type
            zone         = trig.zone

    return PayoutSummary(
        id           = pt.id,
        claim_id     = pt.claim_id,
        amount       = pt.amount,
        gateway      = pt.gateway,
        gateway_ref  = pt.gateway_ref,
        status       = pt.status,
        trigger_type = trigger_type,
        zone         = zone,
        initiated_at = pt.initiated_at.isoformat(),
        confirmed_at = pt.confirmed_at.isoformat() if pt.confirmed_at else None,
    )


# ── Worker routes ─────────────────────────────────────────────────────────────

@router.get(
    "",
    response_model=PayoutListResponse,
    summary="List my payout history",
    description=(
        "Returns the authenticated worker's payout history, newest first. "
        "Includes gateway reference and confirmation timestamps."
    ),
)
async def list_my_payouts(
    page:    int          = Query(1,  ge=1),
    limit:   int          = Query(20, ge=1, le=100),
    wid:     str          = Depends(get_current_worker_id),
    session: AsyncSession = Depends(get_db),
) -> PayoutListResponse:
    offset  = (page - 1) * limit

    total_q = await session.execute(
        select(func.count(PayoutTransaction.id))
        .where(PayoutTransaction.worker_id == wid)
    )
    total   = total_q.scalar_one() or 0

    rows_q  = await session.execute(
        select(PayoutTransaction)
        .where(PayoutTransaction.worker_id == wid)
        .order_by(desc(PayoutTransaction.initiated_at))
        .offset(offset)
        .limit(limit)
    )
    payouts   = list(rows_q.scalars().all())
    summaries = [await _enrich_summary(pt, session) for pt in payouts]

    return PayoutListResponse(total=total, page=page, limit=limit, payouts=summaries)


@router.get(
    "/{payout_id}",
    response_model=PayoutDetail,
    summary="Get payout detail",
    description=(
        "Returns a single PayoutTransaction with its gateway reference, "
        "confirmation timestamp, and the full payout amount formula breakdown."
    ),
)
async def get_payout(
    payout_id: str,
    wid:       str          = Depends(get_current_worker_id),
    session:   AsyncSession = Depends(get_db),
) -> PayoutDetail:
    pt = await _get_payout_or_404(session, payout_id)

    if pt.worker_id != wid:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Not authorised to view this payout.")

    summary = await _enrich_summary(pt, session)

    # Read formula breakdown from the payout's audit log entry
    from models import AuditLog
    audit_q = await session.execute(
        select(AuditLog).where(
            AuditLog.entity_type == "PayoutTransaction",
            AuditLog.entity_id   == payout_id,
            AuditLog.action      == "initiated",
        ).order_by(AuditLog.timestamp).limit(1)
    )
    audit   = audit_q.scalar_one_or_none()
    payload = audit.payload if audit else {}

    return PayoutDetail(
        **summary.model_dump(),
        worker_id           = pt.worker_id,
        idempotency_key     = pt.idempotency_key,
        avg_hourly_earnings = payload.get("avg_hourly_earnings"),
        lost_covered_hours  = payload.get("lost_covered_hours"),
        severity_factor     = payload.get("severity_factor"),
        base_payout         = payload.get("base_payout"),
        coverage_cap        = payload.get("coverage_cap"),
        weekly_cap          = payload.get("weekly_cap"),
        weekly_already_paid = payload.get("weekly_already_paid"),
        capped_by           = payload.get("capped_by"),
    )


# ── Admin routes ───────────────────────────────────────────────────────────────

@router.post(
    "/admin/payouts/{payout_id}/retry",
    response_model=RetryResponse,
    status_code=status.HTTP_200_OK,
    summary="[Admin] Retry a failed payout",
    description=(
        "Manually retries a PayoutTransaction that is in 'failed' status. "
        "Re-calls the gateway and updates the record. "
        "Requires X-Admin-Token header."
    ),
    dependencies=[Depends(_require_admin)],
)
async def admin_retry_payout(
    payout_id:     str,
    x_admin_token: Annotated[Optional[str], Header()] = None,
    session:       AsyncSession = Depends(get_db),
) -> RetryResponse:
    pt = await _get_payout_or_404(session, payout_id)

    if pt.status not in ("failed", "pending"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Payout is '{pt.status}' — only 'failed' or 'pending' payouts can be retried."
            ),
        )

    actor = f"admin:{x_admin_token[:8]}…" if x_admin_token else "admin"

    try:
        payout = await retry_failed_payout(payout_id, session, actor=actor)
        await session.commit()

        return RetryResponse(
            payout_id   = payout_id,
            status      = payout.status,
            gateway_ref = payout.gateway_ref,
            message     = (
                f"Payout retry succeeded. New status: {payout.status}. "
                f"Ref: {payout.gateway_ref}."
            ),
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("[retry] Retry failed for payout %s: %s", payout_id, exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gateway call failed during retry: {exc}",
        )

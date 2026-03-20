"""
Pricing & Premium Calculation Router — Suraksha Weekly (FR-3 / PRD §9)

Endpoints
─────────
GET /api/v1/pricing/quote?worker_id={id}
    Returns computed weekly premiums for all three plan variants along with
    the top-3 explainability factors and a full risk-profile snapshot.

GET /api/v1/pricing/risk-profile?worker_id={id}
    Returns (or computes + saves) the latest RiskProfile for a worker.
    Useful for admin inspection and debugging.
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.rate_limiter import rate_limit
from core.security import JWTHandler
from models import Worker, RiskProfile
from services.pricing_service import compute_weekly_premium
from services.risk_profile_service import compute_and_save_risk_profile

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Pydantic response schemas (inline — no external dependency) ───────────────

class PremiumFactor(BaseModel):
    """One human-readable factor driving the premium."""
    label:      str
    impact_pct: int
    score:      float
    direction:  str   # "increases" | "decreases" | "neutral"


class PlanQuote(BaseModel):
    """Quote for a single plan variant."""
    plan_variant:  str
    weekly_premium: float
    coverage_cap:  float
    premium_mult:  float
    coverage_mult: float


class RiskSnapshot(BaseModel):
    location_risk_index:        float
    disruption_frequency_score: float
    hour_exposure_score:        float
    platform_segment_factor:    float
    trust_tier:                 str


class PricingQuoteResponse(BaseModel):
    """Full pricing quote returned to the frontend."""
    worker_id:           str
    base_rate:           float
    risk_multiplier:     float
    exposure_multiplier: float
    trust_adjustment:    float
    platform_factor:     float
    standard_premium:    float
    base_coverage:       float
    plans:               dict[str, PlanQuote]
    top_3_factors:       list[PremiumFactor]
    risk_profile_snapshot: RiskSnapshot


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _resolve_worker_id(
    worker_id: str | None,
    session: AsyncSession,
) -> str:
    """
    Validate that the worker_id corresponds to an existing Worker row.
    Raises HTTP 404 if not found.
    """
    if not worker_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="worker_id query parameter is required",
        )
    row = await session.execute(select(Worker).where(Worker.id == worker_id))
    if row.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Worker '{worker_id}' not found",
        )
    return worker_id


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get(
    "/quote",
    response_model=PricingQuoteResponse,
    summary="Get dynamic weekly premium quote",
    description=(
        "Returns computed weekly premiums for all three plan variants along "
        "with the top-3 explainability factors and a full risk-profile snapshot. "
        "A RiskProfile is auto-computed and persisted if none exists yet."
    ),
    dependencies=[Depends(rate_limit(per_ip=30, per_identity=20, burst=5))],
)
async def get_pricing_quote(
    worker_id: Annotated[
        str | None,
        Query(description="UUID of the authenticated worker"),
    ] = None,
    session: AsyncSession = Depends(get_db),
) -> PricingQuoteResponse:
    """
    Dynamic premium quote for Basic, Standard, and Pro plans.

    Query params
    ────────────
    worker_id  UUID of the worker (required)

    Returns
    ────────────
    PricingQuoteResponse — full breakdown including per-plan premiums,
    coverage caps, ML-derived risk factors, and top-3 explainability labels.
    """
    wid = await _resolve_worker_id(worker_id, session)

    try:
        result = await compute_weekly_premium(wid, session)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except Exception as exc:
        logger.exception("Pricing engine error for worker %s: %s", wid, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Premium computation failed. Please try again.",
        )

    # Coerce nested dicts to Pydantic models for strict response validation
    result["plans"] = {k: PlanQuote(**v) for k, v in result["plans"].items()}
    result["top_3_factors"] = [PremiumFactor(**f) for f in result["top_3_factors"]]
    result["risk_profile_snapshot"] = RiskSnapshot(**result["risk_profile_snapshot"])

    return PricingQuoteResponse(**result)


@router.get(
    "/risk-profile",
    summary="Get (or compute) a worker's risk profile",
    description=(
        "Returns the latest persisted RiskProfile for a worker. "
        "If no profile exists, one is computed from current data and saved. "
        "Intended for admin inspection and debugging."
    ),
    dependencies=[Depends(rate_limit(per_ip=30, per_identity=20, burst=5))],
)
async def get_risk_profile(
    worker_id: Annotated[
        str | None,
        Query(description="UUID of the worker"),
    ] = None,
    session: AsyncSession = Depends(get_db),
) -> dict:
    """Return or auto-create the worker's risk profile."""
    wid = await _resolve_worker_id(worker_id, session)

    row = await session.execute(
        select(Worker).where(Worker.id == wid)
    )
    worker = row.scalar_one()

    rp_row = await session.execute(
        select(RiskProfile)
        .where(RiskProfile.worker_id == wid)
        .order_by(RiskProfile.computed_at.desc())
        .limit(1)
    )
    profile = rp_row.scalar_one_or_none()

    if profile is None:
        profile = await compute_and_save_risk_profile(worker, session)
        await session.commit()

    return {
        "worker_id":                  wid,
        "location_risk_index":        profile.location_risk_index,
        "disruption_frequency_score": profile.disruption_frequency_score,
        "hour_exposure_score":        profile.hour_exposure_score,
        "platform_segment_factor":    profile.platform_segment_factor,
        "computed_at":                profile.computed_at.isoformat(),
    }

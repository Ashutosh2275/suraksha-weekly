"""
Risk Profile Service — Suraksha Weekly

Computes and upserts RiskProfile rows for gig workers.
Called on first quote, worker registration, and weekly policy renewal.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import Worker, RiskProfile, TriggerEvent


# ── City × Zone risk index lookup ─────────────────────────────────────────────
# Values represent historical disruption probability (0.0 = safe, 1.0 = very high).
# Sourced from city-level weather density, AQI patterns, and traffic data.
CITY_ZONE_RISK_MAP: dict[str, dict[str, float]] = {
    "Mumbai": {
        "_default":    0.72,
        "South Mumbai": 0.78,
        "Bandra":       0.76,
        "Andheri":      0.73,
        "Borivali":     0.66,
        "Thane":        0.64,
        "Navi Mumbai":  0.60,
    },
    "Delhi": {
        "_default":     0.70,
        "Central Delhi": 0.76,
        "South Delhi":  0.69,
        "Dwarka":       0.63,
        "Noida":        0.66,
        "Gurugram":     0.68,
        "Rohini":       0.61,
    },
    "Bengaluru": {
        "_default":       0.60,
        "Koramangala":    0.65,
        "Whitefield":     0.59,
        "Indiranagar":    0.64,
        "HSR Layout":     0.60,
        "Electronic City": 0.54,
        "Hebbal":         0.57,
    },
    "Hyderabad": {
        "_default":    0.56,
        "Banjara Hills": 0.62,
        "Hitech City":  0.58,
        "Secunderabad": 0.60,
        "Kukatpally":   0.52,
        "Madhapur":     0.57,
        "Gachibowli":   0.54,
    },
    "Chennai": {
        "_default": 0.58,
        "T Nagar":   0.64,
        "Anna Nagar": 0.58,
        "Velachery": 0.60,
        "OMR":       0.55,
        "Adyar":     0.63,
        "Tambaram":  0.50,
    },
    "Pune": {
        "_default":      0.52,
        "Shivajinagar":  0.58,
        "Koregaon Park": 0.56,
        "Wakad":         0.50,
        "Hinjewadi":     0.48,
        "Baner":         0.52,
        "Kothrud":       0.53,
    },
}

# Platform-type risk multiplier (higher = more cross-platform exposure)
_PLATFORM_FACTOR: dict[str, float] = {
    "Zomato": 1.00,
    "Swiggy": 1.04,
    "Both":   1.10,
}


# ── Sub-computations ──────────────────────────────────────────────────────────

def _location_risk_index(city: str, zones: list[str]) -> float:
    """
    Average location risk index across the worker's delivery zones.

    Falls back to the city-level default for unknown zones,
    and to 0.55 if the city itself is unknown.
    """
    city_map = CITY_ZONE_RISK_MAP.get(city, {})
    default  = city_map.get("_default", 0.55)
    if not zones:
        return default
    scores = [city_map.get(z, default) for z in zones]
    return round(sum(scores) / len(scores), 4)


async def _disruption_frequency_score(
    session: AsyncSession,
    zones: list[str],
    lookback_days: int = 30,
) -> float:
    """
    Fraction of the last 30 days during which a disruption was active
    in any of the worker's zones.  Soft-capped: 30 events → score 1.0.

    Returns a neutral 0.30 when there are no zones (new worker, no history).
    """
    if not zones:
        return 0.30

    cutoff = datetime.utcnow() - timedelta(days=lookback_days)
    result = await session.execute(
        select(func.count(TriggerEvent.id)).where(
            TriggerEvent.zone.in_(zones),
            TriggerEvent.triggered_at >= cutoff,
            TriggerEvent.status.in_(["active", "resolved"]),
        )
    )
    count = result.scalar_one_or_none() or 0
    return round(min(count / 30.0, 1.0), 4)


def _hour_exposure_score(avg_daily_hours: float, platform_type: str) -> float:
    """
    Exposure score derived from daily hours on road and platform breadth.

    Formula:
        base = min(avg_daily_hours / 14.0, 1.0)   # 14 h = maximum reference
        bonus = 0.08 for multi-platform workers
    """
    base  = min(avg_daily_hours / 14.0, 1.0)
    bonus = 0.08 if platform_type in ("Both", "both") else 0.0
    return round(min(base + bonus, 1.0), 4)


def _platform_segment_factor(platform_type: str) -> float:
    """Return the platform risk multiplier for a worker's primary platform(s)."""
    return _PLATFORM_FACTOR.get(platform_type, 1.00)


# ── Main entry-point ──────────────────────────────────────────────────────────

async def compute_and_save_risk_profile(
    worker: Worker,
    session: AsyncSession,
) -> RiskProfile:
    """
    Compute a fresh RiskProfile for a worker and upsert it.

    The profile is added to *session* but not committed — the caller is
    responsible for committing so the write stays inside the outer transaction.

    Args:
        worker:  SQLAlchemy Worker ORM instance (must already be persisted)
        session: Active async DB session

    Returns:
        RiskProfile ORM instance (may be newly created or updated existing row)
    """
    zones = worker.service_zones or []

    loc_risk    = _location_risk_index(worker.city, zones)
    disrupt     = await _disruption_frequency_score(session, zones)
    exposure    = _hour_exposure_score(worker.avg_daily_hours, worker.platform_type)
    plat_factor = _platform_segment_factor(worker.platform_type)

    # Upsert: update the latest profile row, or create one if none exists
    existing = await session.execute(
        select(RiskProfile)
        .where(RiskProfile.worker_id == worker.id)
        .order_by(RiskProfile.computed_at.desc())
        .limit(1)
    )
    profile: Optional[RiskProfile] = existing.scalar_one_or_none()

    if profile is None:
        profile = RiskProfile(id=str(uuid.uuid4()), worker_id=worker.id)
        session.add(profile)

    profile.location_risk_index       = loc_risk
    profile.disruption_frequency_score = disrupt
    profile.hour_exposure_score        = exposure
    profile.platform_segment_factor    = plat_factor
    profile.computed_at                = datetime.utcnow()
    profile.updated_at                 = datetime.utcnow()

    return profile

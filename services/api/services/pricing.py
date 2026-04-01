"""Deterministic weekly premium computation engine for Suraksha Weekly."""

from __future__ import annotations

import re
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models import RiskProfile, Worker


_D0 = Decimal("0")
_D1 = Decimal("1")
_DEFAULT_BASE_RATE = Decimal("49")
_DEFAULT_FLOOR = Decimal("29")
_DEFAULT_CEILING = Decimal("149")
_DEFAULT_COVERAGE_CAP = Decimal("2000")
_DEFAULT_COVERAGE_RATIO = Decimal("0.8")


@dataclass(frozen=True)
class _Contribution:
    factor: str
    delta: Decimal
    impact: str
    description: str


def _as_decimal(value: Any, default: str = "0") -> Decimal:
    if value is None:
        return Decimal(default)
    if isinstance(value, Decimal):
        return value
    if isinstance(value, bool):
        return Decimal(int(value))
    return Decimal(str(value))


def _quantize_money(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _quantize_multiplier(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.0001"), rounding=ROUND_HALF_UP)


def _clamp(value: Decimal, minimum: Decimal, maximum: Decimal) -> Decimal:
    return max(minimum, min(value, maximum))


def _normalize_key(value: str | None) -> str:
    if not value:
        return "default"
    key = re.sub(r"[^a-z0-9]+", "_", value.strip().lower())
    return key.strip("_") or "default"


def _get_value(source: Any, name: str, default: Any = None) -> Any:
    if source is None:
        return default
    if isinstance(source, dict):
        return source.get(name, default)
    return getattr(source, name, default)


def _resolve_base_rate(city: str | None) -> Decimal:
    base_rates = getattr(settings, "WEEKLY_PREMIUM_BASE_RATE_BY_CITY", {"default": 49.0}) or {"default": 49.0}
    city_key = _normalize_key(city)
    default_rate = _as_decimal(base_rates.get("default", _DEFAULT_BASE_RATE))
    resolved = _as_decimal(base_rates.get(city_key, default_rate))
    return _quantize_money(resolved)


def _risk_multiplier(location_risk_index: Any, disruption_frequency_score: Any) -> Decimal:
    location = _clamp(_as_decimal(location_risk_index, default="0.5"), _D0, _D1)
    disruption = _clamp(_as_decimal(disruption_frequency_score, default="0.5"), _D0, _D1)
    raw = Decimal("0.8") + (Decimal("1.2") * location) + (Decimal("0.5") * disruption)
    return _quantize_multiplier(_clamp(raw, Decimal("0.8"), Decimal("2.5")))


def _exposure_multiplier(avg_daily_hours: Any, platform_type: Any) -> Decimal:
    hours = _clamp(_as_decimal(avg_daily_hours, default="8.0"), _D0, Decimal("16"))
    normalized_hours = _clamp((hours - Decimal("4")) / Decimal("8"), _D0, _D1)
    platform_key = _normalize_key(str(platform_type) if platform_type is not None else None)
    platform_bonus = {
        "swiggy": Decimal("0.35"),
        "zomato": Decimal("0.25"),
        "other": Decimal("0.15"),
    }.get(platform_key, Decimal("0.15"))
    raw = Decimal("0.9") + (Decimal("0.55") * normalized_hours) + platform_bonus
    return _quantize_multiplier(_clamp(raw, Decimal("0.9"), Decimal("1.8")))


def _trust_adjustment(trust_adjustment: Any) -> Decimal:
    if trust_adjustment is None:
        return Decimal("1.0000")
    return _quantize_multiplier(_clamp(_as_decimal(trust_adjustment, default="1.0"), Decimal("0.85"), Decimal("1.0")))


def _coverage_limit(avg_weekly_earnings: Any) -> Decimal:
    earnings = _clamp(_as_decimal(avg_weekly_earnings, default="0"), _D0, Decimal("1000000"))
    raw = earnings * _DEFAULT_COVERAGE_RATIO
    return _quantize_money(min(_DEFAULT_COVERAGE_CAP, raw))


def _build_contributions(
    *,
    base_rate: Decimal,
    default_base_rate: Decimal,
    risk_multiplier: Decimal,
    exposure_multiplier: Decimal,
    trust_adjustment: Decimal,
) -> list[_Contribution]:
    base_delta = base_rate - default_base_rate
    risk_delta = base_rate * (risk_multiplier - _D1)
    exposure_delta = base_rate * risk_multiplier * (exposure_multiplier - _D1)
    trust_delta = base_rate * risk_multiplier * exposure_multiplier * (trust_adjustment - _D1)

    contributions = [
        _Contribution(
            factor="City base rate",
            delta=base_delta,
            impact="increases" if base_delta > 0 else "decreases" if base_delta < 0 else "neutral",
            description="Your city starts from a different weekly amount based on local operating costs and claim patterns.",
        ),
        _Contribution(
            factor="Route risk",
            delta=risk_delta,
            impact="increases" if risk_delta > 0 else "decreases" if risk_delta < 0 else "neutral",
            description="Your usual delivery area has more or fewer disruption risks, which changes the weekly amount.",
        ),
        _Contribution(
            factor="Work hours and platform",
            delta=exposure_delta,
            impact="increases" if exposure_delta > 0 else "decreases" if exposure_delta < 0 else "neutral",
            description="Longer delivery hours or a busier platform means more exposure, so the weekly amount moves up or down.",
        ),
        _Contribution(
            factor="Trust history",
            delta=trust_delta,
            impact="increases" if trust_delta > 0 else "decreases" if trust_delta < 0 else "neutral",
            description="A cleaner claim history lowers the weekly amount, while a riskier history can raise it.",
        ),
    ]
    contributions.sort(key=lambda item: (abs(item.delta), item.factor), reverse=True)
    return contributions


def _legacy_factor_payload(contribution: _Contribution, premium: Decimal) -> dict[str, Any]:
    impact_pct = 0
    if premium > 0:
        impact_pct = int((abs(contribution.delta) / premium * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    return {
        "label": contribution.factor,
        "impact_pct": impact_pct,
        "score": float(abs(contribution.delta)),
        "direction": contribution.impact,
    }


def build_weekly_premium_quote(
    *,
    worker: Any,
    risk_profile: Any | None = None,
    city: str | None = None,
) -> dict[str, Any]:
    """Build a deterministic weekly quote from worker and risk inputs."""

    worker_city = city or _get_value(worker, "city")
    base_rate = _resolve_base_rate(worker_city)

    risk_profile_present = risk_profile is not None
    if risk_profile_present:
        location_risk_index = _get_value(risk_profile, "location_risk_index", 0.5)
        disruption_frequency_score = _get_value(risk_profile, "disruption_frequency_score", 0.5)
        trust_adjustment_value = _get_value(risk_profile, "trust_adjustment", 1.0)
        risk_multiplier = _risk_multiplier(location_risk_index, disruption_frequency_score)
        exposure_multiplier = _exposure_multiplier(
            _get_value(worker, "avg_daily_hours", 8.0),
            _get_value(worker, "platform_type", "other"),
        )
        trust_adjustment = _trust_adjustment(trust_adjustment_value)
    else:
        location_risk_index = Decimal("0.5")
        disruption_frequency_score = Decimal("0.5")
        trust_adjustment_value = Decimal("1.0")
        risk_multiplier = Decimal("1.0000")
        exposure_multiplier = Decimal("1.0000")
        trust_adjustment = Decimal("1.0000")

    raw_premium = base_rate * risk_multiplier * exposure_multiplier * trust_adjustment
    floor = _as_decimal(getattr(settings, "WEEKLY_PREMIUM_FLOOR", _DEFAULT_FLOOR))
    ceiling = _as_decimal(getattr(settings, "WEEKLY_PREMIUM_CEILING", _DEFAULT_CEILING))
    premium = _quantize_money(_clamp(raw_premium, floor, ceiling))

    coverage_limit = _coverage_limit(_get_value(worker, "avg_weekly_earnings", 0))
    contributions = _build_contributions(
        base_rate=base_rate,
        default_base_rate=_resolve_base_rate(None),
        risk_multiplier=risk_multiplier,
        exposure_multiplier=exposure_multiplier,
        trust_adjustment=trust_adjustment,
    )
    top_contributions = contributions[:3]

    plans = {
        "basic": {
            "plan_variant": "basic",
            "weekly_premium": _quantize_money(_clamp(premium * Decimal("0.85"), floor, ceiling)),
            "coverage_cap": _quantize_money(coverage_limit * Decimal("0.75")),
            "premium_mult": 0.85,
            "coverage_mult": 0.75,
        },
        "standard": {
            "plan_variant": "standard",
            "weekly_premium": premium,
            "coverage_cap": coverage_limit,
            "premium_mult": 1.0,
            "coverage_mult": 1.0,
        },
        "pro": {
            "plan_variant": "pro",
            "weekly_premium": _quantize_money(_clamp(premium * Decimal("1.15"), floor, ceiling)),
            "coverage_cap": _quantize_money(coverage_limit * Decimal("1.25")),
            "premium_mult": 1.15,
            "coverage_mult": 1.25,
        },
    }

    return {
        "premium": premium,
        "coverage_limit": coverage_limit,
        "base_rate": base_rate,
        "risk_multiplier": risk_multiplier,
        "exposure_multiplier": exposure_multiplier,
        "trust_adjustment": trust_adjustment,
        "top_factors": [
            {
                "factor": item.factor,
                "impact": item.impact,
                "description": item.description,
            }
            for item in top_contributions
        ],
        "is_estimated": not risk_profile_present,
        # Compatibility fields for the existing API surface.
        "worker_id": _get_value(worker, "id"),
        "standard_premium": premium,
        "base_coverage": coverage_limit,
        "plans": plans,
        "top_3_factors": [_legacy_factor_payload(item, premium) for item in top_contributions],
        "risk_profile_snapshot": {
            "location_risk_index": _clamp(_as_decimal(location_risk_index, default="0.5"), _D0, _D1),
            "disruption_frequency_score": _clamp(_as_decimal(disruption_frequency_score, default="0.5"), _D0, _D1),
            "hour_exposure_score": _clamp(_as_decimal(_get_value(worker, "avg_daily_hours", 8.0), default="8.0") / Decimal("12"), _D0, _D1),
            "platform_segment_factor": exposure_multiplier,
            "trust_tier": _get_value(worker, "trust_tier", "standard"),
        },
        "forecast_fallback": True,
        "forecast_source": "static",
        "platform_factor": exposure_multiplier,
    }


async def compute_weekly_premium(
    worker_id: str,
    session: AsyncSession,
    redis: Any | None = None,
) -> dict[str, Any]:
    """Compatibility async wrapper used by existing routers."""

    del redis

    worker_row = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = worker_row.scalar_one_or_none()
    if worker is None:
        raise ValueError(f"Worker '{worker_id}' not found")

    risk_row = await session.execute(
        select(RiskProfile)
        .where(RiskProfile.worker_id == worker_id)
        .order_by(RiskProfile.computed_at.desc())
        .limit(1)
    )
    risk_profile = risk_row.scalar_one_or_none()

    return build_weekly_premium_quote(worker=worker, risk_profile=risk_profile, city=getattr(worker, "city", None))


def get_top_factors(features: dict, base_premium: float) -> list[dict]:
    """Compatibility helper for the legacy explainability API."""

    worker = {
        "avg_daily_hours": features.get("avg_daily_hours", 8.0),
        "platform_type": features.get("platform_type", "other"),
        "avg_weekly_earnings": features.get("avg_weekly_earnings", 0),
        "city": features.get("city", None),
        "trust_tier": features.get("trust_tier", "standard"),
    }
    risk_profile = {
        "location_risk_index": features.get("location_risk_index", 0.5),
        "disruption_frequency_score": features.get("disruption_frequency_score", 0.5),
        "trust_adjustment": features.get("trust_adjustment", 1.0),
    }
    quote = build_weekly_premium_quote(worker=worker, risk_profile=risk_profile)
    return quote["top_3_factors"]
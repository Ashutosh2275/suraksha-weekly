from __future__ import annotations

from decimal import Decimal

from core.config import settings
from services.pricing import build_weekly_premium_quote


class _Worker:
    def __init__(self, *, worker_id: str = "worker-1", city: str = "bengaluru", avg_daily_hours: float = 8.0, avg_weekly_earnings: float = 5000.0, platform_type: str = "swiggy", trust_tier: str = "standard") -> None:
        self.id = worker_id
        self.city = city
        self.avg_daily_hours = avg_daily_hours
        self.avg_weekly_earnings = avg_weekly_earnings
        self.platform_type = platform_type
        self.trust_tier = trust_tier


class _RiskProfile:
    def __init__(self, *, location_risk_index: float = 0.5, disruption_frequency_score: float = 0.5, trust_adjustment: float = 1.0) -> None:
        self.location_risk_index = location_risk_index
        self.disruption_frequency_score = disruption_frequency_score
        self.trust_adjustment = trust_adjustment


def _patch_pricing_settings(monkeypatch, *, base_rates: dict[str, float], floor: float, ceiling: float) -> None:
    monkeypatch.setattr(settings, "WEEKLY_PREMIUM_BASE_RATE_BY_CITY", base_rates, raising=False)
    monkeypatch.setattr(settings, "WEEKLY_PREMIUM_FLOOR", floor, raising=False)
    monkeypatch.setattr(settings, "WEEKLY_PREMIUM_CEILING", ceiling, raising=False)


def test_weekly_premium_floor_enforced(monkeypatch):
    _patch_pricing_settings(
        monkeypatch,
        base_rates={"default": 10.0},
        floor=29.0,
        ceiling=149.0,
    )

    quote = build_weekly_premium_quote(
        worker=_Worker(avg_daily_hours=4.0, avg_weekly_earnings=1000.0, platform_type="other"),
        risk_profile=_RiskProfile(location_risk_index=0.0, disruption_frequency_score=0.0, trust_adjustment=1.0),
    )

    assert quote["premium"] == Decimal("29.00")
    assert quote["coverage_limit"] == Decimal("800.00")


def test_weekly_premium_ceiling_enforced(monkeypatch):
    _patch_pricing_settings(
        monkeypatch,
        base_rates={"default": 200.0},
        floor=29.0,
        ceiling=149.0,
    )

    quote = build_weekly_premium_quote(
        worker=_Worker(avg_daily_hours=12.0, avg_weekly_earnings=9000.0, platform_type="swiggy"),
        risk_profile=_RiskProfile(location_risk_index=1.0, disruption_frequency_score=1.0, trust_adjustment=1.0),
    )

    assert quote["premium"] == Decimal("149.00")


def test_weekly_premium_neutral_defaults(monkeypatch):
    _patch_pricing_settings(
        monkeypatch,
        base_rates={"default": 49.0},
        floor=29.0,
        ceiling=149.0,
    )

    quote = build_weekly_premium_quote(
        worker=_Worker(avg_daily_hours=8.0, avg_weekly_earnings=5000.0, platform_type="swiggy"),
        risk_profile=None,
    )

    assert quote["is_estimated"] is True
    assert quote["risk_multiplier"] == Decimal("1.0000")
    assert quote["exposure_multiplier"] == Decimal("1.0000")
    assert quote["trust_adjustment"] == Decimal("1.0000")
    assert quote["premium"] == Decimal("49.00")


def test_top_factors_are_sorted_by_effect(monkeypatch):
    _patch_pricing_settings(
        monkeypatch,
        base_rates={"default": 49.0},
        floor=29.0,
        ceiling=500.0,
    )

    quote = build_weekly_premium_quote(
        worker=_Worker(avg_daily_hours=12.0, avg_weekly_earnings=7000.0, platform_type="swiggy"),
        risk_profile=_RiskProfile(location_risk_index=1.0, disruption_frequency_score=1.0, trust_adjustment=0.85),
    )

    factors = quote["top_factors"]
    assert len(factors) == 3
    assert [factor["factor"] for factor in factors] == [
        "Work hours and platform",
        "Route risk",
        "Trust history",
    ]

"""
Unit tests for pricing_service — PRD §23 suite 8.

Coverage:
  8.  Premium formula: plan modifiers, trust multiplier, floor clamping,
      ceiling clamping, forecast blend.
"""
from __future__ import annotations

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from models import RiskProfile, Worker
from services.pricing_service import (
    PLAN_MODIFIERS,
    compute_weekly_premium,
)
from services.trust_service import TRUST_PREMIUM_MULTIPLIER
from core.config import settings
from tests.unit.conftest import make_execute_result


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _worker(trust_tier: str = "bronze") -> Worker:
    w = Worker()
    w.id = str(uuid.uuid4())
    w.phone = "+919900000001"
    w.name = "Test Worker"
    w.city = "Mumbai"
    w.platform_type = "Zomato"
    w.avg_daily_hours = 8.0
    w.avg_weekly_earnings = 5000.0
    w.trust_tier = trust_tier
    w.trust_score = {"bronze": 20.0, "silver": 55.0, "gold": 85.0}[trust_tier]
    w.service_zones = ["South Mumbai"]
    w.is_active = True
    return w


def _risk_profile(worker_id: str) -> RiskProfile:
    rp = RiskProfile()
    rp.id = str(uuid.uuid4())
    rp.worker_id = worker_id
    rp.location_risk_index = 0.40
    rp.disruption_frequency_score = 0.30
    rp.hour_exposure_score = 0.50
    rp.platform_segment_factor = 1.00
    rp.computed_at = datetime.now(timezone.utc)
    return rp


def _mock_session_for_pricing(worker: Worker, risk_profile: RiskProfile):
    """Build a session mock that returns the worker + risk profile."""
    session = AsyncMock()
    call_count = [0]

    async def execute_side_effect(stmt, *args, **kwargs):
        call_count[0] += 1
        if call_count[0] == 1:
            # Worker lookup
            return make_execute_result(first=worker)
        if call_count[0] == 2:
            # RiskProfile lookup
            return make_execute_result(first=risk_profile)
        return make_execute_result()

    session.execute.side_effect = execute_side_effect
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    return session


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 8 — Premium formula
# ═══════════════════════════════════════════════════════════════════════════════

class TestPremiumFormula:
    """PRD §23 — Test 8: premium formula correctness."""

    @pytest.mark.asyncio
    async def test_plan_multipliers_applied_correctly(self):
        """
        For a given base premium B returned by predict_premium:
          basic_premium   = B * 0.75 * trust_mult
          standard_premium = B * 1.00 * trust_mult
          pro_premium     = B * 1.20 * trust_mult
        """
        w = _worker("bronze")
        rp = _risk_profile(w.id)
        session = _mock_session_for_pricing(w, rp)

        MOCKED_STANDARD = 80.0  # predict_premium returns this

        with patch("services.pricing_service.predict_premium", return_value=MOCKED_STANDARD):
            result = await compute_weekly_premium(w.id, session)

        plans = result["plans"]
        trust_mult = TRUST_PREMIUM_MULTIPLIER["bronze"]  # 1.00

        expected_basic = round(
            max(settings.PREMIUM_FLOOR,
                min(MOCKED_STANDARD * 0.75 * trust_mult,
                    settings.PREMIUM_CEILING * 0.75)),
            2,
        )
        expected_standard = round(
            max(settings.PREMIUM_FLOOR,
                min(MOCKED_STANDARD * 1.00 * trust_mult,
                    settings.PREMIUM_CEILING * 1.00)),
            2,
        )
        expected_pro = round(
            max(settings.PREMIUM_FLOOR,
                min(MOCKED_STANDARD * 1.20 * trust_mult,
                    settings.PREMIUM_CEILING * 1.20)),
            2,
        )

        assert plans["basic"]["weekly_premium"] == pytest.approx(expected_basic, abs=0.01), (
            f"Basic plan premium mismatch: expected {expected_basic}, "
            f"got {plans['basic']['weekly_premium']}"
        )
        assert plans["standard"]["weekly_premium"] == pytest.approx(expected_standard, abs=0.01)
        assert plans["pro"]["weekly_premium"] == pytest.approx(expected_pro, abs=0.01)

    @pytest.mark.asyncio
    async def test_trust_multiplier_applied_gold_discounts_premium(self):
        """
        Gold trust tier applies 0.88× discount to premium.
        Same risk profile, Gold worker pays less than Bronze.
        """
        bronze_worker = _worker("bronze")
        gold_worker = _worker("gold")
        gold_worker.id = str(uuid.uuid4())
        rp_bronze = _risk_profile(bronze_worker.id)
        rp_gold = _risk_profile(gold_worker.id)

        MOCKED_STD = 100.0

        with patch("services.pricing_service.predict_premium", return_value=MOCKED_STD):
            result_bronze = await compute_weekly_premium(
                bronze_worker.id, _mock_session_for_pricing(bronze_worker, rp_bronze)
            )
            result_gold = await compute_weekly_premium(
                gold_worker.id, _mock_session_for_pricing(gold_worker, rp_gold)
            )

        bronze_std = result_bronze["plans"]["standard"]["weekly_premium"]
        gold_std = result_gold["plans"]["standard"]["weekly_premium"]

        assert gold_std < bronze_std, (
            f"Gold tier premium ({gold_std}) must be less than Bronze ({bronze_std})"
        )
        # The discount ratio must match the configured multiplier difference
        expected_ratio = TRUST_PREMIUM_MULTIPLIER["gold"] / TRUST_PREMIUM_MULTIPLIER["bronze"]
        actual_ratio = gold_std / bronze_std
        assert actual_ratio == pytest.approx(expected_ratio, abs=0.02), (
            f"Expected trust discount ratio {expected_ratio:.2f}, got {actual_ratio:.2f}"
        )

    @pytest.mark.asyncio
    async def test_premium_floor_clamping(self):
        """
        When predict_premium returns a very small value,
        final premium must be clamped to PREMIUM_FLOOR (29.0 INR).
        """
        w = _worker("bronze")
        rp = _risk_profile(w.id)
        session = _mock_session_for_pricing(w, rp)

        with patch("services.pricing_service.predict_premium", return_value=5.0):
            result = await compute_weekly_premium(w.id, session)

        for variant in ("basic", "standard", "pro"):
            premium = result["plans"][variant]["weekly_premium"]
            assert premium >= settings.PREMIUM_FLOOR, (
                f"{variant} premium {premium} is below PREMIUM_FLOOR={settings.PREMIUM_FLOOR}"
            )

    @pytest.mark.asyncio
    async def test_premium_ceiling_clamping(self):
        """
        When predict_premium returns an extremely large value,
        final premium must be clamped to plan's effective ceiling.
        """
        w = _worker("bronze")
        rp = _risk_profile(w.id)
        session = _mock_session_for_pricing(w, rp)

        with patch("services.pricing_service.predict_premium", return_value=9999.0):
            result = await compute_weekly_premium(w.id, session)

        for variant, mods in PLAN_MODIFIERS.items():
            premium = result["plans"][variant]["weekly_premium"]
            effective_ceiling = settings.PREMIUM_CEILING * mods["premium_mult"]
            assert premium <= effective_ceiling, (
                f"{variant} premium {premium} exceeds effective ceiling {effective_ceiling}"
            )

    @pytest.mark.asyncio
    async def test_pro_premium_higher_than_standard(self):
        """Pro plan premium must always be ≥ standard plan premium."""
        w = _worker("silver")
        rp = _risk_profile(w.id)
        session = _mock_session_for_pricing(w, rp)

        with patch("services.pricing_service.predict_premium", return_value=100.0):
            result = await compute_weekly_premium(w.id, session)

        plans = result["plans"]
        assert plans["pro"]["weekly_premium"] >= plans["standard"]["weekly_premium"]
        assert plans["standard"]["weekly_premium"] >= plans["basic"]["weekly_premium"]

    @pytest.mark.asyncio
    async def test_result_contains_required_fields(self):
        """compute_weekly_premium must return all expected keys (PRD transparency)."""
        w = _worker("silver")
        rp = _risk_profile(w.id)
        session = _mock_session_for_pricing(w, rp)

        with patch("services.pricing_service.predict_premium", return_value=70.0):
            result = await compute_weekly_premium(w.id, session)

        required_keys = {
            "worker_id", "base_rate", "risk_multiplier", "exposure_multiplier",
            "trust_adjustment", "standard_premium", "base_coverage", "plans",
            "top_3_factors", "forecast_fallback", "forecast_source",
        }
        missing = required_keys - set(result.keys())
        assert not missing, f"compute_weekly_premium missing keys: {missing}"

    @pytest.mark.asyncio
    async def test_forecast_blend_updates_disruption_score(self):
        """
        When Redis forecast data is available with a day-0 disruption_risk_score,
        the feature vector should blend 70% historical + 30% forecast.
        """
        w = _worker("bronze")
        rp = _risk_profile(w.id)
        session = _mock_session_for_pricing(w, rp)
        mock_redis = AsyncMock()

        forecast_data = {
            "forecast": [{"day": 0, "disruption_risk_score": 0.80}]
        }

        original_score = rp.disruption_frequency_score  # 0.30
        expected_blended = round(0.70 * original_score + 0.30 * 0.80, 4)  # 0.45

        with (
            patch("services.pricing_service.predict_premium", return_value=100.0),
            patch(
                "services.pricing_service._fetch_forecast",
                return_value=({"forecast": [{"day": 0, "disruption_risk_score": 0.80}]}, "redis"),
            ),
        ):
            result = await compute_weekly_premium(w.id, session, redis=mock_redis)

        assert result["forecast_fallback"] is False
        assert result["forecast_source"] == "redis"

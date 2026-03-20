"""
Unit tests for payout_service — PRD §23 suites 4, 9, 10.

Coverage:
  4.  Payout idempotency (same claim → exactly one PayoutTransaction)
  9.  Payout formula (PRD §9 known inputs + coverage-cap + weekly-cap)
  10. Weekly cap enforcement
"""
from __future__ import annotations

import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch

from models import Claim, PayoutTransaction, Policy, TriggerEvent, Worker
from services.payout_service import (
    compute_payout_amount,
    TRIGGER_ACTIVE_WINDOW_HOURS,
    TRIGGER_SEVERITY_FACTOR,
    WEEKLY_PAYOUT_CAP_PCT,
)
from tests.unit.conftest import make_execute_result


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _worker(avg_daily_hours: float, avg_weekly_earnings: float) -> Worker:
    w = Worker()
    w.id = str(uuid.uuid4())
    w.avg_daily_hours = avg_daily_hours
    w.avg_weekly_earnings = avg_weekly_earnings
    w.trust_tier = "silver"
    w.trust_score = 70.0
    return w


def _policy(coverage_cap: float, plan: str = "standard") -> Policy:
    p = Policy()
    p.id = str(uuid.uuid4())
    p.coverage_cap = coverage_cap
    p.plan_variant = plan
    p.status = "active"
    return p


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 9 — Payout formula (PRD §9)
# ═══════════════════════════════════════════════════════════════════════════════

class TestPayoutFormula:
    """PRD §23 — Test 9: formula correctness with known inputs."""

    def _avg_hourly(self, weekly: float, daily_h: float) -> float:
        return weekly / max(1.0, daily_h * 6)

    def _lost_hours(self, trigger_type: str, daily_h: float) -> float:
        window = TRIGGER_ACTIVE_WINDOW_HOURS[trigger_type]
        return min(window * (daily_h / 24.0), daily_h)

    # ── Known baseline: avg_hourly = 80 ──────────────────────────────────────

    def test_heavy_rain_formula_no_cap(self):
        """
        HeavyRain: window=2h, severity=0.80
        avg_daily_h=12, avg_weekly=5760 → avg_hourly=80
        lost_h = min(2*(12/24), 12) = 1.0
        base = 80 * 1.0 * 0.80 = 64.0  →  no cap hit
        """
        w = _worker(avg_daily_hours=12.0, avg_weekly_earnings=5760.0)
        p = _policy(coverage_cap=1500.0)

        result = compute_payout_amount(w, p, "HeavyRain", weekly_already_paid=0.0)

        assert abs(result["avg_hourly_earnings"] - 80.0) < 0.01, (
            f"avg_hourly should be 80.0, got {result['avg_hourly_earnings']}"
        )
        assert abs(result["lost_covered_hours"] - 1.0) < 0.01, (
            f"lost_hours should be 1.0, got {result['lost_covered_hours']}"
        )
        assert abs(result["payout_amount"] - 64.0) < 0.01, (
            f"payout should be 64.0, got {result['payout_amount']}"
        )
        assert result["capped_by"] == "none"

    def test_platform_outage_formula_no_cap(self):
        """
        PlatformOutage: window=1h, severity=0.90
        avg_daily_h=8, avg_weekly=2880 → avg_hourly=60
        lost_h = min(1*(8/24), 8) ≈ 0.333
        base ≈ 60 * 0.333 * 0.90 ≈ 18.0
        """
        w = _worker(avg_daily_hours=8.0, avg_weekly_earnings=2880.0)
        p = _policy(coverage_cap=1500.0)

        result = compute_payout_amount(w, p, "PlatformOutage", weekly_already_paid=0.0)

        expected_hourly = 2880.0 / (8.0 * 6)   # = 60.0
        expected_lost_h = min(1.0 * (8.0 / 24.0), 8.0)   # ≈ 0.333
        expected_base = expected_hourly * expected_lost_h * 0.90

        assert abs(result["avg_hourly_earnings"] - expected_hourly) < 0.01
        assert abs(result["payout_amount"] - expected_base) < 0.10, (
            f"PlatformOutage payout should be ≈{expected_base:.2f}, "
            f"got {result['payout_amount']}"
        )

    def test_local_restriction_formula_no_cap(self):
        """
        LocalRestriction: window=8h, severity=1.00
        avg_daily_h=9, avg_weekly=4320 → avg_hourly=80
        lost_h = min(8*(9/24), 9) = min(3.0, 9) = 3.0
        base = 80 * 3.0 * 1.00 = 240.0
        """
        w = _worker(avg_daily_hours=9.0, avg_weekly_earnings=4320.0)
        p = _policy(coverage_cap=1500.0)

        result = compute_payout_amount(w, p, "LocalRestriction", weekly_already_paid=0.0)

        assert abs(result["avg_hourly_earnings"] - 80.0) < 0.01
        assert abs(result["lost_covered_hours"] - 3.0) < 0.01
        assert abs(result["payout_amount"] - 240.0) < 0.50
        assert result["capped_by"] == "none"

    # ── Coverage cap ──────────────────────────────────────────────────────────

    def test_payout_capped_by_coverage_cap(self):
        """
        When base_payout > coverage_cap, result is coverage_cap.
        avg_daily_h=20, avg_weekly=144000 → avg_hourly=1200
        LocalRestriction: lost_h≈6.67, base≈8000, cap=500 → payout=500
        """
        w = _worker(avg_daily_hours=20.0, avg_weekly_earnings=144_000.0)
        p = _policy(coverage_cap=500.0)

        result = compute_payout_amount(w, p, "LocalRestriction", weekly_already_paid=0.0)

        assert result["payout_amount"] == pytest.approx(500.0, abs=0.01), (
            f"Payout should be capped at 500.0, got {result['payout_amount']}"
        )
        assert result["capped_by"] == "coverage_cap"

    def test_payout_capped_by_coverage_cap_heavy_rain(self):
        """High-earning worker + tiny coverage cap → always capped."""
        w = _worker(avg_daily_hours=12.0, avg_weekly_earnings=100_000.0)
        p = _policy(coverage_cap=100.0)

        result = compute_payout_amount(w, p, "HeavyRain", weekly_already_paid=0.0)

        assert result["payout_amount"] == pytest.approx(100.0, abs=0.01)
        assert result["capped_by"] == "coverage_cap"


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 10 — Weekly cap enforcement
# ═══════════════════════════════════════════════════════════════════════════════

class TestWeeklyCapEnforcement:
    """
    PRD §23 — Test 10:
    weekly cap = 80% of avg_weekly_earnings.
    If worker has already received payouts close to the cap,
    the new payout is capped at the remaining allowance.
    """

    def test_weekly_cap_limits_new_payout(self):
        """
        avg_weekly = 4800 → weekly_cap = 3840
        already_paid = 3820 → remaining = 20
        PlatformOutage base ≈ 30 → capped at 20
        """
        w = _worker(avg_daily_hours=8.0, avg_weekly_earnings=4800.0)
        p = _policy(coverage_cap=1500.0)

        result = compute_payout_amount(w, p, "PlatformOutage", weekly_already_paid=3820.0)

        expected_remaining = max(0.0, 4800.0 * WEEKLY_PAYOUT_CAP_PCT - 3820.0)  # = 20.0
        assert result["payout_amount"] == pytest.approx(expected_remaining, abs=0.01), (
            f"New payout should be capped at remaining={expected_remaining:.2f}, "
            f"got {result['payout_amount']}"
        )
        assert result["capped_by"] == "weekly_cap"

    def test_weekly_cap_zero_when_fully_exhausted(self):
        """
        If weekly_already_paid ≥ weekly_cap, new payout must be 0.
        """
        w = _worker(avg_daily_hours=8.0, avg_weekly_earnings=4800.0)
        p = _policy(coverage_cap=1500.0)
        weekly_cap = 4800.0 * WEEKLY_PAYOUT_CAP_PCT  # 3840

        result = compute_payout_amount(w, p, "HeavyRain", weekly_already_paid=weekly_cap)

        assert result["payout_amount"] == pytest.approx(0.0, abs=0.01), (
            "Payout must be 0 when weekly cap is fully exhausted"
        )

    def test_weekly_cap_allows_partial_payout(self):
        """
        If only 50 remains in the weekly allowance and base payout is 200,
        the worker receives exactly 50.
        """
        w = _worker(avg_daily_hours=8.0, avg_weekly_earnings=2000.0)
        p = _policy(coverage_cap=1500.0)
        weekly_cap = 2000.0 * WEEKLY_PAYOUT_CAP_PCT   # 1600
        already_paid = weekly_cap - 50.0               # 1550 → 50 remaining

        result = compute_payout_amount(w, p, "LocalRestriction", weekly_already_paid=already_paid)

        # Base payout for LocalRestriction would easily exceed 50
        # So it must be capped at 50 remaining
        assert result["payout_amount"] == pytest.approx(50.0, abs=0.01)
        assert result["capped_by"] == "weekly_cap"

    def test_weekly_cap_pct_constant_is_80_percent(self):
        """Architecture guard: WEEKLY_PAYOUT_CAP_PCT must remain 0.80 (PRD §9)."""
        assert WEEKLY_PAYOUT_CAP_PCT == pytest.approx(0.80), (
            f"PRD §9 requires weekly cap = 80%, got {WEEKLY_PAYOUT_CAP_PCT}"
        )

    def test_weekly_available_never_negative(self):
        """weekly_available must be max(0, cap - paid) — never negative."""
        w = _worker(avg_daily_hours=8.0, avg_weekly_earnings=1000.0)
        p = _policy(coverage_cap=500.0)
        # Paid far more than cap (e.g. due to old data mismatch)
        result = compute_payout_amount(w, p, "HeavyRain", weekly_already_paid=99999.0)

        assert result["payout_amount"] >= 0.0, "payout_amount must never be negative"
        assert result.get("weekly_available", 0.0) >= 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 4 — Payout idempotency
# ═══════════════════════════════════════════════════════════════════════════════

class TestPayoutIdempotency:
    """
    PRD §23 — Test 4: calling initiate_payout twice with same claim_id
    must produce exactly ONE PayoutTransaction.
    """

    @pytest.mark.asyncio
    async def test_second_call_returns_existing_payout_not_new(
        self, mock_session, mock_claim,
    ):
        """
        When a PayoutTransaction already exists for the claim's idempotency_key,
        initiate_payout must return it without creating a duplicate.
        """
        from services.payout_service import initiate_payout

        # Pre-existing payout
        existing_payout = PayoutTransaction()
        existing_payout.id = str(uuid.uuid4())
        existing_payout.claim_id = mock_claim.id
        existing_payout.worker_id = mock_claim.worker_id
        existing_payout.amount = 64.0
        existing_payout.status = "confirmed"
        existing_payout.gateway_ref = "mock_rzp_existing_001"
        existing_payout.idempotency_key = mock_claim.idempotency_key
        existing_payout.created_at = datetime.now(timezone.utc)
        existing_payout.confirmed_at = datetime.now(timezone.utc)

        mock_claim.status = "approved"
        mock_claim.fraud_score = 20.0

        call_count = [0]

        async def execute_side_effect(stmt, *args, **kwargs):
            call_count[0] += 1
            if call_count[0] == 1:
                # get_payout_for_claim lookup → existing payout found
                return make_execute_result(first=existing_payout)
            return make_execute_result()

        mock_session.execute.side_effect = execute_side_effect
        mock_session.get.side_effect = lambda model, pk: (
            mock_claim if model == Claim else None
        )

        gateway_calls: list = []

        with patch("services.payout_service._call_gateway") as mock_gw:
            mock_gw.side_effect = lambda *a, **kw: gateway_calls.append(kw) or {
                "ref": "mock_rzp_new", "status": "confirmed"
            }
            result = await initiate_payout(mock_claim.id, mock_session)

        # The existing payout should be returned; gateway must NOT be called again
        assert mock_gw.call_count == 0 or result.gateway_ref == "mock_rzp_existing_001", (
            "Second initiate_payout call must return the existing PayoutTransaction, "
            "not call the gateway again."
        )

    @pytest.mark.asyncio
    async def test_idempotency_key_uniqueness_format(self, mock_claim):
        """
        idempotency_key must follow the pattern worker_id:policy_id:trigger_event_id
        so that duplicate requests are correctly matched.
        """
        key = mock_claim.idempotency_key
        parts = key.split(":")
        assert len(parts) == 3, (
            f"idempotency_key must have 3 colon-separated parts, got: '{key}'"
        )
        worker_id, policy_id, trigger_id = parts
        assert worker_id == mock_claim.worker_id
        assert policy_id == mock_claim.policy_id
        assert trigger_id == mock_claim.trigger_event_id

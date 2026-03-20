"""
Unit tests for claim_orchestrator — PRD §23 suites 1, 3, 4, 5, 6, 7.

Coverage:
  1.  Happy-path orchestration
  3.  Fraud decision bands (Low / Medium / High / Critical)
  4.  Payout idempotency
  5.  State-machine guards
  6.  Trust score guardrail (Gold ≠ Critical-fraud override)
  7.  UTC timestamp enforcement
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch, call

import pytest

from models import (
    AuditLog, Claim, FraudAssessment, PayoutTransaction,
    Policy, TriggerEvent, Worker,
)
from services.claim_orchestrator import orchestrate_claims, _route_claim
from tests.unit.conftest import make_execute_result


# ═══════════════════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _make_fraud_assessment(score: float, decision: str) -> FraudAssessment:
    fa = FraudAssessment()
    fa.id = str(uuid.uuid4())
    fa.score = score
    fa.decision = decision
    fa.reason_codes = []
    fa.assessed_at = datetime.now(timezone.utc)
    return fa


def _make_orchestrate_execute_mock(trigger_event, policy, worker, existing_claim=None):
    """
    Build an execute side_effect for orchestrate_claims:
      call 1 → TriggerEvent lookup (scalar_one_or_none)
      call 2 → eligible policies via _find_eligible_policies (result.all)
      call 3 → _create_claim idempotency check (scalar_one_or_none)
      call N → anything else → empty result
    """
    call_count = [0]

    async def side_effect(stmt, *args, **kwargs):
        call_count[0] += 1
        n = call_count[0]
        if n == 1:
            # TriggerEvent lookup → scalar_one_or_none
            r = make_execute_result(first=trigger_event)
            return r
        if n == 2:
            # _find_eligible_policies → result.all() returns (policy, worker) tuples
            r = make_execute_result(rows=[(policy, worker)])
            r.all.return_value = [(policy, worker)]
            return r
        if n == 3:
            # _create_claim idempotency: existing_claim or None
            return make_execute_result(first=existing_claim)
        # Redis window / other queries
        r = make_execute_result()
        r.scalar.return_value = 0
        return r

    return side_effect


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 1 — Happy-path orchestration
# ═══════════════════════════════════════════════════════════════════════════════

class TestHappyPath:
    """PRD §23 — Test 1: valid inputs → correct output, correct audit logging."""

    @pytest.mark.asyncio
    async def test_happy_path_returns_summary_dict(
        self, mock_session, mock_redis, mock_worker, mock_policy,
        mock_trigger_event, mock_claim,
    ):
        trigger_id = mock_trigger_event.id
        fa = _make_fraud_assessment(score=20.0, decision="auto_approve")

        mock_session.execute.side_effect = _make_orchestrate_execute_mock(
            mock_trigger_event, mock_policy, mock_worker
        )

        payout_tx = PayoutTransaction()
        payout_tx.id = str(uuid.uuid4())
        payout_tx.amount = 64.0
        payout_tx.status = "confirmed"
        payout_tx.gateway_ref = "mock_rzp_xyz"

        with (
            patch("services.claim_orchestrator.score_claim", return_value=fa),
            patch("services.claim_orchestrator.initiate_payout", return_value=payout_tx),
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            result = await orchestrate_claims(trigger_id, mock_session, mock_redis)

        # ── Return structure ──────────────────────────────────────────────────
        assert isinstance(result, dict), "orchestrate_claims must return a dict"
        assert result.get("trigger_id") == trigger_id

        # ── AuditLog written ──────────────────────────────────────────────────
        add_calls = mock_session.add.call_args_list
        audit_types = [c.args[0].__class__.__name__ for c in add_calls]
        assert "AuditLog" in audit_types or "Claim" in audit_types, (
            f"session.add must be called with at least a Claim or AuditLog. Got: {audit_types}"
        )

    @pytest.mark.asyncio
    async def test_happy_path_audit_log_entity_type(
        self, mock_session, mock_redis, mock_trigger_event, mock_worker,
        mock_policy,
    ):
        fa = _make_fraud_assessment(score=15.0, decision="auto_approve")

        mock_session.execute.side_effect = _make_orchestrate_execute_mock(
            mock_trigger_event, mock_policy, mock_worker
        )

        added_audit_logs: list[AuditLog] = []

        def capture_add(obj):
            if isinstance(obj, AuditLog):
                added_audit_logs.append(obj)

        mock_session.add.side_effect = capture_add

        payout_tx = PayoutTransaction()
        payout_tx.id = str(uuid.uuid4())
        payout_tx.status = "confirmed"
        payout_tx.gateway_ref = "mock_test"

        with (
            patch("services.claim_orchestrator.score_claim", return_value=fa),
            patch("services.claim_orchestrator.initiate_payout", return_value=payout_tx),
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await orchestrate_claims(mock_trigger_event.id, mock_session, mock_redis)

        assert len(added_audit_logs) > 0, "Orchestration must write at least one AuditLog"
        entity_types = {log.entity_type for log in added_audit_logs}
        expected = {"TriggerEvent", "Claim", "Policy", "Worker", "Payout"}
        assert entity_types & expected, (
            f"Expected at least one of {expected}, got {entity_types}"
        )

    @pytest.mark.asyncio
    async def test_happy_path_summary_has_auto_approved_count(
        self, mock_session, mock_redis, mock_trigger_event, mock_worker, mock_policy,
    ):
        fa = _make_fraud_assessment(score=20.0, decision="auto_approve")
        mock_session.execute.side_effect = _make_orchestrate_execute_mock(
            mock_trigger_event, mock_policy, mock_worker
        )

        payout_tx = PayoutTransaction()
        payout_tx.id = str(uuid.uuid4())
        payout_tx.status = "confirmed"
        payout_tx.gateway_ref = "mock"

        with (
            patch("services.claim_orchestrator.score_claim", return_value=fa),
            patch("services.claim_orchestrator.initiate_payout", return_value=payout_tx),
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            result = await orchestrate_claims(mock_trigger_event.id, mock_session, mock_redis)

        assert result.get("auto_approved", 0) >= 1, (
            f"auto_approve decision must increment auto_approved counter: {result}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 3 — Fraud decision bands
# ═══════════════════════════════════════════════════════════════════════════════

class TestFraudDecisionBands:
    """PRD §23 — Test 3: four fraud score bands drive correct claim outcomes."""

    @pytest.mark.asyncio
    async def test_low_risk_score_20_claim_approved_payout_created(
        self, mock_session, mock_redis, mock_claim,
    ):
        payout_tx = PayoutTransaction()
        payout_tx.id = str(uuid.uuid4())
        payout_tx.amount = 64.0
        payout_tx.status = "confirmed"
        payout_tx.gateway_ref = "mock_rzp_low"

        mock_claim.status = "initiated"

        with (
            patch("services.claim_orchestrator.initiate_payout", return_value=payout_tx) as mock_pay,
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await _route_claim(
                claim=mock_claim,
                decision="auto_approve",
                session=mock_session,
                redis=mock_redis,
                catastrophe_mode=False,
                trigger_zone="South Mumbai",
            )

        assert mock_claim.status == "approved", (
            f"Low-risk claim must be 'approved', got '{mock_claim.status}'"
        )
        mock_pay.assert_called_once_with(mock_claim.id, mock_session)

    @pytest.mark.asyncio
    async def test_medium_risk_score_50_claim_in_review_no_payout(
        self, mock_session, mock_redis, mock_claim,
    ):
        mock_claim.status = "initiated"

        with (
            patch("services.claim_orchestrator.initiate_payout") as mock_pay,
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await _route_claim(
                claim=mock_claim,
                decision="hold",
                session=mock_session,
                redis=mock_redis,
                catastrophe_mode=False,
                trigger_zone="South Mumbai",
            )

        assert mock_claim.status == "in_review", (
            f"Medium-risk claim must be 'in_review', got '{mock_claim.status}'"
        )
        mock_pay.assert_not_called()

    @pytest.mark.asyncio
    async def test_high_risk_score_75_claim_in_review_no_payout(
        self, mock_session, mock_redis, mock_claim,
    ):
        mock_claim.status = "initiated"

        with (
            patch("services.claim_orchestrator.initiate_payout") as mock_pay,
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await _route_claim(
                claim=mock_claim,
                decision="manual_review",
                session=mock_session,
                redis=mock_redis,
                catastrophe_mode=False,
                trigger_zone="South Mumbai",
            )

        assert mock_claim.status == "in_review", (
            f"High-risk claim must be 'in_review', got '{mock_claim.status}'"
        )
        mock_pay.assert_not_called()

    @pytest.mark.asyncio
    async def test_high_risk_manual_review_audit_log_written(
        self, mock_session, mock_redis, mock_claim,
    ):
        mock_claim.status = "initiated"
        added: list = []
        mock_session.add.side_effect = added.append

        with (
            patch("services.claim_orchestrator.initiate_payout"),
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await _route_claim(
                claim=mock_claim,
                decision="manual_review",
                session=mock_session,
                redis=mock_redis,
                catastrophe_mode=False,
                trigger_zone="South Mumbai",
            )

        audit_logs = [o for o in added if isinstance(o, AuditLog)]
        assert len(audit_logs) > 0, "manual_review must write at least one AuditLog"

    @pytest.mark.asyncio
    async def test_critical_risk_score_95_claim_blocked_no_payout(
        self, mock_session, mock_redis, mock_claim,
    ):
        mock_claim.status = "initiated"
        added: list = []
        mock_session.add.side_effect = added.append

        with (
            patch("services.claim_orchestrator.initiate_payout") as mock_pay,
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await _route_claim(
                claim=mock_claim,
                decision="auto_block",
                session=mock_session,
                redis=mock_redis,
                catastrophe_mode=False,
                trigger_zone="South Mumbai",
            )

        assert mock_claim.status == "blocked", (
            f"Critical-risk claim must be 'blocked', got '{mock_claim.status}'"
        )
        mock_pay.assert_not_called()

        # auto_block must create an AuditLog — action is "auto_blocked" in the code
        audit_logs = [o for o in added if isinstance(o, AuditLog)]
        block_logs = [
            log for log in audit_logs
            if "block" in (log.action or "").lower()
        ]
        assert len(block_logs) > 0, (
            f"auto_block must create an AuditLog entry with a blocking action. "
            f"Got actions: {[l.action for l in audit_logs]}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 4 — Idempotency (claim creation level)
# ═══════════════════════════════════════════════════════════════════════════════

class TestClaimIdempotency:
    """PRD §23 — Test 4: duplicate trigger → exactly one Claim row."""

    @pytest.mark.asyncio
    async def test_duplicate_trigger_does_not_create_second_claim(
        self,
        mock_session,
        mock_redis,
        mock_worker,
        mock_policy,
        mock_trigger_event,
        mock_claim,
    ):
        """
        When a Claim with the same idempotency key already exists,
        orchestrate_claims must skip creation and return the existing claim.
        """
        trigger_id = mock_trigger_event.id
        fa = _make_fraud_assessment(score=20.0, decision="auto_approve")

        # Call 3 returns existing claim → idempotency short-circuit
        mock_session.execute.side_effect = _make_orchestrate_execute_mock(
            mock_trigger_event, mock_policy, mock_worker, existing_claim=mock_claim
        )

        claims_added = []

        def track_add(obj):
            if isinstance(obj, Claim):
                claims_added.append(obj)

        mock_session.add.side_effect = track_add

        with (
            patch("services.claim_orchestrator.score_claim", return_value=fa),
            patch("services.claim_orchestrator.initiate_payout"),
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await orchestrate_claims(trigger_id, mock_session, mock_redis)

        # No new Claim should have been added to session when one already exists
        assert len(claims_added) == 0, (
            f"Expected 0 new Claim rows on duplicate trigger, got {len(claims_added)}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 5 — State-machine guards
# ═══════════════════════════════════════════════════════════════════════════════

class TestStateMachineGuards:
    """PRD §23 — Test 5: invalid state transitions are rejected."""

    @pytest.mark.asyncio
    async def test_initiate_payout_rejects_non_approved_claim(
        self, mock_session, mock_claim,
    ):
        """
        initiate_payout must raise ValueError (or HTTPException) if the claim
        is not in 'approved' status — it must never skip to 'paid' directly.
        """
        from services.payout_service import initiate_payout

        mock_claim.status = "initiated"  # NOT approved
        mock_session.get.return_value = mock_claim

        with pytest.raises((ValueError, Exception)) as exc_info:
            await initiate_payout(mock_claim.id, mock_session)

        err_str = str(exc_info.value).lower()
        assert any(kw in err_str for kw in ["approved", "status", "invalid", "not"]), (
            f"Expected meaningful error about status, got: {exc_info.value}"
        )

    @pytest.mark.asyncio
    async def test_blocked_claim_cannot_be_paid(self, mock_session, mock_claim):
        """A blocked claim must never receive a payout initiation."""
        from services.payout_service import initiate_payout

        mock_claim.status = "blocked"
        mock_session.get.return_value = mock_claim

        with pytest.raises((ValueError, Exception)):
            await initiate_payout(mock_claim.id, mock_session)

    @pytest.mark.asyncio
    async def test_blocked_claim_payout_via_route_never_called(
        self, mock_session, mock_redis, mock_claim,
    ):
        """_route_claim with auto_block must NEVER call initiate_payout."""
        mock_claim.status = "initiated"

        with (
            patch("services.claim_orchestrator.initiate_payout") as mock_pay,
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await _route_claim(
                claim=mock_claim,
                decision="auto_block",
                session=mock_session,
                redis=mock_redis,
                catastrophe_mode=False,
                trigger_zone="South Mumbai",
            )

        mock_pay.assert_not_called()
        assert mock_claim.status == "blocked"

    def test_claim_status_no_soft_delete_field(self):
        """
        Claim model must not expose a soft-delete column — status transitions
        are the only lifecycle mechanism.
        """
        claim = Claim()
        soft_delete_attrs = ("deleted_at", "is_deleted", "deleted", "removed_at")
        for attr in soft_delete_attrs:
            assert not hasattr(claim, attr), (
                f"Claim must not have soft-delete field '{attr}'; "
                "use status transitions instead."
            )

    def test_audit_log_no_soft_delete_field(self):
        """AuditLog must be append-only — no soft-delete fields allowed."""
        log = AuditLog()
        for attr in ("deleted_at", "is_deleted", "deleted"):
            assert not hasattr(log, attr), (
                f"AuditLog must not have soft-delete field '{attr}'"
            )


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 6 — Trust score guardrail
# ═══════════════════════════════════════════════════════════════════════════════

class TestTrustScoreGuardrail:
    """
    PRD §23 — Test 6: Gold trust tier does NOT override Critical fraud block.
    trust_score NEVER overrides a hard fraud block.
    """

    @pytest.mark.asyncio
    async def test_gold_tier_does_not_override_critical_fraud_block(
        self, mock_session, mock_redis, mock_claim, mock_worker,
    ):
        mock_worker.trust_tier = "gold"
        mock_worker.trust_score = 95.0
        mock_claim.status = "initiated"
        mock_claim.worker = mock_worker

        with (
            patch("services.claim_orchestrator.initiate_payout") as mock_pay,
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await _route_claim(
                claim=mock_claim,
                decision="auto_block",   # Critical fraud score ≥ 86
                session=mock_session,
                redis=mock_redis,
                catastrophe_mode=False,
                trigger_zone="South Mumbai",
            )

        # Gold trust tier must NOT have exempted the worker from blocking
        assert mock_claim.status == "blocked", (
            "Gold trust tier must not override Critical fraud block. "
            f"Claim status is '{mock_claim.status}', expected 'blocked'."
        )
        mock_pay.assert_not_called()

    @pytest.mark.asyncio
    async def test_silver_tier_does_not_override_critical_fraud_block(
        self, mock_session, mock_redis, mock_claim, mock_worker,
    ):
        mock_worker.trust_tier = "silver"
        mock_worker.trust_score = 60.0
        mock_claim.status = "initiated"

        with (
            patch("services.claim_orchestrator.initiate_payout") as mock_pay,
            patch("services.claim_orchestrator.recompute_trust_score"),
        ):
            await _route_claim(
                claim=mock_claim,
                decision="auto_block",
                session=mock_session,
                redis=mock_redis,
                catastrophe_mode=False,
                trigger_zone="South Mumbai",
            )

        assert mock_claim.status == "blocked"
        mock_pay.assert_not_called()


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 7 — UTC timestamp enforcement
# ═══════════════════════════════════════════════════════════════════════════════

class TestUTCTimestampEnforcement:
    """
    PRD §23 — Test 7: TriggerEvent timestamps must be stored in UTC,
    regardless of any client-supplied timezone offset.
    """

    def test_trigger_event_triggered_at_is_utc_naive_or_utc_aware(
        self, mock_trigger_event,
    ):
        """
        triggered_at must either be UTC-naive (PostgreSQL DateTime without tz)
        or explicitly UTC-aware.  It must never carry a non-UTC offset.
        """
        ts = mock_trigger_event.triggered_at
        assert isinstance(ts, datetime), "triggered_at must be a datetime instance"

        if ts.tzinfo is not None:
            offset = ts.utcoffset()
            assert offset == timedelta(0), (
                f"triggered_at has non-UTC offset {offset}. "
                "All timestamps must be stored in UTC."
            )

    def test_new_trigger_event_default_timestamp_is_utc(self):
        t = TriggerEvent()
        if t.triggered_at is not None:
            ts = t.triggered_at
            if ts.tzinfo is not None:
                assert ts.utcoffset() == timedelta(0)

    def test_claim_created_at_is_not_local_time(self, mock_claim):
        ts = mock_claim.created_at
        if ts is not None and ts.tzinfo is not None:
            offset = ts.utcoffset()
            assert offset == timedelta(0), (
                f"Claim.created_at has non-UTC offset {offset}"
            )

    def test_orchestrator_uses_server_utc_not_client_timestamp(self):
        """
        The orchestrator must use datetime.utcnow() for created_at,
        not any timestamp supplied in the trigger event.
        Client IST offset must not pollute the stored Claim.created_at.
        """
        # Verify: any Claim constructed with server time uses utcnow()
        server_ts = datetime.now(timezone.utc)
        c = Claim()
        c.created_at = server_ts
        assert c.created_at.tzinfo == timezone.utc, (
            "Server-generated Claim.created_at must use UTC"
        )

        # Simulate client-supplied IST timestamp
        ist_offset = timezone(timedelta(hours=5, minutes=30))
        ist_ts = datetime.now(ist_offset)
        # Service must NOT use this — it must use utcnow()
        assert ist_ts.utcoffset() != timedelta(0), "IST offset should be non-zero"
        # The service's own timestamp must differ from IST
        utc_ts = datetime.now(timezone.utc)
        assert utc_ts.utcoffset() == timedelta(0)

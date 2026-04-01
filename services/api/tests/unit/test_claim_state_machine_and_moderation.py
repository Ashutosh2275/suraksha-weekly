from __future__ import annotations

from types import SimpleNamespace

import pytest

from services.claim_state_machine import ClaimStateMachine, ClaimStateMachineError
from services.moderation_router import ClaimModerationRouter


@pytest.mark.asyncio
async def test_claim_state_machine_valid_transition(monkeypatch) -> None:
    events = []

    async def _fake_log_event(**kwargs):
        events.append(kwargs)

    monkeypatch.setattr("services.claim_state_machine.log_event", _fake_log_event)

    claim = SimpleNamespace(id="c-1", status="INITIATED")
    machine = ClaimStateMachine()
    updated = await machine.transition(claim, "IN_REVIEW", actor_role="auto")

    assert updated.status == "IN_REVIEW"
    assert events[-1]["action"] == "state_transition"
    assert events[-1]["previous_state"]["status"] == "INITIATED"
    assert events[-1]["new_state"]["status"] == "IN_REVIEW"


@pytest.mark.asyncio
async def test_claim_state_machine_invalid_transition_raises(monkeypatch) -> None:
    events = []

    async def _fake_log_event(**kwargs):
        events.append(kwargs)

    monkeypatch.setattr("services.claim_state_machine.log_event", _fake_log_event)

    claim = SimpleNamespace(id="c-2", status="PAID")
    machine = ClaimStateMachine()

    with pytest.raises(ClaimStateMachineError) as exc:
        await machine.transition(claim, "APPROVED", actor_role="auto")

    assert exc.value.error_code == "INVALID_STATE_TRANSITION"
    assert events[-1]["action"] == "invalid_state_transition"


@pytest.mark.asyncio
async def test_moderation_router_low_auto_approves(monkeypatch) -> None:
    async def _fake_log_event(**kwargs):
        return None

    monkeypatch.setattr("services.claim_state_machine.log_event", _fake_log_event)

    claim = SimpleNamespace(id="c-low", status="INITIATED")
    assessment = SimpleNamespace(score=0.2, reason_codes=["clean_history"], decision="auto_approve")

    router = ClaimModerationRouter()
    await router.route(claim, assessment)

    assert claim.status == "APPROVED"
    assert claim.decision_trace["auto_approved"] is True
    assert claim.decision_trace["risk_tier"] == "LOW"


@pytest.mark.asyncio
async def test_moderation_router_medium_routes_to_review(monkeypatch) -> None:
    async def _fake_log_event(**kwargs):
        return None

    monkeypatch.setattr("services.claim_state_machine.log_event", _fake_log_event)

    claim = SimpleNamespace(id="c-med", status="INITIATED")
    assessment = SimpleNamespace(score=0.5, reason_codes=["velocity_spike"], decision="hold")

    router = ClaimModerationRouter()
    await router.route(claim, assessment, reviewer_id="rev-1")

    assert claim.status == "IN_REVIEW"
    assert claim.decision_trace["risk_tier"] == "MEDIUM"
    assert claim.payout_sla_minutes == 240
    assert claim.reviewer_queue == "reviewer_queue"


@pytest.mark.asyncio
async def test_moderation_router_critical_auto_rejects(monkeypatch) -> None:
    async def _fake_log_event(**kwargs):
        return None

    monkeypatch.setattr("services.claim_state_machine.log_event", _fake_log_event)

    claim = SimpleNamespace(id="c-critical", status="IN_REVIEW")
    assessment = SimpleNamespace(
        score=0.91,
        reason_codes=["identity_mismatch", "impossible_travel"],
        decision="auto_block",
    )

    router = ClaimModerationRouter()
    await router.route(claim, assessment)

    assert claim.status == "REJECTED"
    assert claim.decision_trace["risk_tier"] == "CRITICAL"
    assert claim.decision_trace["auto_approved"] is False

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from core.auth_dependencies import CurrentUser
from core.roles import Role
from routers.review_queue import (
    ReviewDecisionRequest,
    _build_queue_item,
    _ensure_decision_authorized,
    _process_review_decision,
    _queue_sort_key,
    _sla_deadline,
    _sort_and_page,
)


class _FakeAuditLog:
    def __init__(self) -> None:
        self.calls: list[dict] = []


class _FakeSession:
    def __init__(self, claim: object) -> None:
        self.claim = claim
        self.committed = False
        self.refreshed: list[object] = []
        self._execute_count = 0

    async def execute(self, query):  # noqa: ANN001
        self._execute_count += 1
        if self._execute_count == 1:
            return SimpleNamespace(scalar_one_or_none=lambda: self.claim)
        return SimpleNamespace(scalars=lambda: SimpleNamespace(all=lambda: []), scalar_one_or_none=lambda: None)

    async def commit(self) -> None:
        self.committed = True

    async def refresh(self, obj) -> None:  # noqa: ANN001
        self.refreshed.append(obj)


class _FakeRedis:
    def __init__(self) -> None:
        self.messages: list[tuple[str, str]] = []

    async def publish(self, channel: str, message: str) -> None:
        self.messages.append((channel, message))


@dataclass
class _Assessment:
    id: str
    claim_id: str
    score: float
    decision: str = "manual_review"
    reason_codes: list[str] = None  # type: ignore[assignment]
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    created_at: datetime = datetime(2026, 4, 2, 6, 0, tzinfo=timezone.utc)
    updated_at: datetime = datetime(2026, 4, 2, 6, 0, tzinfo=timezone.utc)

    def __post_init__(self) -> None:
        if self.reason_codes is None:
            self.reason_codes = []


def _make_claim(*, claim_id: str, score: float, reason_codes: list[str], initiated_at: datetime) -> SimpleNamespace:
    worker = SimpleNamespace(
        id="w-1",
        name="Worker One",
        phone="+919999999999",
        city="Bengaluru",
        service_zones=["zone_1"],
        trust_score=91.2,
        trust_tier="gold",
    )
    policy = SimpleNamespace(
        id="p-1",
        worker_id="w-1",
        plan_variant="pro",
        status="active",
        weekly_premium=189.0,
        coverage_cap=3000.0,
        start_date=initiated_at - timedelta(days=1),
        end_date=initiated_at + timedelta(days=6),
        renewal_count=0,
        waiting_period_until=None,
        created_at=initiated_at - timedelta(days=1),
        updated_at=initiated_at - timedelta(days=1),
    )
    trigger = SimpleNamespace(
        id="t-1",
        type="HeavyRain",
        zone="zone_1",
        value=42.0,
        threshold=15.0,
        confidence_score=0.94,
        sources=["openweather"],
        status="active",
        triggered_at=initiated_at,
        audit_snapshot={"city": "Bengaluru"},
        created_at=initiated_at,
    )
    assessment = _Assessment(
        id="fa-1",
        claim_id=claim_id,
        score=score,
        reason_codes=reason_codes,
    )
    return SimpleNamespace(
        id=claim_id,
        status="in_review",
        worker=worker,
        policy=policy,
        trigger_event=trigger,
        fraud_assessment=assessment,
        fraud_score=score,
        fraud_reason_tags=reason_codes,
        payout_amount=0.0,
        initiated_at=initiated_at,
        resolved_at=None,
        decision_trace={},
        updated_at=initiated_at,
        rejection_reason=None,
        worker_id=worker.id,
        policy_id=policy.id,
    )


@pytest.mark.asyncio
async def test_sorting_prioritizes_critical_and_sla() -> None:
    now = datetime(2026, 4, 2, 8, 0, tzinfo=timezone.utc)
    items = [
        _build_queue_item(_make_claim(claim_id="c-med", score=52, reason_codes=["velocity"], initiated_at=now - timedelta(hours=1))),
        _build_queue_item(_make_claim(claim_id="c-critical", score=96, reason_codes=["impossible_travel"], initiated_at=now - timedelta(minutes=5))),
        _build_queue_item(_make_claim(claim_id="c-low", score=18, reason_codes=[], initiated_at=now - timedelta(minutes=20))),
    ]

    ordered, total = _sort_and_page(items, page=1, limit=10)

    assert total == 3
    assert [item.claim.id for item in ordered] == ["c-critical", "c-med", "c-low"]
    assert _sla_deadline(items[0].claim.initiated_at, items[0].risk_tier) == items[0].sla_deadline


def test_review_decision_role_validation() -> None:
    low_user = CurrentUser(user_id="u-1", phone="+91", role=Role.REVIEWER)
    high_user = CurrentUser(user_id="u-2", phone="+91", role=Role.REVIEWER)

    _ensure_decision_authorized(low_user, "LOW")
    with pytest.raises(Exception):
        _ensure_decision_authorized(high_user, "HIGH")


@pytest.mark.asyncio
async def test_approve_decision_updates_assessment_and_emits_event(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 8, 0, tzinfo=timezone.utc)
    claim = _make_claim(claim_id="c-approve", score=48, reason_codes=["manual_review"], initiated_at=now - timedelta(hours=2))
    session = _FakeSession(claim)
    redis = _FakeRedis()
    user = CurrentUser(user_id="reviewer-1", phone="+91", role=Role.REVIEWER)
    events: list[dict] = []

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    monkeypatch.setattr("routers.review_queue.log_event", _fake_log_event)

    detail = await _process_review_decision(
        session=session,
        redis=redis,
        claim=claim,
        current_user=user,
        decision="APPROVE",
        reviewer_notes="Looks good after manual verification.",
        now=now,
    )

    assert claim.status == "approved"
    assert claim.rejection_reason is None
    assert claim.fraud_assessment.reviewed_by == "reviewer-1"
    assert claim.fraud_assessment.reviewed_at == now
    assert claim.decision_trace["review_queue_decision"] == "APPROVE"
    assert redis.messages[0][0] == "claim_events"
    assert "claim.approved" in redis.messages[0][1]
    assert session.committed is True
    assert detail.claim.status == "approved"
    assert events[0]["action"] == "review_queue_approved"


@pytest.mark.asyncio
async def test_reject_decision_marks_sla_breach(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 10, 0, tzinfo=timezone.utc)
    claim = _make_claim(claim_id="c-reject", score=92, reason_codes=["impossible_travel"], initiated_at=now - timedelta(hours=1))
    session = _FakeSession(claim)
    redis = _FakeRedis()
    user = CurrentUser(user_id="risk-admin-1", phone="+91", role=Role.RISK_ADMIN)

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        return None

    monkeypatch.setattr("routers.review_queue.log_event", _fake_log_event)

    detail = await _process_review_decision(
        session=session,
        redis=redis,
        claim=claim,
        current_user=user,
        decision="REJECT",
        reviewer_notes="The evidence does not support this claim and the reviewer detected inconsistencies.",
        now=now,
    )

    assert claim.status == "rejected"
    assert claim.resolved_at == now
    assert claim.rejection_reason.startswith("The evidence")
    assert claim.decision_trace["sla_breached"] is True
    assert claim.fraud_assessment.reviewed_by == "risk-admin-1"
    assert claim.fraud_assessment.reviewed_at == now
    assert redis.messages == []
    assert detail.claim.status == "rejected"

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from adapters.payout_gateway import PayoutResult
from services.payout_processor import PayoutEventPublisher, PayoutProcessor, PayoutProcessorError


class _FakeResult:
    def __init__(self, obj) -> None:  # noqa: ANN001
        self._obj = obj

    def scalar_one_or_none(self):
        return self._obj

    def scalar_one(self):
        return self._obj


class _FakeSession:
    def __init__(self, responses: list[object]) -> None:
        self.responses = responses
        self.added: list[object] = []
        self.commits = 0
        self.rollbacks = 0
        self.flushed = 0

    async def execute(self, query):  # noqa: ANN001
        if not self.responses:
            raise AssertionError("Unexpected execute call")
        return _FakeResult(self.responses.pop(0))

    def add(self, obj) -> None:  # noqa: ANN001
        self.added.append(obj)

    async def flush(self) -> None:
        self.flushed += 1
        for index, obj in enumerate(self.added, start=1):
            if getattr(obj, "id", None) is None:
                obj.id = f"payout-{index}"

    async def commit(self) -> None:
        self.commits += 1

    async def rollback(self) -> None:
        self.rollbacks += 1


class _FakePublisher:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    async def emit(self, event_name: str, payload: dict) -> None:
        self.events.append((event_name, payload))


class _SuccessGateway:
    async def initiate(self, amount: float, handle: str, idempotency_key: str) -> PayoutResult:
        return PayoutResult(status="SUCCESS", gateway_ref="gw-success", raw_response={"amount": amount, "handle": handle, "idempotency_key": idempotency_key})


class _FailedGateway:
    async def initiate(self, amount: float, handle: str, idempotency_key: str) -> PayoutResult:
        return PayoutResult(status="FAILED", gateway_ref="gw-failed", error_message="gateway rejected")


class _UncertainGateway:
    async def initiate(self, amount: float, handle: str, idempotency_key: str) -> PayoutResult:
        return PayoutResult(status="UNCERTAIN", gateway_ref="gw-uncertain", error_message="timeout")


def _make_objects(*, claim_status: str = "approved", payout_status: str | None = None, initiated_at: datetime | None = None):
    now = datetime(2026, 4, 2, 8, 0, tzinfo=timezone.utc)
    initiated_at = initiated_at or now - timedelta(minutes=2)

    claim = SimpleNamespace(
        id="claim-1",
        status=claim_status,
        worker_id="worker-1",
        policy_id="policy-1",
        trigger_event_id="trigger-1",
        decision_trace={},
    )
    worker = SimpleNamespace(
        id="worker-1",
        phone="+919999999999",
        avg_daily_hours=8.0,
        avg_weekly_earnings=5000.0,
    )
    policy = SimpleNamespace(
        id="policy-1",
        coverage_cap=3000.0,
    )
    trigger = SimpleNamespace(
        id="trigger-1",
        type="HeavyRain",
    )
    payout = None
    if payout_status is not None:
        payout = SimpleNamespace(
            id="payout-existing",
            claim_id="claim-1",
            worker_id="worker-1",
            amount=120.0,
            gateway="mock",
            gateway_ref="gw-existing",
            status=payout_status,
            idempotency_key="existing-idempotency-key",
            initiated_at=initiated_at,
            confirmed_at=None,
            created_at=initiated_at,
            updated_at=initiated_at,
            beneficiary_handle="+919999999999",
        )
    return claim, worker, policy, trigger, payout


@pytest.mark.asyncio
async def test_process_claim_approved_success(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 8, 0, tzinfo=timezone.utc)
    claim, worker, policy, trigger, payout = _make_objects()
    session = _FakeSession([claim, worker, policy, trigger, None])
    publisher = _FakePublisher()
    events: list[dict] = []

    async def _fake_weekly_paid_amount(*args, **kwargs):  # noqa: ANN001
        return 0.0

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    monkeypatch.setattr("services.payout_processor._utcnow", lambda: now)
    monkeypatch.setattr(PayoutProcessor, "_weekly_paid_amount", _fake_weekly_paid_amount)
    monkeypatch.setattr("services.payout_processor.log_event", _fake_log_event)

    processor = PayoutProcessor(gateway=_SuccessGateway())
    result = await processor.process_claim_approved("claim-1", session, publisher=publisher)

    assert result.status == "SUCCESS"
    assert result.beneficiary_handle == "+919999999999"
    assert result.gateway == "_SuccessGateway"
    assert session.commits >= 2
    assert session.flushed == 1
    assert publisher.events[0][0] == "payout.completed"
    assert any(event["payload"]["new_status"] == "PENDING" for event in events)
    assert any(event["payload"]["new_status"] == "SUCCESS" for event in events)


@pytest.mark.asyncio
async def test_duplicate_success_returns_existing_payout(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 8, 0, tzinfo=timezone.utc)
    claim, worker, policy, trigger, payout = _make_objects(payout_status="SUCCESS")
    session = _FakeSession([claim, worker, policy, trigger, payout])
    events: list[dict] = []

    async def _fake_weekly_paid_amount(*args, **kwargs):  # noqa: ANN001
        return 0.0

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    class _ExplodingGateway:
        async def initiate(self, amount: float, handle: str, idempotency_key: str):  # noqa: ANN001
            raise AssertionError("gateway should not be called for duplicate success")

    monkeypatch.setattr(PayoutProcessor, "_weekly_paid_amount", _fake_weekly_paid_amount)
    monkeypatch.setattr("services.payout_processor._utcnow", lambda: now)
    monkeypatch.setattr("services.payout_processor.log_event", _fake_log_event)

    processor = PayoutProcessor(gateway=_ExplodingGateway())
    result = await processor.process_claim_approved("claim-1", session)

    assert result.id == "payout-existing"
    assert result.status == "SUCCESS"
    assert session.commits == 0
    assert events == []


@pytest.mark.asyncio
async def test_stale_pending_moves_to_uncertain_then_reports_uncertain(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 8, 0, tzinfo=timezone.utc)
    claim, worker, policy, trigger, payout = _make_objects(
        payout_status="PENDING",
        initiated_at=now - timedelta(minutes=30),
    )
    session = _FakeSession([claim, worker, policy, trigger, payout])
    publisher = _FakePublisher()
    events: list[dict] = []

    async def _fake_weekly_paid_amount(*args, **kwargs):  # noqa: ANN001
        return 0.0

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    monkeypatch.setattr("services.payout_processor._utcnow", lambda: now)
    monkeypatch.setattr(PayoutProcessor, "_weekly_paid_amount", _fake_weekly_paid_amount)
    monkeypatch.setattr("services.payout_processor.log_event", _fake_log_event)

    processor = PayoutProcessor(gateway=_UncertainGateway())
    result = await processor.process_claim_approved("claim-1", session, publisher=publisher)

    assert result.status == "UNCERTAIN"
    assert publisher.events[0][0] == "payout.uncertain"
    assert any(event["payload"]["new_status"] == "UNCERTAIN" for event in events)
    assert any(event["payload"]["new_status"] == "PENDING" for event in events)


@pytest.mark.asyncio
async def test_gateway_failure_marks_payout_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 8, 0, tzinfo=timezone.utc)
    claim, worker, policy, trigger, payout = _make_objects()
    session = _FakeSession([claim, worker, policy, trigger, None])
    publisher = _FakePublisher()
    events: list[dict] = []

    async def _fake_weekly_paid_amount(*args, **kwargs):  # noqa: ANN001
        return 0.0

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    monkeypatch.setattr("services.payout_processor._utcnow", lambda: now)
    monkeypatch.setattr(PayoutProcessor, "_weekly_paid_amount", _fake_weekly_paid_amount)
    monkeypatch.setattr("services.payout_processor.log_event", _fake_log_event)

    processor = PayoutProcessor(gateway=_FailedGateway())
    result = await processor.process_claim_approved("claim-1", session, publisher=publisher)

    assert result.status == "FAILED"
    assert publisher.events[0][0] == "payout.failed"
    assert any(event["payload"]["new_status"] == "FAILED" for event in events)


@pytest.mark.asyncio
async def test_missing_claim_raises_error(monkeypatch: pytest.MonkeyPatch) -> None:
    session = _FakeSession([None])

    processor = PayoutProcessor(gateway=_SuccessGateway())
    with pytest.raises(PayoutProcessorError):
        await processor.process_claim_approved("claim-404", session)
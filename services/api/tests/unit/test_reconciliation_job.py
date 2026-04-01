from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from jobs.reconciliation import PayoutReconciliationJob


class _FakeResult:
    def __init__(self, rows) -> None:  # noqa: ANN001
        self._rows = rows

    def scalars(self):
        return SimpleNamespace(all=lambda: self._rows)

    def all(self):
        return self._rows

    def scalar_one(self):
        return self._rows


class _FakeSession:
    def __init__(self) -> None:
        self.committed = False

    async def commit(self) -> None:
        self.committed = True


class _FakePublisher:
    def __init__(self) -> None:
        self.events: list[tuple[str, dict]] = []

    async def emit(self, event_name: str, payload: dict) -> None:
        self.events.append((event_name, payload))


class _FakeGateway:
    def __init__(self, responses: dict[str, object]) -> None:
        self.responses = responses

    async def check_status(self, gateway_reference: str):  # noqa: ANN001
        return self.responses[gateway_reference]


def _payout(*, payout_id: str, status: str, initiated_at: datetime, amount: float = 100.0, gateway_ref: str = "gw-1", reconciled: bool = False):
    return SimpleNamespace(
        id=payout_id,
        claim_id=f"claim-{payout_id}",
        worker_id=f"worker-{payout_id}",
        amount=amount,
        gateway="RazorpayTestAdapter",
        gateway_ref=gateway_ref,
        status=status,
        reconciled=reconciled,
        initiated_at=initiated_at,
        confirmed_at=None,
        updated_at=initiated_at,
    )


@pytest.mark.asyncio
async def test_successful_reconciliation_updates_status_and_marks_reconciled(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 12, 0, 0)
    payout = _payout(payout_id="p1", status="UNCERTAIN", initiated_at=now - timedelta(minutes=6), gateway_ref="gw-success")
    session = _FakeSession()
    publisher = _FakePublisher()
    events: list[dict] = []

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    monkeypatch.setattr("jobs.reconciliation.log_event", _fake_log_event)
    async def _fake_load_uncertain(self, session, cutoff):  # noqa: ANN001
        return [payout]

    async def _fake_load_unreconciled_success(self, session, cutoff):  # noqa: ANN001
        return []

    async def _fake_status_counts(self, session):  # noqa: ANN001
        return {"UNCERTAIN": 1}

    async def _fake_total_amount(self, session):  # noqa: ANN001
        return 100.0

    monkeypatch.setattr(PayoutReconciliationJob, "_load_uncertain", _fake_load_uncertain)
    monkeypatch.setattr(PayoutReconciliationJob, "_load_unreconciled_success", _fake_load_unreconciled_success)
    monkeypatch.setattr(PayoutReconciliationJob, "_status_counts", _fake_status_counts)
    monkeypatch.setattr(PayoutReconciliationJob, "_total_amount", _fake_total_amount)

    job = PayoutReconciliationJob(
        gateway=_FakeGateway({"gw-success": SimpleNamespace(status="SUCCESS", gateway_ref="gw-success", amount=100.0)}),
        alert_publisher=publisher,
        now_factory=lambda: now,
    )

    summary = await job.reconcile(session, now=now)

    assert summary.confirmed_success == 1
    assert payout.status == "SUCCESS"
    assert payout.reconciled is True
    assert publisher.events == []
    assert any(event["action"] == "reconciled_success" for event in events)


@pytest.mark.asyncio
async def test_failed_reconciliation_marks_failed(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 12, 0, 0)
    payout = _payout(payout_id="p2", status="UNCERTAIN", initiated_at=now - timedelta(minutes=10), gateway_ref="gw-failed")
    session = _FakeSession()
    publisher = _FakePublisher()
    events: list[dict] = []

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    monkeypatch.setattr("jobs.reconciliation.log_event", _fake_log_event)
    async def _fake_load_uncertain(self, session, cutoff):  # noqa: ANN001
        return [payout]

    async def _fake_load_unreconciled_success(self, session, cutoff):  # noqa: ANN001
        return []

    async def _fake_status_counts(self, session):  # noqa: ANN001
        return {"UNCERTAIN": 1}

    async def _fake_total_amount(self, session):  # noqa: ANN001
        return 100.0

    monkeypatch.setattr(PayoutReconciliationJob, "_load_uncertain", _fake_load_uncertain)
    monkeypatch.setattr(PayoutReconciliationJob, "_load_unreconciled_success", _fake_load_unreconciled_success)
    monkeypatch.setattr(PayoutReconciliationJob, "_status_counts", _fake_status_counts)
    monkeypatch.setattr(PayoutReconciliationJob, "_total_amount", _fake_total_amount)

    job = PayoutReconciliationJob(
        gateway=_FakeGateway({"gw-failed": SimpleNamespace(status="FAILED", gateway_ref="gw-failed", amount=100.0)}),
        alert_publisher=publisher,
        now_factory=lambda: now,
    )

    summary = await job.reconcile(session, now=now)

    assert summary.confirmed_failed == 1
    assert payout.status == "FAILED"
    assert payout.reconciled is True
    assert any(event["action"] == "reconciled_failed" for event in events)


@pytest.mark.asyncio
async def test_mismatch_detection_alerts_risk_admin(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 12, 0, 0)
    payout = _payout(payout_id="p3", status="SUCCESS", initiated_at=now - timedelta(hours=25), amount=120.0, gateway_ref="gw-mismatch", reconciled=False)
    session = _FakeSession()
    publisher = _FakePublisher()
    events: list[dict] = []

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    monkeypatch.setattr("jobs.reconciliation.log_event", _fake_log_event)
    async def _fake_load_uncertain(self, session, cutoff):  # noqa: ANN001
        return []

    async def _fake_load_unreconciled_success(self, session, cutoff):  # noqa: ANN001
        return [payout]

    async def _fake_status_counts(self, session):  # noqa: ANN001
        return {"SUCCESS": 1}

    async def _fake_total_amount(self, session):  # noqa: ANN001
        return 120.0

    monkeypatch.setattr(PayoutReconciliationJob, "_load_uncertain", _fake_load_uncertain)
    monkeypatch.setattr(PayoutReconciliationJob, "_load_unreconciled_success", _fake_load_unreconciled_success)
    monkeypatch.setattr(PayoutReconciliationJob, "_status_counts", _fake_status_counts)
    monkeypatch.setattr(PayoutReconciliationJob, "_total_amount", _fake_total_amount)

    job = PayoutReconciliationJob(
        gateway=_FakeGateway({"gw-mismatch": SimpleNamespace(status="SUCCESS", gateway_ref="gw-mismatch", amount=99.0)}),
        alert_publisher=publisher,
        now_factory=lambda: now,
    )

    summary = await job.reconcile(session, now=now)

    assert summary.mismatches == 1
    assert payout.reconciled is False
    assert any(event["action"] == "reconciliation_mismatch" for event in events)
    assert publisher.events[0][0] == "payout.reconciliation.mismatch"
    assert publisher.events[0][1]["audience"] == "RISK_ADMIN"


@pytest.mark.asyncio
async def test_two_hour_escalation_threshold_alerts_risk_admin(monkeypatch: pytest.MonkeyPatch) -> None:
    now = datetime(2026, 4, 2, 12, 0, 0)
    payout = _payout(payout_id="p4", status="UNCERTAIN", initiated_at=now - timedelta(hours=3), gateway_ref="gw-uncertain")
    session = _FakeSession()
    publisher = _FakePublisher()
    events: list[dict] = []

    async def _fake_log_event(*args, **kwargs):  # noqa: ANN001
        events.append(kwargs)

    monkeypatch.setattr("jobs.reconciliation.log_event", _fake_log_event)
    async def _fake_load_uncertain(self, session, cutoff):  # noqa: ANN001
        return [payout]

    async def _fake_load_unreconciled_success(self, session, cutoff):  # noqa: ANN001
        return []

    async def _fake_status_counts(self, session):  # noqa: ANN001
        return {"UNCERTAIN": 1}

    async def _fake_total_amount(self, session):  # noqa: ANN001
        return 100.0

    monkeypatch.setattr(PayoutReconciliationJob, "_load_uncertain", _fake_load_uncertain)
    monkeypatch.setattr(PayoutReconciliationJob, "_load_unreconciled_success", _fake_load_unreconciled_success)
    monkeypatch.setattr(PayoutReconciliationJob, "_status_counts", _fake_status_counts)
    monkeypatch.setattr(PayoutReconciliationJob, "_total_amount", _fake_total_amount)

    job = PayoutReconciliationJob(
        gateway=_FakeGateway({"gw-uncertain": SimpleNamespace(status="UNCERTAIN", gateway_ref="gw-uncertain", amount=None)}),
        alert_publisher=publisher,
        now_factory=lambda: now,
    )

    summary = await job.reconcile(session, now=now)

    assert summary.escalated_for_manual_review == 1
    assert payout.reconciled is False
    assert any(event["action"] == "reconciliation_escalated" for event in events)
    assert publisher.events[0][0] == "payout.reconciliation.escalated"
    assert publisher.events[0][1]["audience"] == "RISK_ADMIN"
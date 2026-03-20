"""
Unit-test fixtures — lightweight mocks, no real DB or Redis required.
"""
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

from models import (
    AuditLog, Claim, FraudAssessment, PayoutTransaction,
    Policy, RiskProfile, TriggerEvent, Worker,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _utcnow() -> datetime:
    """Naive UTC datetime — matches datetime.utcnow() used inside the orchestrator."""
    return datetime.utcnow()


def make_execute_result(rows=None, first=None):
    """Return a mock that satisfies session.execute(...).scalars().all/first()."""
    result = MagicMock()
    result.scalars.return_value.all.return_value = rows or []
    result.scalars.return_value.first.return_value = first
    result.scalar_one_or_none.return_value = first
    result.scalar.return_value = 0
    return result


# ── Core fixtures ─────────────────────────────────────────────────────────────

@pytest.fixture
def mock_session():
    """AsyncMock of SQLAlchemy AsyncSession with sensible defaults."""
    session = AsyncMock()
    session.execute.return_value = make_execute_result()
    session.get.return_value = None
    session.add = MagicMock()          # sync method
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    return session


@pytest.fixture
def mock_redis():
    """AsyncMock of aioredis.Redis."""
    r = AsyncMock()
    r.get.return_value = None
    r.set.return_value = True
    r.setex.return_value = True
    r.exists.return_value = 0
    r.incr.return_value = 1
    r.expire.return_value = True
    r.delete.return_value = 1
    r.publish.return_value = 1
    # Sorted-set helpers used by catastrophe-mode
    r.zadd.return_value = 1
    r.zremrangebyscore.return_value = 0
    r.zcard.return_value = 0
    # Pipeline: redis.pipeline() is a SYNC call; only pipe.execute() is awaited.
    # results[2] is zcard → 1 (below _CAT_CLAIM_THRESHOLD=50, no cat mode)
    pipe_mock = MagicMock()
    pipe_mock.zadd = MagicMock()
    pipe_mock.zremrangebyscore = MagicMock()
    pipe_mock.zcard = MagicMock()
    pipe_mock.expire = MagicMock()
    pipe_mock.execute = AsyncMock(return_value=[1, 0, 1, True])
    r.pipeline = MagicMock(return_value=pipe_mock)
    return r


@pytest.fixture
def mock_worker():
    w = Worker()
    w.id = _uid()
    w.phone = "+919876500001"
    w.name = "Test Partner"
    w.city = "Mumbai"
    w.service_zones = ["South Mumbai"]
    w.platform_type = "Zomato"
    w.avg_daily_hours = 8.0
    w.avg_weekly_earnings = 4800.0
    w.device_fingerprint = "device-abc-001"
    w.trust_score = 75.0
    w.trust_tier = "silver"
    w.is_active = True
    w.re_entry_cooldown_until = None
    return w


@pytest.fixture
def mock_policy(mock_worker):
    p = Policy()
    p.id = _uid()
    p.worker_id = mock_worker.id
    p.plan_variant = "standard"
    p.status = "active"
    p.coverage_cap = 1500.0
    p.weekly_premium = 149.0
    p.start_date = _utcnow() - timedelta(days=8)   # 8 days ago → waiting period passed
    p.end_date = _utcnow() + timedelta(days=6)
    p.renewal_count = 1
    p.waiting_period_until = _utcnow() - timedelta(hours=25)  # already elapsed (naive UTC)
    return p


@pytest.fixture
def mock_trigger_event():
    t = TriggerEvent()
    t.id = _uid()
    t.type = "HeavyRain"
    t.zone = "South Mumbai"
    t.city = "Mumbai"
    t.value = 42.0
    t.threshold = 5.0
    t.confidence_score = 0.91
    t.sources = ["OpenWeatherMap", "IMD"]
    t.triggered_at = datetime.now(timezone.utc)
    t.is_active = True
    t.audit_snapshot = {}
    return t


@pytest.fixture
def mock_risk_profile(mock_worker):
    rp = RiskProfile()
    rp.id = _uid()
    rp.worker_id = mock_worker.id
    rp.location_risk_index = 0.40
    rp.disruption_frequency_score = 0.30
    rp.hour_exposure_score = 0.50
    rp.platform_segment_factor = 1.00
    rp.updated_at = _now()
    return rp


@pytest.fixture
def mock_claim(mock_worker, mock_policy, mock_trigger_event):
    c = Claim()
    c.id = _uid()
    c.worker_id = mock_worker.id
    c.policy_id = mock_policy.id
    c.trigger_event_id = mock_trigger_event.id
    c.status = "initiated"
    c.fraud_score = 0.0
    c.fraud_reason_tags = []
    c.idempotency_key = f"{mock_worker.id}:{mock_policy.id}:{mock_trigger_event.id}"
    c.created_at = _now()
    c.worker = mock_worker
    c.policy = mock_policy
    c.trigger_event = mock_trigger_event
    return c


@pytest.fixture
def mock_fraud_assessment(mock_claim):
    fa = FraudAssessment()
    fa.id = _uid()
    fa.claim_id = mock_claim.id
    fa.score = 20.0
    fa.decision = "auto_approve"
    fa.reason_codes = []
    fa.assessed_at = _now()
    return fa


@pytest.fixture
def mock_payout(mock_claim, mock_worker):
    pt = PayoutTransaction()
    pt.id = _uid()
    pt.claim_id = mock_claim.id
    pt.worker_id = mock_worker.id
    pt.amount = 64.0
    pt.gateway = "mock"
    pt.gateway_ref = f"mock_rzp_{_uid()}"
    pt.status = "confirmed"
    pt.idempotency_key = mock_claim.idempotency_key
    pt.created_at = _now()
    pt.confirmed_at = _now()
    return pt

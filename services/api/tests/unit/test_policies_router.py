from __future__ import annotations

import json
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from core.roles import Role
from routers.policies import (
    PolicyQuoteResponse,
    PremiumDriver,
    _build_policy_detail,
    _quote_cache_key,
    _read_cached_quote,
    _require_worker,
    _write_quote_cache,
)


class _FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    async def get(self, key: str):
        return self.values.get(key)

    async def setex(self, key: str, ttl: int, value: str):
        self.values[key] = value

    async def delete(self, key: str):
        self.values.pop(key, None)


@pytest.mark.asyncio
async def test_quote_cache_round_trip() -> None:
    redis = _FakeRedis()
    quote = PolicyQuoteResponse(
        quote_id="quote-1",
        worker_id="worker-1",
        plan_variant="basic",
        weekly_premium=49.0,
        coverage_cap=500.0,
        base_rate=49.0,
        risk_multiplier=1.0,
        exposure_multiplier=1.0,
        trust_adjustment=1.0,
        top_factors=[PremiumDriver(factor="City base rate", impact="neutral", description="Base")],
        trust_tier="gold",
        is_estimated=False,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
        ttl_seconds=600,
    )

    await _write_quote_cache(redis, quote)
    cached = await _read_cached_quote(redis, "worker-1", "basic")

    assert cached is not None
    assert cached.quote_id == "quote-1"
    assert cached.plan_variant == "basic"
    assert json.loads(redis.values[_quote_cache_key("worker-1", "basic")])["quote_id"] == "quote-1"


def test_build_policy_detail_includes_plan_metadata() -> None:
    policy = SimpleNamespace(
        id="policy-1",
        worker_id="worker-1",
        plan_variant="standard",
        status="active",
        weekly_premium=88.0,
        coverage_cap=1200.0,
        renewal_count=2,
        waiting_period_until=datetime.utcnow() + timedelta(hours=1),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    worker = SimpleNamespace(trust_tier="silver")

    detail = _build_policy_detail(policy, worker)

    assert detail.id == "policy-1"
    assert detail.plan_variant == "standard"
    assert detail.trust_premium_multiplier == pytest.approx(0.95)
    assert detail.payout_priority == "faster"
    assert detail.plan_triggers == ["ExtremeHeat", "HeavyRain", "LocalRestriction", "SeverePollution"]


def test_require_worker_rejects_non_worker_role() -> None:
    user = SimpleNamespace(user_id="admin-1", role=Role.PLATFORM_ADMIN)

    with pytest.raises(Exception):
        _require_worker(user)

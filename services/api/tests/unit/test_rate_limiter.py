"""
Rate Limiter Unit Tests (PRD §37)

Tests A — Per-IP block
Tests B — Per-identity block
Tests C — Burst block
Tests D — Internal bypass

These tests call the _dependency closure directly, bypassing FastAPI's DI
resolver.  Redis is mocked; no real network I/O occurs.
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from core.rate_limiter import RateLimitExceeded, rate_limit


# ── Helpers ───────────────────────────────────────────────────────────────────

class _MockURL:
    path = "/test"


class _MockClient:
    def __init__(self, host: str):
        self.host = host


def _make_request(ip: str = "1.2.3.4", bearer: str | None = None) -> MagicMock:
    """Build a minimal mock that satisfies the rate_limit dependency."""
    req        = MagicMock()
    req.client = _MockClient(ip)
    req.url    = _MockURL()

    headers: dict[str, str] = {}
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"
    req.headers = headers
    return req


def _pipeline_returning(count: int) -> AsyncMock:
    """
    Build a mock Redis pipeline whose execute() returns
    [zadd_result, zremrangebyscore_result, zcard_count, expire_result].
    count is what _check_window will see as the current window size.
    """
    pipe = AsyncMock()
    pipe.execute = AsyncMock(return_value=[1, 0, count, True])
    return pipe


def _redis_with_counts(*counts: int) -> AsyncMock:
    """
    Return an aioredis.Redis mock whose pipeline() calls return pipelines
    that report the given counts in order.

    E.g. _redis_with_counts(1, 1, 5) → burst=1 pass, IP=1 pass, identity=5.
    """
    redis = AsyncMock()
    redis.pipeline = MagicMock(
        side_effect=[_pipeline_returning(c) for c in counts]
    )
    return redis


# ─────────────────────────────────────────────────────────────────────────────
# Test A — Per-IP block
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_per_ip_block():
    """
    When the IP window counter exceeds per_ip, _dependency raises
    RateLimitExceeded(scope='ip').

    Call sequence: burst (count=1, pass) → IP (count=per_ip+1, fail).
    """
    per_ip = 5
    dep    = rate_limit(per_ip=per_ip, per_identity=20, burst=100)

    # burst: 1 (passes), IP: per_ip+1 (blocked)
    redis = _redis_with_counts(1, per_ip + 1)
    req   = _make_request(ip="10.0.0.1")

    with patch("asyncio.create_task"):
        with pytest.raises(RateLimitExceeded) as exc_info:
            await dep(request=req, redis=redis)

    assert exc_info.value.scope       == "ip"
    assert exc_info.value.limit       == per_ip
    assert exc_info.value.retry_after == 60


# ─────────────────────────────────────────────────────────────────────────────
# Test B — Per-identity block
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_b_per_identity_block():
    """
    When the identity window counter exceeds per_identity, _dependency raises
    RateLimitExceeded(scope='identity').

    A JWT token is present; worker_id is extracted from its payload.

    Call sequence: burst (pass) → IP (pass) → identity (fail).
    """
    per_identity = 3
    dep          = rate_limit(per_ip=100, per_identity=per_identity, burst=100)

    # burst: 1, IP: 1, identity: per_identity+1
    redis = _redis_with_counts(1, 1, per_identity + 1)
    req   = _make_request(ip="10.0.0.2", bearer="valid.jwt.token")

    # Patch JWTHandler.verify_token so identity extraction succeeds
    with patch(
        "core.security.JWTHandler.verify_token",
        return_value={"worker_id": "worker-abc-123"},
    ):
        with patch("asyncio.create_task"):
            with pytest.raises(RateLimitExceeded) as exc_info:
                await dep(request=req, redis=redis)

    assert exc_info.value.scope       == "identity"
    assert exc_info.value.limit       == per_identity
    assert exc_info.value.retry_after == 60


# ─────────────────────────────────────────────────────────────────────────────
# Test C — Burst block
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_c_burst_block():
    """
    When the burst window counter exceeds burst, _dependency raises
    RateLimitExceeded(scope='burst') before the per-IP check even runs.

    Call sequence: burst (count=burst+1, fail immediately).
    """
    burst = 2
    dep   = rate_limit(per_ip=100, per_identity=100, burst=burst)

    # Only one pipeline call needed — burst fails immediately
    redis = _redis_with_counts(burst + 1)
    req   = _make_request(ip="10.0.0.3")

    with patch("asyncio.create_task"):
        with pytest.raises(RateLimitExceeded) as exc_info:
            await dep(request=req, redis=redis)

    assert exc_info.value.scope       == "burst"
    assert exc_info.value.limit       == burst
    assert exc_info.value.retry_after == 1


# ─────────────────────────────────────────────────────────────────────────────
# Test D — Internal service bypass
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_d_internal_bypass():
    """
    When X-Internal-Service header equals INTERNAL_SERVICE_SECRET, all
    rate-limit checks are skipped — no Redis calls, no exception raised.
    """
    secret = "super-secret-internal-token"
    dep    = rate_limit(per_ip=1, per_identity=1, burst=1)

    # Redis should never be called
    redis = AsyncMock()
    req   = _make_request(ip="10.0.0.4")

    with patch("core.rate_limiter.settings") as mock_settings:
        mock_settings.INTERNAL_SERVICE_SECRET = secret

        # Pass the secret via the x_internal_service parameter
        result = await dep(
            request=req,
            redis=redis,
            x_internal_service=secret,
        )

    # No exception raised → bypass worked
    assert result is None
    redis.pipeline.assert_not_called()


# ─────────────────────────────────────────────────────────────────────────────
# Bonus — happy path (no limits exceeded)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_happy_path_no_block():
    """
    When all counters are within limits, _dependency returns None (no exception).
    """
    dep   = rate_limit(per_ip=60, per_identity=40, burst=10)

    # burst=1, IP=1, identity=1 — all safely below limits
    redis = _redis_with_counts(1, 1, 1)
    req   = _make_request(ip="10.0.0.5", bearer="tok")

    with patch(
        "core.security.JWTHandler.verify_token",
        return_value={"worker_id": "worker-xyz"},
    ):
        with patch("asyncio.create_task"):
            result = await dep(request=req, redis=redis)

    assert result is None

from __future__ import annotations

from datetime import timedelta

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.security import JWTHandler
from middleware.rate_limiter import RATE_LIMIT_CONFIG, RateLimitConfig, RedisRateLimiterMiddleware


class _FakePipeline:
    def __init__(self, redis: "_FakeRedis") -> None:
        self._redis = redis
        self._ops: list[tuple[str, tuple, dict]] = []

    def zadd(self, key, values):  # noqa: ANN001
        self._ops.append(("zadd", (key, values), {}))
        return self

    def zremrangebyscore(self, key, min_score, max_score):  # noqa: ANN001
        self._ops.append(("zremrangebyscore", (key, min_score, max_score), {}))
        return self

    def zcard(self, key):  # noqa: ANN001
        self._ops.append(("zcard", (key,), {}))
        return self

    def expire(self, key, ttl):  # noqa: ANN001
        self._ops.append(("expire", (key, ttl), {}))
        return self

    async def execute(self):
        results = []
        for name, args, kwargs in self._ops:
            method = getattr(self._redis, f"_{name}")
            results.append(method(*args, **kwargs))
        return results


class _FakeRedis:
    def __init__(self) -> None:
        self._zsets: dict[str, list[tuple[str, int]]] = {}

    def pipeline(self):
        return _FakePipeline(self)

    def _zadd(self, key, values):  # noqa: ANN001
        self._zsets.setdefault(key, [])
        for member, score in values.items():
            self._zsets[key].append((member, int(score)))
        return 1

    def _zremrangebyscore(self, key, min_score, max_score):  # noqa: ANN001
        existing = self._zsets.get(key, [])
        kept = [(m, s) for m, s in existing if not (int(min_score) <= s <= int(max_score))]
        removed = len(existing) - len(kept)
        self._zsets[key] = kept
        return removed

    def _zcard(self, key):  # noqa: ANN001
        return len(self._zsets.get(key, []))

    def _expire(self, key, ttl):  # noqa: ANN001
        return 1


def _app(fake_redis: _FakeRedis) -> FastAPI:
    app = FastAPI()
    app.add_middleware(RedisRateLimiterMiddleware, redis_client=fake_redis)

    @app.get("/api/v1/auth/otp/request")
    async def otp_request():
        return {"ok": True}

    @app.get("/api/v1/policies/purchase")
    async def purchase():
        return {"ok": True}

    @app.get("/api/v1/claims/claim-1/initiate")
    async def claim_initiate():
        return {"ok": True}

    @app.get("/api/v1/admin/review-queue/decide")
    async def admin_decide():
        return {"ok": True}

    @app.get("/other")
    async def other():
        return {"ok": True}

    return app


def _token(identity_key: str, identity_value: str) -> str:
    return JWTHandler.create_token({identity_key: identity_value}, expires_delta=timedelta(minutes=5))


def test_per_ip_block(monkeypatch) -> None:  # noqa: ANN001
    monkeypatch.setitem(RATE_LIMIT_CONFIG, "/api/v1/auth/otp/request", RateLimitConfig(5, 3, 20))
    app = _app(_FakeRedis())
    client = TestClient(app)

    for _ in range(5):
        response = client.get("/api/v1/auth/otp/request", headers={"X-Forwarded-For": "1.1.1.1"})
        assert response.status_code == 200

    blocked = client.get("/api/v1/auth/otp/request", headers={"X-Forwarded-For": "1.1.1.1"})
    assert blocked.status_code == 429
    assert blocked.json()["error_code"] == "RATE_LIMIT_EXCEEDED"


def test_per_identity_block(monkeypatch) -> None:  # noqa: ANN001
    monkeypatch.setitem(RATE_LIMIT_CONFIG, "/api/v1/auth/otp/request", RateLimitConfig(20, 3, 20))
    app = _app(_FakeRedis())
    client = TestClient(app)
    token = _token("worker_id", "worker-123")

    for i in range(3):
        response = client.get(
            "/api/v1/auth/otp/request",
            headers={
                "Authorization": f"Bearer {token}",
                "X-Forwarded-For": f"2.2.2.{i}",
            },
        )
        assert response.status_code == 200

    blocked = client.get(
        "/api/v1/auth/otp/request",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Forwarded-For": "9.9.9.9",
        },
    )
    assert blocked.status_code == 429
    assert blocked.json()["error_code"] == "RATE_LIMIT_EXCEEDED"


def test_burst_block() -> None:
    app = _app(_FakeRedis())
    client = TestClient(app)

    first = client.get("/api/v1/auth/otp/request", headers={"X-Forwarded-For": "3.3.3.3"})
    second = client.get("/api/v1/auth/otp/request", headers={"X-Forwarded-For": "3.3.3.3"})

    assert first.status_code == 200
    assert second.status_code == 429
    assert second.headers["X-RateLimit-Limit"] == "1"


def test_internal_service_bypass(monkeypatch) -> None:  # noqa: ANN001
    monkeypatch.setattr("middleware.rate_limiter.settings.INTERNAL_SERVICE_SECRET", "internal-secret")

    app = _app(_FakeRedis())
    client = TestClient(app)

    for _ in range(8):
        response = client.get(
            "/api/v1/auth/otp/request",
            headers={
                "X-Forwarded-For": "4.4.4.4",
                "X-Internal-Service": "trigger-poller",
                "X-Internal-Api-Key": "internal-secret",
            },
        )
        assert response.status_code == 200


def test_rejection_headers_values(monkeypatch) -> None:  # noqa: ANN001
    monkeypatch.setitem(RATE_LIMIT_CONFIG, "/api/v1/auth/otp/request", RateLimitConfig(5, 3, 20))
    app = _app(_FakeRedis())
    client = TestClient(app)

    for _ in range(5):
        response = client.get("/api/v1/auth/otp/request", headers={"X-Forwarded-For": "5.5.5.5"})
        assert response.status_code == 200

    blocked = client.get("/api/v1/auth/otp/request", headers={"X-Forwarded-For": "5.5.5.5"})
    assert blocked.status_code == 429
    assert blocked.headers["Retry-After"] == "60"
    assert blocked.headers["X-RateLimit-Limit"] == "5"
    assert blocked.headers["X-RateLimit-Remaining"] == "0"

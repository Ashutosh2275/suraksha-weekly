"""Redis-backed sliding-window rate limiter middleware."""

from __future__ import annotations

import fnmatch
import time
import uuid
from dataclasses import dataclass
from typing import Any

import redis.asyncio as aioredis
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.config import settings
from core.security import JWTHandler


@dataclass(frozen=True)
class RateLimitConfig:
    per_ip_per_minute: int
    per_identity_per_minute: int
    burst_per_second: int


RATE_LIMIT_CONFIG: dict[str, RateLimitConfig] = {
    "/api/v1/auth/otp/request": RateLimitConfig(5, 3, 1),
    "/api/v1/policies/purchase": RateLimitConfig(10, 5, 1),
    "/api/v1/claims/*/initiate": RateLimitConfig(5, 3, 1),
    "/api/v1/admin/*/decide": RateLimitConfig(10, 5, 1),
    "default": RateLimitConfig(120, 120, 20),
}


class RedisRateLimiterMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, redis_url: str | None = None, redis_client: Any | None = None) -> None:  # noqa: ANN001
        super().__init__(app)
        self.redis_url = redis_url or settings.REDIS_URL
        self.redis_client = redis_client

    async def dispatch(self, request: Request, call_next) -> Response:  # noqa: ANN001
        if self._is_internal_bypass(request):
            return await call_next(request)

        endpoint_pattern, config = _resolve_rate_limit_config(request.url.path)
        ip = _extract_ip(request)
        identity = _extract_identity(request)

        client = self.redis_client or aioredis.from_url(self.redis_url, decode_responses=True)
        try:
            ip_ok, ip_retry_after = await _check_dimension(
                client,
                dimension_type="ip",
                identifier=ip,
                endpoint_pattern=endpoint_pattern,
                window_seconds=60,
                limit=config.per_ip_per_minute,
            )
            if not ip_ok:
                return _rate_limit_response(request, limit=config.per_ip_per_minute, retry_after=ip_retry_after)

            burst_ok, burst_retry_after = await _check_dimension(
                client,
                dimension_type="ip_burst",
                identifier=ip,
                endpoint_pattern=endpoint_pattern,
                window_seconds=1,
                limit=config.burst_per_second,
            )
            if not burst_ok:
                return _rate_limit_response(request, limit=config.burst_per_second, retry_after=burst_retry_after)

            if identity:
                identity_ok, identity_retry_after = await _check_dimension(
                    client,
                    dimension_type="identity",
                    identifier=identity,
                    endpoint_pattern=endpoint_pattern,
                    window_seconds=60,
                    limit=config.per_identity_per_minute,
                )
                if not identity_ok:
                    return _rate_limit_response(request, limit=config.per_identity_per_minute, retry_after=identity_retry_after)

                identity_burst_ok, identity_burst_retry_after = await _check_dimension(
                    client,
                    dimension_type="identity_burst",
                    identifier=identity,
                    endpoint_pattern=endpoint_pattern,
                    window_seconds=1,
                    limit=config.burst_per_second,
                )
                if not identity_burst_ok:
                    return _rate_limit_response(request, limit=config.burst_per_second, retry_after=identity_burst_retry_after)

            return await call_next(request)
        finally:
            if self.redis_client is None:
                await client.aclose()

    def _is_internal_bypass(self, request: Request) -> bool:
        service_header = request.headers.get("X-Internal-Service", "").strip()
        internal_api_key = request.headers.get("X-Internal-Api-Key", "").strip()
        if not service_header or not internal_api_key:
            return False
        secret = (settings.INTERNAL_SERVICE_SECRET or "").strip()
        return bool(secret) and internal_api_key == secret


def _resolve_rate_limit_config(path: str) -> tuple[str, RateLimitConfig]:
    for pattern, config in RATE_LIMIT_CONFIG.items():
        if pattern == "default":
            continue
        if fnmatch.fnmatch(path, pattern):
            return pattern, config
    return "default", RATE_LIMIT_CONFIG["default"]


def _extract_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def _extract_identity(request: Request) -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None

    token = auth_header.split(" ", 1)[1]
    try:
        payload = JWTHandler.verify_token(token)
    except Exception:
        return None

    identity = payload.get("worker_id") or payload.get("admin_user_id") or payload.get("user_id") or payload.get("sub")
    return str(identity) if identity else None


async def _check_dimension(
    redis_client: Any,
    *,
    dimension_type: str,
    identifier: str,
    endpoint_pattern: str,
    window_seconds: int,
    limit: int,
) -> tuple[bool, int]:
    now_ms = int(time.time() * 1000)
    window_ms = window_seconds * 1000
    cutoff = now_ms - window_ms

    key = f"rate:{dimension_type}:{identifier}:{endpoint_pattern}:{window_seconds}"
    member = f"{now_ms}:{uuid.uuid4()}"

    pipe = redis_client.pipeline()
    pipe.zadd(key, {member: now_ms})
    pipe.zremrangebyscore(key, 0, cutoff)
    pipe.zcard(key)
    pipe.expire(key, window_seconds + 1)
    results = await pipe.execute()

    count_after_add = int(results[2])
    if count_after_add > limit:
        return False, window_seconds
    return True, window_seconds


def _rate_limit_response(request: Request, *, limit: int, retry_after: int) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={
            "success": False,
            "error_code": "RATE_LIMIT_EXCEEDED",
            "message": "Rate limit exceeded. Please retry later.",
            "details": None,
            "correlation_id": getattr(request.state, "request_id", ""),
        },
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": "0",
        },
    )

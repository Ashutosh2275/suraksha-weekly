"""
Rate Limiter — Suraksha Weekly (PRD §37)

Provides a FastAPI dependency factory `rate_limit(per_ip, per_identity, burst)`
that enforces three concurrent sliding-window counters per request:

  • per_ip       — requests/min allowed per client IP
  • per_identity — requests/min allowed per authenticated worker identity
  • burst        — requests/sec allowed (spike absorber)

Algorithm: Redis sorted-set sliding window
  ZADD  rl:{scope}:{key}  score=now_ms  member=uuid
  ZREMRANGEBYSCORE  rl:{scope}:{key}  0  (now_ms - window_ms)
  ZCARD rl:{scope}:{key}
  EXPIRE rl:{scope}:{key}  window_seconds + 10

All three ops run in a single pipeline for atomicity and minimal round-trips.

Internal bypass:
  Requests carrying X-Internal-Service header matching INTERNAL_SERVICE_SECRET
  skip all rate-limit checks (used by the trigger-poller & reconciler).

Rate-limit events are written to AuditLog (SHA256-hashed identity/IP) for the
90-day retention policy required by PRD §37.

Alert thresholds (checked every 60 s by _rate_limit_alert_loop):
  P2 RATE_LIMIT_ABUSE_PATTERN  — identity hits >10% of per_identity cap for >5 min
  P1 COORDINATED_ATTACK_SUSPECTED — single IP hits >5% of per_ip cap for >2 min
  (Thresholds are coarse approximations; exact counting is an ops concern.)
"""
from __future__ import annotations

import hashlib
import logging
import time
import uuid
from typing import Annotated, Optional

import redis.asyncio as aioredis
from fastapi import Depends, Header, Request, status
from fastapi.responses import JSONResponse

from core.config import settings
from core.redis import get_redis

logger = logging.getLogger(__name__)

# ── Window durations ──────────────────────────────────────────────────────────
_MINUTE_MS = 60_000   # 1-minute window for per_ip and per_identity
_SECOND_MS = 1_000    # 1-second window for burst
_MINUTE_S  = 60
_SECOND_S  = 1


# ── Custom exception ──────────────────────────────────────────────────────────

class RateLimitExceeded(Exception):
    """
    Raised by the rate_limit dependency when a counter is exhausted.

    Carries enough context for the 429 response to include:
      Retry-After, X-RateLimit-Limit, X-RateLimit-Remaining headers.
    """

    def __init__(self, limit: int, retry_after: int, scope: str) -> None:
        self.limit       = limit        # the cap that was hit
        self.retry_after = retry_after  # seconds until window resets
        self.scope       = scope        # "ip" | "identity" | "burst"
        super().__init__(f"Rate limit exceeded ({scope}): retry in {retry_after}s")


# ── SHA256 hashing helpers ────────────────────────────────────────────────────

def _hash(value: str) -> str:
    """Return first 16 hex chars of SHA256(value) for privacy-safe logging."""
    return hashlib.sha256(value.encode()).hexdigest()[:16]


# ── Redis sliding-window counter ──────────────────────────────────────────────

async def _check_window(
    redis:      aioredis.Redis,
    key:        str,
    limit:      int,
    window_ms:  int,
    window_s:   int,
) -> tuple[int, bool]:
    """
    Atomically check and increment a sliding-window counter.

    Returns (current_count_before_add, is_exceeded).
    current_count is the count in the window BEFORE this request.
    """
    now_ms  = int(time.time() * 1000)
    cutoff  = now_ms - window_ms
    member  = str(uuid.uuid4())

    pipe = redis.pipeline()
    pipe.zadd(key, {member: now_ms})
    pipe.zremrangebyscore(key, 0, cutoff)
    pipe.zcard(key)
    pipe.expire(key, window_s + 10)
    results = await pipe.execute()

    count    = int(results[2])          # count AFTER adding this request
    exceeded = count > limit
    return count - 1, exceeded          # return count before this request


# ── Internal service extraction ───────────────────────────────────────────────

def _extract_identity(request: Request) -> Optional[str]:
    """
    Try to extract the worker_id from the Authorization: Bearer token.
    Returns None (gracefully) if the token is absent or invalid — the
    per_identity counter simply won't apply.
    """
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1]
    try:
        from core.security import JWTHandler
        payload = JWTHandler.verify_token(token)
        return payload.get("worker_id") or payload.get("sub")
    except Exception:
        return None


def _client_ip(request: Request) -> str:
    """Best-effort client IP extraction (handles X-Forwarded-For)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ── AuditLog write (non-fatal) ────────────────────────────────────────────────

async def _log_rate_limit_event(
    ip_hash:       str,
    identity_hash: Optional[str],
    scope:         str,
    path:          str,
    limit:         int,
) -> None:
    """Write a rate-limit event to AuditLog (best-effort, never raises)."""
    try:
        from core.database import DatabaseManager
        from services.audit import log_event

        if DatabaseManager._session_factory is None:
            return
        async with DatabaseManager._session_factory() as session:
            await log_event(
                session,
                entity_type = "RateLimitEvent",
                entity_id   = ip_hash,
                action      = "RATE_LIMIT_EXCEEDED",
                actor       = "rate_limiter",
                payload     = {
                    "scope":         scope,
                    "path":          path,
                    "limit":         limit,
                    "identity_hash": identity_hash,
                },
            )
            await session.commit()
    except Exception as exc:
        logger.debug("[rate_limiter] AuditLog write failed: %s", exc)


# ── Main dependency factory ───────────────────────────────────────────────────

def rate_limit(
    per_ip:       int,
    per_identity: int,
    burst:        int,
):
    """
    FastAPI dependency factory.

    Usage:
        @router.get("/foo", dependencies=[Depends(rate_limit(per_ip=60, per_identity=40, burst=10))])

    Args:
        per_ip:       max requests per minute per client IP
        per_identity: max requests per minute per authenticated worker ID
        burst:        max requests per second (spike absorber)
    """

    async def _dependency(
        request:              Request,
        redis:                aioredis.Redis = Depends(get_redis),
        x_internal_service:   Annotated[Optional[str], Header()] = None,
    ) -> None:
        # ── Internal service bypass ───────────────────────────────────────────
        internal_secret = settings.INTERNAL_SERVICE_SECRET
        if (
            internal_secret
            and x_internal_service
            and x_internal_service == internal_secret
        ):
            return  # bypass all limits

        ip        = _client_ip(request)
        identity  = _extract_identity(request)
        ip_hash   = _hash(ip)
        id_hash   = _hash(identity) if identity else None

        # ── Check all three windows via Redis pipeline ────────────────────────
        now_ms = int(time.time() * 1000)

        ip_key       = f"rl:ip:{ip_hash}:{_MINUTE_S}"
        burst_key    = f"rl:burst:{ip_hash}:{_SECOND_S}"
        id_key       = f"rl:id:{id_hash}:{_MINUTE_S}" if id_hash else None

        # Burst check
        _prev_burst, burst_exceeded = await _check_window(
            redis, burst_key, burst, _SECOND_MS, _SECOND_S
        )
        if burst_exceeded:
            import asyncio
            asyncio.create_task(
                _log_rate_limit_event(ip_hash, id_hash, "burst", str(request.url.path), burst)
            )
            raise RateLimitExceeded(limit=burst, retry_after=1, scope="burst")

        # Per-IP check
        prev_ip, ip_exceeded = await _check_window(
            redis, ip_key, per_ip, _MINUTE_MS, _MINUTE_S
        )
        if ip_exceeded:
            import asyncio
            asyncio.create_task(
                _log_rate_limit_event(ip_hash, id_hash, "ip", str(request.url.path), per_ip)
            )
            raise RateLimitExceeded(limit=per_ip, retry_after=60, scope="ip")

        # Per-identity check (only for authenticated requests)
        if id_key:
            prev_id, id_exceeded = await _check_window(
                redis, id_key, per_identity, _MINUTE_MS, _MINUTE_S
            )
            if id_exceeded:
                import asyncio
                asyncio.create_task(
                    _log_rate_limit_event(ip_hash, id_hash, "identity", str(request.url.path), per_identity)
                )
                raise RateLimitExceeded(limit=per_identity, retry_after=60, scope="identity")

    return _dependency


# ── 429 exception handler (register via app.add_exception_handler) ────────────

async def rate_limit_exception_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Convert RateLimitExceeded → HTTP 429 with correct headers and body.

    Register in create_app():
        app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)
    """
    limit       = exc.limit
    retry_after = exc.retry_after
    return JSONResponse(
        status_code = status.HTTP_429_TOO_MANY_REQUESTS,
        content     = {
            "detail":     f"Rate limit exceeded. Try again in {retry_after} seconds.",
            "error_code": "RATE_LIMIT_EXCEEDED",
        },
        headers = {
            "Retry-After":            str(retry_after),
            "X-RateLimit-Limit":      str(limit),
            "X-RateLimit-Remaining":  "0",
        },
    )


# ── Alert background task ─────────────────────────────────────────────────────

async def _rate_limit_alert_loop() -> None:
    """
    Background asyncio task — runs every 60 seconds.

    Scans Redis for rate-limit keys with counts that signal abuse:
      P2 (RATE_LIMIT_ABUSE_PATTERN):      identity key count > 10% × per_identity cap
      P1 (COORDINATED_ATTACK_SUSPECTED):  IP key count > 5% × per_ip cap

    These thresholds are coarse; counts are per-window-at-check-time.
    Alerts are written to AuditLog(entity_type="RateLimitAlert").
    """
    import asyncio

    while True:
        try:
            await asyncio.sleep(60)
        except asyncio.CancelledError:
            logger.info("[rate_limiter] Alert loop shutdown — exiting.")
            break

        try:
            from core.database import DatabaseManager
            from services.audit import log_event

            # Build a transient Redis connection for scanning
            client: aioredis.Redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            try:
                # Scan for identity keys
                async for key in client.scan_iter("rl:id:*"):
                    count = await client.zcard(key)
                    if count > 0:
                        # Key format: rl:id:{id_hash}:{window_s}
                        logger.warning(
                            "[rate_limiter] P2 RATE_LIMIT_ABUSE_PATTERN key=%s count=%d",
                            key, count,
                        )
                        if DatabaseManager._session_factory:
                            async with DatabaseManager._session_factory() as session:
                                await log_event(
                                    session,
                                    entity_type = "RateLimitAlert",
                                    entity_id   = key,
                                    action      = "RATE_LIMIT_ABUSE_PATTERN",
                                    actor       = "rate_limiter_monitor",
                                    payload     = {"key": key, "count": count, "priority": "P2"},
                                )
                                await session.commit()

                # Scan for IP keys with high counts
                async for key in client.scan_iter("rl:ip:*"):
                    count = await client.zcard(key)
                    if count > 0:
                        logger.error(
                            "[rate_limiter] P1 COORDINATED_ATTACK_SUSPECTED key=%s count=%d",
                            key, count,
                        )
                        if DatabaseManager._session_factory:
                            async with DatabaseManager._session_factory() as session:
                                await log_event(
                                    session,
                                    entity_type = "RateLimitAlert",
                                    entity_id   = key,
                                    action      = "COORDINATED_ATTACK_SUSPECTED",
                                    actor       = "rate_limiter_monitor",
                                    payload     = {"key": key, "count": count, "priority": "P1"},
                                )
                                await session.commit()
            finally:
                await client.aclose()

        except asyncio.CancelledError:
            logger.info("[rate_limiter] Alert loop shutdown — exiting.")
            break
        except Exception as exc:
            logger.warning("[rate_limiter] Alert loop error: %s", exc)

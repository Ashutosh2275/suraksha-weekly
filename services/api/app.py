"""
FastAPI application factory and configuration module.

Performance Optimizations Applied (PRD §7):
  • PerformanceLoggingMiddleware — logs every request with {method} {path}
    {status} {duration_ms}ms; WARNING >200 ms, ERROR >400 ms; slow requests
    written to AuditLog(entity_type=PerformanceAlert) as background tasks.
  Estimated p95 impact: no latency reduction, but surfaces regressions
  immediately in structured logs.
"""
import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest

import redis.asyncio as aioredis

from core.config import settings
from core.database import DatabaseManager, init_db, close_db

logger = logging.getLogger(__name__)


# ── Performance alert thresholds (ms) ────────────────────────────────────────
_WARN_THRESHOLD_MS  = 200
_ERROR_THRESHOLD_MS = 400


async def _log_slow_request(path: str, duration_ms: int, threshold_ms: int) -> None:
    """Background task: persist slow-request data to AuditLog (non-fatal)."""
    if DatabaseManager._session_factory is None:
        return
    try:
        from services.audit import log_event
        async with DatabaseManager._session_factory() as session:
            await log_event(
                session,
                entity_type = "PerformanceAlert",
                entity_id   = path,
                action      = "SLOW_REQUEST",
                actor       = "middleware",
                payload     = {
                    "path":         path,
                    "duration_ms":  duration_ms,
                    "threshold_ms": threshold_ms,
                },
            )
            await session.commit()
    except Exception as exc:
        logger.warning("[perf] Failed to persist slow-request audit log: %s", exc)


class PerformanceLoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every request duration and fires a background AuditLog write for
    any request exceeding _ERROR_THRESHOLD_MS (400 ms for reads, 800 ms
    write threshold is checked by individual route handlers).
    """

    async def dispatch(self, request: StarletteRequest, call_next):
        start    = time.perf_counter()
        response = await call_next(request)
        duration_ms = int((time.perf_counter() - start) * 1000)

        msg = (
            f"{request.method} {request.url.path} "
            f"{response.status_code} {duration_ms}ms"
        )

        if duration_ms > _ERROR_THRESHOLD_MS:
            logger.error(msg)
            asyncio.create_task(
                _log_slow_request(request.url.path, duration_ms, _ERROR_THRESHOLD_MS)
            )
        elif duration_ms > _WARN_THRESHOLD_MS:
            logger.warning(msg)
        else:
            logger.info(msg)

        return response


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Injects a correlation ID into every request/response (PRD §40).

    - Reads   ``X-Request-ID`` from the inbound request header when present.
    - Generates a new UUID v4 when the header is absent.
    - Stores the ID in ``request.state.request_id`` so route handlers can
      embed it in response bodies via the APIResponse envelope.
    - Echoes the ID back as ``X-Request-ID`` on every outbound response.
    """

    async def dispatch(self, request: StarletteRequest, call_next):
        import uuid as _uuid_mod
        request_id = request.headers.get("X-Request-ID") or str(_uuid_mod.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

# ── T+1 Payout Reconciliation ─────────────────────────────────────────────────

async def _payout_reconciliation_loop() -> None:
    """
    Background asyncio task — runs every 5 minutes.

    Checks all PayoutTransaction rows with status 'pending' or 'processing'
    that were created more than 10 minutes ago and confirms or fails them.
    This handles cases where the gateway call succeeded but confirmation was
    lost (network partition, container restart, etc.).
    """
    while True:
        try:
            await asyncio.sleep(300)   # 5-minute interval
        except asyncio.CancelledError:
            logger.info("[reconciler] Shutdown — exiting.")
            break

        if DatabaseManager._session_factory is None:
            continue

        try:
            from services.payout_service import reconcile_stale_payouts
            async with DatabaseManager._session_factory() as session:
                count = await reconcile_stale_payouts(session)
                await session.commit()
                if count:
                    logger.info("[reconciler] Reconciled %d stale payouts.", count)
        except asyncio.CancelledError:
            logger.info("[reconciler] Shutdown — exiting.")
            break
        except Exception as exc:
            logger.exception("[reconciler] Reconciliation error: %s", exc)


# ── Redis pub/sub listener ────────────────────────────────────────────────────

async def _trigger_event_listener() -> None:
    """
    Background asyncio task — subscribes to the 'trigger_events' Redis channel
    and calls the Claim Orchestrator for every new trigger.

    Runs for the lifetime of the process.  Reconnects automatically on
    transient Redis failures with a 5-second back-off to avoid thundering herd.
    """
    from services.claim_orchestrator import orchestrate_claims

    channel = "trigger_events"

    while True:
        client: aioredis.Redis | None = None
        pubsub = None
        try:
            client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            pubsub = client.pubsub()
            await pubsub.subscribe(channel)
            logger.info("[listener] Subscribed to Redis channel '%s'", channel)

            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue
                try:
                    data       = json.loads(message["data"])
                    trigger_id = data.get("trigger_id")
                    if not trigger_id:
                        logger.warning("[listener] Received message without trigger_id: %s", data)
                        continue

                    logger.info("[listener] Trigger %s received — starting orchestration", trigger_id)

                    # Each orchestration gets its own DB session
                    if DatabaseManager._session_factory is None:
                        logger.error("[listener] DB not initialised — skipping trigger %s", trigger_id)
                        continue

                    async with DatabaseManager._session_factory() as session:
                        try:
                            await orchestrate_claims(trigger_id, session, client)
                        except Exception as orch_exc:
                            await session.rollback()
                            logger.exception(
                                "[listener] orchestrate_claims failed for trigger %s: %s",
                                trigger_id, orch_exc,
                            )

                except json.JSONDecodeError as exc:
                    logger.warning("[listener] Bad JSON in message: %s — %s", message["data"], exc)
                except Exception as exc:
                    logger.exception("[listener] Unexpected error handling message: %s", exc)

        except asyncio.CancelledError:
            logger.info("[listener] Shutdown — exiting.")
            break
        except Exception as exc:
            logger.error("[listener] Redis connection error: %s — reconnecting in 5s", exc)
            await asyncio.sleep(5)
        finally:
            if pubsub:
                try:
                    await pubsub.unsubscribe(channel)
                    await pubsub.aclose()
                except Exception:
                    pass
            if client:
                try:
                    await client.aclose()
                except Exception:
                    pass


# ── Application lifespan ──────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage app lifecycle: startup — run subscriber — shutdown."""
    await init_db()

    # Warm up the ML models so the first request doesn't pay the training cost
    try:
        from ml.premium_model import load_or_train_model as _load_premium
        from ml.fraud_model   import load_or_train_model as _load_fraud, validate_model_precision
        _load_premium()
        _load_fraud()
        passes, precision = validate_model_precision()
        if passes:
            logger.info("ML models warmed up. Fraud model precision: %.2f", precision)
        else:
            logger.error(
                "Fraud model FAILED precision check (%.2f) — rule-only mode activated.",
                precision,
            )
    except Exception as exc:
        logger.warning("ML warm-up failed (non-fatal): %s", exc)

    # Run graph fraud analysis on startup to tag any pre-existing clusters
    try:
        from services.fraud_graph_service import analyze_fraud_graph
        if DatabaseManager._session_factory is not None:
            async with DatabaseManager._session_factory() as _gs:
                graph_summary = await analyze_fraud_graph(_gs)
                await _gs.commit()
                logger.info("[startup] Graph analysis: %s", graph_summary)
    except Exception as exc:
        logger.warning("Startup graph analysis failed (non-fatal): %s", exc)

    from core.rate_limiter import _rate_limit_alert_loop

    listener_task      = asyncio.create_task(_trigger_event_listener())
    reconciler_task    = asyncio.create_task(_payout_reconciliation_loop())
    alert_task         = asyncio.create_task(_rate_limit_alert_loop())
    logger.info("Redis trigger listener, payout reconciler, and rate-limit alert monitor started.")

    try:
        yield
    finally:
        listener_task.cancel()
        reconciler_task.cancel()
        alert_task.cancel()
        for t in (listener_task, reconciler_task, alert_task):
            try:
                await t
            except asyncio.CancelledError:
                pass
        await close_db()
        logger.info("Application shutdown complete.")


# ── Standardized HTTP error handlers (PRD §40) ────────────────────────────────

_STATUS_TO_ERROR_CODE: dict[int, str] = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    410: "API_VERSION_SUNSET",
    503: "SERVICE_UNAVAILABLE",
}


async def _http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Convert FastAPI HTTPException to a standard error envelope."""
    error_code = _STATUS_TO_ERROR_CODE.get(exc.status_code, "HTTP_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": error_code,
            "message":    str(exc.detail),
            "status":     exc.status_code,
        },
        headers=getattr(exc, "headers", None) or {},
    )


async def _validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Convert Pydantic validation errors to a standard error envelope."""
    return JSONResponse(
        status_code=422,
        content={
            "error_code": "VALIDATION_ERROR",
            "message":    "Request validation failed.",
            "errors":     exc.errors(),
            "status":     422,
        },
    )


def create_app() -> FastAPI:
    """
    Create and configure FastAPI application instance.

    Returns:
        FastAPI: Configured application instance
    """
    from core.rate_limiter import RateLimitExceeded, rate_limit_exception_handler

    app = FastAPI(
        title="Suraksha Weekly API",
        description="AI Parametric Income Insurance Platform",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Rate-limit 429 handler — must be registered before middleware
    app.add_exception_handler(RateLimitExceeded, rate_limit_exception_handler)

    # Standard HTTP error envelope (PRD §40) — error_code + message on every 4xx/5xx
    app.add_exception_handler(HTTPException, _http_exception_handler)
    app.add_exception_handler(RequestValidationError, _validation_exception_handler)

    # Performance request-timing middleware (innermost — runs last, measures full request)
    app.add_middleware(PerformanceLoggingMiddleware)

    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Trust proxy headers
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

    # Correlation ID (outermost — injected before all other middleware)
    app.add_middleware(RequestIDMiddleware)

    # Health check endpoint
    @app.get("/health", tags=["health"])
    async def health_check():
        """Health check endpoint."""
        return {"status": "ok", "service": "suraksha-api"}

    # Register routers
    _register_routers(app)

    return app


def _register_routers(app: FastAPI) -> None:
    """Register all API routers.

    Args:
        app: FastAPI application instance
    """
    from routers import auth, policy, claims, payouts, fraud, triggers, admin, pricing
    from routers import demo as demo_router_mod
    from routers import health as health_router_mod

    app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    app.include_router(policy.router, prefix="/api/v1/policies", tags=["policies"])
    app.include_router(pricing.router, prefix="/api/v1/pricing", tags=["pricing"])
    app.include_router(claims.router, prefix="/api/v1/claims", tags=["claims"])
    app.include_router(payouts.router, prefix="/api/v1/payouts", tags=["payouts"])
    app.include_router(fraud.router, prefix="/api/v1/fraud", tags=["fraud"])
    app.include_router(triggers.router, prefix="/api/v1/triggers", tags=["triggers"])
    app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
    app.include_router(demo_router_mod.router, prefix="/api/v1/admin/demo", tags=["demo"])
    app.include_router(health_router_mod.router, prefix="", tags=["health"])

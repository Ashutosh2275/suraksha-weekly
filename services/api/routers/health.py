"""
Health Probe Router — Suraksha Weekly (PRD §38)

Three Kubernetes-style health probes:

  GET /internal/live    — Liveness:  is the process alive and not deadlocked?
  GET /internal/ready   — Readiness: can the service serve traffic right now?
  GET /internal/startup — Startup:   has the service finished initialisation?

All three share the same ProbeResponse schema.  No authentication is required
on any probe endpoint (Kubernetes / load-balancer callers don't have tokens).

Startup gating: liveness and readiness return HTTP 503 until the startup probe
has completed successfully at least once in this process lifetime.

Degraded mode (/internal/ready):
  MOCK_MODE=true for any external API → degraded=true + reason in
  degraded_reasons.  The P1 escalation path activates after 60 minutes of
  continuous degraded mode (tracked via Redis key health:degraded_since).

─────────────────────────────────────────────────────────────────────────────

GET /health/e2e  (existing endpoint — end-to-end pipeline check)
  See bottom of this file.
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import DatabaseManager, get_db
from core.redis import get_redis
from models import (
    AuditLog,
    Claim,
    FraudAssessment,
    PayoutTransaction,
    Policy,
    RiskProfile,
    TriggerEvent,
    Worker,
)
from services.audit import log_event

logger = logging.getLogger(__name__)
router = APIRouter(tags=["health"])

# ── Module-level startup state (process-lifetime) ─────────────────────────────

_startup_complete:     bool       = False
_startup_steps_cache: list[dict] = []

# Paths for ML model files (resolved relative to this file's parent.parent = api/)
_API_ROOT         = Path(__file__).parent.parent
_PREMIUM_MODEL    = _API_ROOT / "ml" / "models" / "premium_model.pkl"
_FRAUD_MODEL      = _API_ROOT / "ml" / "models" / "fraud_model.pkl"
_ALEMBIC_INI_PATH = str(_API_ROOT / "alembic.ini")

# Redis keys
_DEGRADED_SINCE_KEY = "health:degraded_since"


# ── Response schemas (PRD §38) ────────────────────────────────────────────────

class InitStep(BaseModel):
    """One step in the startup initialisation sequence."""
    step:        str
    status:      str   # "completed" | "failed" | "pending"
    duration_ms: int


class ProbeResponse(BaseModel):
    """Shared response schema for all three health probe endpoints."""
    status:               str            # "ok" | "degraded" | "unavailable"
    service:              str
    timestamp:            str
    checks:               dict[str, str]
    degraded:             bool
    degraded_reasons:     list[str]
    initialization_steps: Optional[list[InitStep]] = None


def _probe_body(
    status:             str,
    checks:             dict[str, str],
    *,
    degraded:           bool        = False,
    degraded_reasons:   list[str]   = (),
    init_steps:         list[dict]  = (),
) -> dict:
    body = {
        "status":           status,
        "service":          "suraksha-api",
        "timestamp":        datetime.utcnow().isoformat() + "Z",
        "checks":           checks,
        "degraded":         degraded,
        "degraded_reasons": list(degraded_reasons),
    }
    if init_steps:
        body["initialization_steps"] = list(init_steps)
    return body


# ── Degraded-mode helpers ─────────────────────────────────────────────────────

def _mock_degraded_reasons() -> list[str]:
    """Collect MOCK_* flag names that indicate degraded-mode operation."""
    reasons: list[str] = []
    if settings.MOCK_WEATHER_DATA:
        reasons.append("weather_api_mock")
    if settings.MOCK_AQI_DATA:
        reasons.append("aqi_api_mock")
    if settings.MOCK_PLATFORM_OUTAGE:
        reasons.append("platform_outage_mock")
    return reasons


async def _handle_degraded_logging(
    redis:           aioredis.Redis,
    degraded_reasons: list[str],
) -> None:
    """
    Persist DEGRADED_MODE_ACTIVE AuditLog and emit P1 after 60 minutes.
    Non-fatal: exceptions are logged and swallowed.
    """
    try:
        now       = datetime.utcnow()
        since_raw = await redis.get(_DEGRADED_SINCE_KEY)
        if not since_raw:
            await redis.set(_DEGRADED_SINCE_KEY, now.isoformat())
            since_raw = now.isoformat()
        since           = datetime.fromisoformat(since_raw)
        elapsed_minutes = int((now - since).total_seconds() / 60)

        if DatabaseManager._session_factory is None:
            return
        async with DatabaseManager._session_factory() as session:
            await log_event(
                session,
                entity_type = "HealthProbe",
                entity_id   = "readiness",
                action      = "DEGRADED_MODE_ACTIVE",
                actor       = "system",
                payload     = {
                    "degraded_reasons":  degraded_reasons,
                    "duration_minutes":  elapsed_minutes,
                },
            )
            if elapsed_minutes > 60:
                await log_event(
                    session,
                    entity_type = "HealthProbe",
                    entity_id   = "readiness",
                    action      = "DEGRADED_ESCALATION_P1",
                    actor       = "system",
                    payload     = {
                        "degraded_reasons": degraded_reasons,
                        "duration_minutes": elapsed_minutes,
                        "since":            since_raw,
                    },
                )
                logger.error(
                    "[health] P1 DEGRADED_ESCALATION — degraded for %d min: %s",
                    elapsed_minutes,
                    degraded_reasons,
                )
            await session.commit()
    except Exception as exc:
        logger.warning("[health] Degraded logging failed (non-fatal): %s", exc)


async def _clear_degraded_flag(redis: aioredis.Redis) -> None:
    try:
        await redis.delete(_DEGRADED_SINCE_KEY)
    except Exception:
        pass


# ── Readiness dependency-check helpers ───────────────────────────────────────

async def _check_db(session: AsyncSession) -> tuple[str, str]:
    """SELECT 1 against PostgreSQL; must respond in <500 ms."""
    try:
        await asyncio.wait_for(
            session.execute(text("SELECT 1")),
            timeout=0.5,
        )
        return "database", "ok"
    except Exception as exc:
        logger.warning("[health/ready] DB check failed: %s", exc)
        return "database", "fail"


async def _check_cache(redis: aioredis.Redis) -> tuple[str, str]:
    """PING Redis; must respond in <200 ms."""
    try:
        await asyncio.wait_for(redis.ping(), timeout=0.2)
        return "cache", "ok"
    except Exception as exc:
        logger.warning("[health/ready] Cache check failed: %s", exc)
        return "cache", "fail"


async def _check_queue(redis: aioredis.Redis) -> tuple[str, str]:
    """Verify Redis pub/sub (trigger_events channel) is reachable in <200 ms."""
    try:
        await asyncio.wait_for(
            redis.execute_command("PUBSUB", "CHANNELS", "trigger_events"),
            timeout=0.2,
        )
        return "queue", "ok"
    except Exception as exc:
        logger.warning("[health/ready] Queue check failed: %s", exc)
        return "queue", "fail"


async def _check_fraud_service(redis: aioredis.Redis) -> tuple[str, str]:
    """
    Check that the fraud model scored within the last 60 s
    (Redis key fraud_service:last_scored_at).

    Returns 'degraded' (not 'fail') when MOCK_MODE=true.
    """
    if settings.MOCK_MODE:
        return "fraud_service", "degraded"
    try:
        val = await asyncio.wait_for(
            redis.get("fraud_service:last_scored_at"),
            timeout=0.2,
        )
        if val is None:
            return "fraud_service", "fail"
        age = (datetime.utcnow() - datetime.fromisoformat(val)).total_seconds()
        if age > 60:
            return "fraud_service", "fail"
        return "fraud_service", "ok"
    except Exception as exc:
        logger.warning("[health/ready] Fraud-service check failed: %s", exc)
        return "fraud_service", "fail"


# ── Startup check helpers ─────────────────────────────────────────────────────

async def _run_alembic_check() -> tuple[bool, str]:
    """
    Compare the current alembic_version in the DB against the expected HEAD.
    Returns (passed: bool, detail: str).
    """
    try:
        from alembic.config import Config as AlembicConfig
        from alembic.script import ScriptDirectory

        cfg    = AlembicConfig(_ALEMBIC_INI_PATH)
        script = ScriptDirectory.from_config(cfg)
        head   = script.get_current_head()

        if DatabaseManager._session_factory is None:
            return False, "DatabaseManager not initialised"

        async with DatabaseManager._session_factory() as session:
            result = await asyncio.wait_for(
                session.execute(text("SELECT version_num FROM alembic_version LIMIT 1")),
                timeout=5.0,
            )
            current = result.scalar_one_or_none()

        if current is None:
            return False, "alembic_version table is empty — migrations may not have run"
        if current != head:
            return False, f"DB schema is at {current!r}, expected {head!r}"
        return True, f"schema={current}"
    except Exception as exc:
        return False, str(exc)


async def _run_redis_startup_check() -> tuple[bool, str]:
    """Attempt a single ping to Redis to confirm connectivity."""
    try:
        client: aioredis.Redis = aioredis.from_url(
            settings.REDIS_URL, decode_responses=True
        )
        try:
            await asyncio.wait_for(client.ping(), timeout=2.0)
            return True, "pong"
        finally:
            await client.aclose()
    except Exception as exc:
        return False, str(exc)


def _run_env_var_check() -> tuple[bool, list[str]]:
    """
    Validate that critical configuration values are present and non-empty.
    Returns (passed, missing_vars).
    """
    critical: list[tuple[str, str]] = [
        ("DATABASE_URL", settings.DATABASE_URL),
        ("REDIS_URL",    settings.REDIS_URL),
        ("JWT_SECRET",   settings.JWT_SECRET),
    ]
    missing = [name for name, val in critical if not val]
    return len(missing) == 0, missing


def _run_ml_model_check() -> tuple[bool, str]:
    """
    Verify the ML model pkl files exist on disk.
    In MOCK_MODE the check passes but marks degraded.
    """
    missing: list[str] = []
    for path in (_PREMIUM_MODEL, _FRAUD_MODEL):
        if not path.exists():
            missing.append(path.name)
    if missing and not settings.MOCK_MODE:
        return False, f"Missing model files: {missing}"
    if missing and settings.MOCK_MODE:
        return True, f"MOCK_MODE: model files missing but proceeding — {missing}"
    return True, "premium_model.pkl, fraud_model.pkl present"


# ── Endpoint helpers ──────────────────────────────────────────────────────────

def _step_result(label: str, t0: float, ok: bool, detail: str = "") -> dict:
    return {
        "step":        label,
        "status":      "completed" if ok else "failed",
        "duration_ms": int((time.perf_counter() - t0) * 1000),
        "detail":      detail,
    }


# ── ENDPOINT 1: GET /internal/live ───────────────────────────────────────────

@router.get(
    "/internal/live",
    response_model=ProbeResponse,
    summary="Liveness probe — is the process alive?",
    description=(
        "Returns HTTP 200 if the event loop is responsive.  "
        "Returns HTTP 503 if a deadlock watchdog detects the loop is unresponsive.  "
        "NO external dependency checks.  Must respond within 500 ms."
    ),
)
async def liveness_probe() -> JSONResponse:
    # Startup gating: don't declare live until startup sequence is done
    if not _startup_complete:
        return JSONResponse(
            status_code=503,
            content=_probe_body(
                "unavailable", {},
                degraded=False,
                degraded_reasons=["startup_incomplete"],
            ),
        )

    # Deadlock watchdog: prove the event loop can yield and resume in <450 ms
    try:
        t = time.perf_counter()
        await asyncio.wait_for(asyncio.sleep(0), timeout=0.45)
        loop_ms = int((time.perf_counter() - t) * 1000)
    except asyncio.TimeoutError:
        logger.error("[health/live] Event-loop deadlock detected — returning 503")
        return JSONResponse(
            status_code=503,
            content=_probe_body(
                "unavailable",
                {"event_loop": "deadlocked"},
                degraded=False,
                degraded_reasons=["event_loop_unresponsive"],
            ),
        )

    return JSONResponse(
        status_code=200,
        content=_probe_body("ok", {}, degraded=False, degraded_reasons=[]),
    )


# ── ENDPOINT 2: GET /internal/ready ──────────────────────────────────────────

@router.get(
    "/internal/ready",
    response_model=ProbeResponse,
    summary="Readiness probe — can the service serve traffic?",
    description=(
        "Runs database, cache, queue, and fraud-service checks concurrently "
        "within a 2-second total budget.  Returns 200 if all pass, 503 otherwise.  "
        "In MOCK_MODE, returns 200 with degraded=true."
    ),
)
async def readiness_probe(
    session: AsyncSession   = Depends(get_db),
    redis:   aioredis.Redis = Depends(get_redis),
) -> JSONResponse:
    # Startup gating
    if not _startup_complete:
        return JSONResponse(
            status_code=503,
            content=_probe_body(
                "unavailable", {},
                degraded=False,
                degraded_reasons=["startup_incomplete"],
            ),
        )

    # ── Run all four checks within a 2-second total budget ───────────────────
    try:
        results = await asyncio.wait_for(
            asyncio.gather(
                _check_db(session),
                _check_cache(redis),
                _check_queue(redis),
                _check_fraud_service(redis),
                return_exceptions=True,
            ),
            timeout=2.0,
        )
    except asyncio.TimeoutError:
        results = [
            ("database",      "fail"),
            ("cache",         "fail"),
            ("queue",         "fail"),
            ("fraud_service", "fail"),
        ]

    # Unwrap exceptions from gather
    checks: dict[str, str] = {}
    for item in results:
        if isinstance(item, Exception):
            logger.warning("[health/ready] Unexpected exception in gather: %s", item)
        elif isinstance(item, tuple):
            name, status = item
            checks[name] = status

    # ── Determine overall status ──────────────────────────────────────────────
    failed_checks = [k for k, v in checks.items() if v == "fail"]
    degraded_reasons = _mock_degraded_reasons()

    # fraud_service='degraded' counts as passing but adds to degraded_reasons
    if checks.get("fraud_service") == "degraded":
        degraded_reasons.append("fraud_service_mock")
        checks["fraud_service"] = "ok"   # normalise for schema

    if failed_checks:
        logger.warning("[health/ready] Checks failed: %s", failed_checks)
        return JSONResponse(
            status_code=503,
            content=_probe_body(
                "unavailable",
                checks,
                degraded=False,
                degraded_reasons=[f"{k}_fail" for k in failed_checks],
            ),
        )

    if degraded_reasons:
        asyncio.create_task(_handle_degraded_logging(redis, degraded_reasons))
        return JSONResponse(
            status_code=200,
            content=_probe_body(
                "degraded",
                checks,
                degraded=True,
                degraded_reasons=degraded_reasons,
            ),
        )

    # All checks passed, not degraded — clear any lingering degraded flag
    asyncio.create_task(_clear_degraded_flag(redis))
    return JSONResponse(
        status_code=200,
        content=_probe_body("ok", checks, degraded=False, degraded_reasons=[]),
    )


# ── ENDPOINT 3: GET /internal/startup ────────────────────────────────────────

@router.get(
    "/internal/startup",
    response_model=ProbeResponse,
    summary="Startup probe — has the service finished initialisation?",
    description=(
        "Returns HTTP 503 during init, HTTP 200 only after ALL startup steps "
        "succeed: Alembic migration check, Redis ping, ENV-var validation, "
        "and ML model file verification."
    ),
)
async def startup_probe() -> JSONResponse:
    global _startup_complete, _startup_steps_cache   # noqa: PLW0603

    # If already done, return cached result immediately
    if _startup_complete:
        return JSONResponse(
            status_code=200,
            content=_probe_body(
                "ok", {},
                degraded=False,
                degraded_reasons=[],
                init_steps=_startup_steps_cache,
            ),
        )

    steps: list[dict]         = []
    all_ok:        bool       = True
    degraded_reasons: list[str] = []

    async def _run_all() -> None:
        nonlocal all_ok

        # ── Step 1: Alembic migration ───────────────────────────────────────
        t = time.perf_counter()
        ok, detail = await _run_alembic_check()
        steps.append(_step_result("alembic_migration", t, ok, detail))
        if not ok:
            all_ok = False

        # ── Step 2: Redis connectivity ──────────────────────────────────────
        t = time.perf_counter()
        ok, detail = await _run_redis_startup_check()
        steps.append(_step_result("redis_connection", t, ok, detail))
        if not ok:
            all_ok = False

        # ── Step 3: ENV vars ────────────────────────────────────────────────
        t = time.perf_counter()
        ok, missing = _run_env_var_check()
        detail = "all critical vars present" if ok else f"missing: {missing}"
        steps.append(_step_result("environment_variables", t, ok, detail))
        if not ok:
            all_ok = False
            # Fail-fast: missing critical var → raise startup failure
            logger.error("[health/startup] Missing critical ENV vars: %s", missing)

        # ── Step 4: ML model files ──────────────────────────────────────────
        t = time.perf_counter()
        ok, detail = _run_ml_model_check()
        steps.append(_step_result("ml_model_files", t, ok, detail))
        if "MOCK_MODE" in detail:
            degraded_reasons.append("ml_models_mock")
        if not ok:
            all_ok = False

    timeout_s = getattr(settings, "STARTUP_TIMEOUT_SECONDS", 60)
    try:
        await asyncio.wait_for(_run_all(), timeout=float(timeout_s))
    except asyncio.TimeoutError:
        steps.append({
            "step":        "startup_timeout",
            "status":      "failed",
            "duration_ms": int(timeout_s * 1000),
            "detail":      f"Startup exceeded {timeout_s}s timeout",
        })
        all_ok = False

    if all_ok:
        _startup_complete     = True
        _startup_steps_cache  = steps
        logger.info("[health/startup] Startup checks PASSED — service is ready.")
        return JSONResponse(
            status_code=200,
            content=_probe_body(
                "degraded" if degraded_reasons else "ok",
                {},
                degraded=bool(degraded_reasons),
                degraded_reasons=degraded_reasons,
                init_steps=steps,
            ),
        )

    failed_steps = [s["step"] for s in steps if s["status"] == "failed"]
    logger.error("[health/startup] Startup checks FAILED: %s", failed_steps)
    return JSONResponse(
        status_code=503,
        content=_probe_body(
            "unavailable",
            {},
            degraded=False,
            degraded_reasons=[f"{s}_failed" for s in failed_steps],
            init_steps=steps,
        ),
    )


# ─────────────────────────────────────────────────────────────────────────────
# Existing E2E pipeline health check (kept unmodified)
# ─────────────────────────────────────────────────────────────────────────────

# ── Schemas ───────────────────────────────────────────────────────────────────

class StepResult(BaseModel):
    step:       str
    status:     str        # "ok" | "failed" | "skipped"
    latency_ms: int
    detail:     str = ""


class E2EHealthResponse(BaseModel):
    status:  str             # "healthy" | "degraded"
    steps:   list[StepResult]
    total_ms: int


# ── Helpers ───────────────────────────────────────────────────────────────────

def _step(label: str, t0: int, ok: bool, detail: str = "") -> StepResult:
    ms = int((time.perf_counter_ns() - t0) / 1_000_000)
    return StepResult(
        step       = label,
        status     = "ok" if ok else "failed",
        latency_ms = ms,
        detail     = detail,
    )


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.get(
    "/health/e2e",
    response_model=E2EHealthResponse,
    summary="End-to-end pipeline health check",
    description=(
        "Executes the complete claim pipeline using ephemeral test data.  "
        "All created rows are deleted before the response is returned. "
        "Use this before a live demo to confirm every service layer is healthy."
    ),
)
async def e2e_health_check() -> E2EHealthResponse:
    if DatabaseManager._session_factory is None:
        return E2EHealthResponse(
            status   = "degraded",
            steps    = [StepResult(step="db_ready", status="failed",
                                   latency_ms=0, detail="DatabaseManager not initialised")],
            total_ms = 0,
        )

    overall_start = time.perf_counter_ns()
    steps: list[StepResult] = []

    # Bookkeeping — tracked IDs for cleanup
    worker_id:  Optional[str] = None
    policy_id:  Optional[str] = None
    trigger_id: Optional[str] = None
    claim_id:   Optional[str] = None

    # ── Step 1: Create test worker ────────────────────────────────────────────
    t = time.perf_counter_ns()
    try:
        async with DatabaseManager._session_factory() as session:
            worker_id = str(uuid.uuid4())
            worker = Worker(
                id                 = worker_id,
                phone              = "+91-0000-E2E-TEST",
                name               = "E2E Health Check Bot",
                city               = "Bengaluru",
                service_zones      = ["Koramangala"],
                platform_type      = "Zomato",
                avg_daily_hours    = 8.0,
                avg_weekly_earnings= 4000.0,
                device_fingerprint = "e2e_test_device",
                trust_score        = 90.0,
                trust_tier         = "standard",
            )
            session.add(worker)
            await session.commit()
        steps.append(_step("create_test_worker", t, ok=True, detail=f"worker_id={worker_id[:8]}"))
    except Exception as exc:
        steps.append(_step("create_test_worker", t, ok=False, detail=str(exc)))
        logger.exception("[e2e] create_test_worker failed: %s", exc)

    # ── Step 2: Generate pricing quote ────────────────────────────────────────
    t = time.perf_counter_ns()
    quote_ok = False
    if worker_id:
        try:
            from services.pricing_service import compute_weekly_premium
            async with DatabaseManager._session_factory() as session:
                quote = await compute_weekly_premium(worker_id, session)
                quote_ok = bool(quote and quote.get("plans"))
            steps.append(_step("generate_pricing_quote", t, ok=quote_ok,
                               detail=f"plans={len(quote.get('plans', []))}"))
        except Exception as exc:
            steps.append(_step("generate_pricing_quote", t, ok=False, detail=str(exc)))
            logger.exception("[e2e] generate_pricing_quote failed: %s", exc)
    else:
        steps.append(StepResult(step="generate_pricing_quote", status="skipped", latency_ms=0))

    # ── Step 3: Create active policy ──────────────────────────────────────────
    t = time.perf_counter_ns()
    if worker_id:
        try:
            async with DatabaseManager._session_factory() as session:
                policy_id = str(uuid.uuid4())
                now = datetime.utcnow()
                policy = Policy(
                    id             = policy_id,
                    worker_id      = worker_id,
                    plan_variant   = "standard",
                    status         = "active",
                    weekly_premium = 399.0,
                    coverage_cap   = 8000.0,
                    start_date     = now - timedelta(days=1),
                    end_date       = now + timedelta(days=6),
                    renewal_count  = 0,
                    waiting_period_until = now - timedelta(hours=25),
                )
                session.add(policy)
                await session.commit()
            steps.append(_step("create_active_policy", t, ok=True, detail=f"policy_id={policy_id[:8]}"))
        except Exception as exc:
            steps.append(_step("create_active_policy", t, ok=False, detail=str(exc)))
            logger.exception("[e2e] create_active_policy failed: %s", exc)
    else:
        steps.append(StepResult(step="create_active_policy", status="skipped", latency_ms=0))

    # ── Step 4: Create TriggerEvent ───────────────────────────────────────────
    t = time.perf_counter_ns()
    if policy_id:
        try:
            async with DatabaseManager._session_factory() as session:
                trigger_id = str(uuid.uuid4())
                trigger = TriggerEvent(
                    id               = trigger_id,
                    type             = "HeavyRain",
                    zone             = "Koramangala",
                    value            = 9.5,
                    threshold        = 5.0,
                    confidence_score = 0.92,
                    sources          = ["e2e_test"],
                    status           = "active",
                    triggered_at     = datetime.utcnow(),
                    audit_snapshot   = {
                        "city": "Bengaluru",
                        "zone": "Koramangala",
                        "trigger_type": "HeavyRain",
                        "measured_value": 9.5,
                        "threshold": 5.0,
                        "confidence_score": 0.92,
                        "sources": ["e2e_test"],
                        "mock_mode": True,
                        "e2e_test": True,
                    },
                )
                session.add(trigger)
                await session.commit()
            steps.append(_step("create_trigger_event", t, ok=True, detail=f"trigger_id={trigger_id[:8]}"))
        except Exception as exc:
            steps.append(_step("create_trigger_event", t, ok=False, detail=str(exc)))
            logger.exception("[e2e] create_trigger_event failed: %s", exc)
    else:
        steps.append(StepResult(step="create_trigger_event", status="skipped", latency_ms=0))

    # ── Step 5: Run claim orchestration ───────────────────────────────────────
    t = time.perf_counter_ns()
    orch_ok = False
    if trigger_id:
        redis_client: aioredis.Redis | None = None
        try:
            from services.claim_orchestrator import orchestrate_claims
            redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            async with DatabaseManager._session_factory() as session:
                await orchestrate_claims(trigger_id, session, redis_client)
                orch_ok = True
            steps.append(_step("run_claim_orchestration", t, ok=True))
        except Exception as exc:
            steps.append(_step("run_claim_orchestration", t, ok=False, detail=str(exc)))
            logger.exception("[e2e] run_claim_orchestration failed: %s", exc)
        finally:
            if redis_client:
                await redis_client.aclose()
    else:
        steps.append(StepResult(step="run_claim_orchestration", status="skipped", latency_ms=0))

    # ── Step 6: Verify claim was created ─────────────────────────────────────
    t = time.perf_counter_ns()
    claim_found = False
    if trigger_id and orch_ok:
        try:
            async with DatabaseManager._session_factory() as session:
                q = await session.execute(
                    select(Claim.id, Claim.status).where(
                        Claim.trigger_event_id == trigger_id,
                        Claim.worker_id        == worker_id,
                    ).limit(1)
                )
                row = q.first()
                if row:
                    claim_id    = row[0]
                    claim_status = row[1]
                    claim_found  = True
                    steps.append(_step("verify_claim_created", t, ok=True,
                                       detail=f"status={claim_status}"))
                else:
                    steps.append(_step("verify_claim_created", t, ok=False,
                                       detail="No claim found for this trigger+worker"))
        except Exception as exc:
            steps.append(_step("verify_claim_created", t, ok=False, detail=str(exc)))
    else:
        steps.append(StepResult(step="verify_claim_created", status="skipped", latency_ms=0))

    # ── Step 7: Verify payout was initiated ───────────────────────────────────
    t = time.perf_counter_ns()
    if claim_id and claim_found:
        try:
            async with DatabaseManager._session_factory() as session:
                q = await session.execute(
                    select(PayoutTransaction.id, PayoutTransaction.status,
                           PayoutTransaction.amount).where(
                        PayoutTransaction.claim_id == claim_id,
                    ).limit(1)
                )
                row = q.first()
                if row:
                    steps.append(_step("verify_payout_initiated", t, ok=True,
                                       detail=f"status={row[1]}  amount=₹{row[2]:.0f}"))
                else:
                    async with DatabaseManager._session_factory() as cs:
                        cq = await cs.execute(
                            select(Claim.status).where(Claim.id == claim_id)
                        )
                        crow = cq.scalar_one_or_none()
                    if crow in ("in_review", "blocked", "initiated"):
                        steps.append(_step("verify_payout_initiated", t, ok=True,
                                           detail=f"claim_status={crow} — no payout expected (fraud-hold path)"))
                    else:
                        steps.append(_step("verify_payout_initiated", t, ok=False,
                                           detail="PayoutTransaction not found for approved claim"))
        except Exception as exc:
            steps.append(_step("verify_payout_initiated", t, ok=False, detail=str(exc)))
    else:
        steps.append(StepResult(step="verify_payout_initiated", status="skipped", latency_ms=0))

    # ── Cleanup: delete all test rows in reverse dependency order ─────────────
    t = time.perf_counter_ns()
    cleanup_errors: list[str] = []
    async with DatabaseManager._session_factory() as session:
        try:
            if trigger_id:
                payout_claim_ids: list[str] = []
                cq = await session.execute(
                    select(Claim.id).where(Claim.trigger_event_id == trigger_id)
                )
                payout_claim_ids = [r[0] for r in cq.all()]
                if payout_claim_ids:
                    await session.execute(
                        delete(PayoutTransaction).where(
                            PayoutTransaction.claim_id.in_(payout_claim_ids)
                        )
                    )
                    await session.execute(
                        delete(FraudAssessment).where(
                            FraudAssessment.claim_id.in_(payout_claim_ids)
                        )
                    )
                    await session.execute(
                        delete(AuditLog).where(
                            AuditLog.entity_id.in_(payout_claim_ids)
                        )
                    )
                    await session.execute(
                        delete(Claim).where(Claim.trigger_event_id == trigger_id)
                    )
                await session.execute(
                    delete(TriggerEvent).where(TriggerEvent.id == trigger_id)
                )
            if policy_id:
                await session.execute(delete(Policy).where(Policy.id == policy_id))
            if worker_id:
                await session.execute(
                    delete(RiskProfile).where(RiskProfile.worker_id == worker_id)
                )
                await session.execute(
                    delete(AuditLog).where(AuditLog.entity_id == worker_id)
                )
                await session.execute(delete(Worker).where(Worker.id == worker_id))
            await session.commit()
        except Exception as exc:
            await session.rollback()
            cleanup_errors.append(str(exc))
            logger.exception("[e2e] cleanup failed: %s", exc)

    cleanup_ok = len(cleanup_errors) == 0
    steps.append(_step("cleanup_test_data", t, ok=cleanup_ok,
                        detail="" if cleanup_ok else "; ".join(cleanup_errors)))

    # ── Determine overall status ──────────────────────────────────────────────
    critical_steps = {
        "create_test_worker", "create_active_policy",
        "create_trigger_event", "run_claim_orchestration", "verify_claim_created",
    }
    failed = [s for s in steps if s.status == "failed" and s.step in critical_steps]
    overall_status = "healthy" if not failed else "degraded"
    total_ms = int((time.perf_counter_ns() - overall_start) / 1_000_000)

    if overall_status == "healthy":
        logger.info("[e2e] Health check PASSED in %d ms", total_ms)
    else:
        logger.warning("[e2e] Health check DEGRADED — failed steps: %s", [s.step for s in failed])

    return E2EHealthResponse(
        status   = overall_status,
        steps    = steps,
        total_ms = total_ms,
    )

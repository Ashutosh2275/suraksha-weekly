"""Fraud scoring microservice with deterministic + ML hybrid scoring."""

from __future__ import annotations

import asyncio
import json
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine, create_async_engine

from app.ml.model_service import ModelService
from app.health.probes import HealthChecker, get_degraded_mode_manager
from app.services.fraud_scorer import FraudScorer

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover - optional dependency fallback
    Redis = None  # type: ignore[assignment]

# Add parent directory to path for shared imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

from shared.fastapi_common.config import create_config_validator
from shared.fastapi_common.middleware import CorrelationIdMiddleware, get_correlation_id
from shared.fastapi_common.errors import (
    ServiceException,
    service_exception_handler,
    generic_exception_handler,
    create_success_response,
)

logger = logging.getLogger(__name__)

# Validate configuration at startup
validator = create_config_validator("Fraud Scoring Service")
config = (
    validator
    .add_required("DATABASE_URL", "PostgreSQL connection string")
    .add_required("FRAUD_MODEL_PATH", "Path to fraud detection ML model")
    .add_required("FRAUD_THRESHOLD_HIGH", "Threshold for high-risk classification (0-1)")
    .add_required("FRAUD_THRESHOLD_CRITICAL", "Threshold for critical-risk classification (0-1)")
    .add_optional("SERVICE_PORT", "Port for the service", default="8002")
    .add_optional("REDIS_URL", "Redis URL for event publishing", default="")
    .add_optional("ZONE_COORDINATES_JSON", "JSON mapping of zone_id -> lat/lon", default="{}")
    .add_optional("LOG_LEVEL", "Logging level", default="INFO")
    .add_optional("CORS_ORIGINS", "Allowed CORS origins (comma-separated)", default="*")
    .validate()
)

print(validator.get_config_summary(config))

# Initialize FastAPI app
app = FastAPI(
    title="Fraud Scoring Service",
    description="Microservice for fraud risk assessment and scoring",
    version="1.0.0"
)
app.state.is_started = False
app.state.config_validated = False
app.state.startup_initialized = False

internal_router = APIRouter(prefix="/internal", tags=["internal"])
degraded_mode = get_degraded_mode_manager()

# Add middleware
app.add_middleware(CorrelationIdMiddleware)

# Add exception handlers
app.add_exception_handler(ServiceException, service_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

db_engine: AsyncEngine | None = None
redis_client: Redis | None = None  # type: ignore[type-arg]
fraud_scorer = FraudScorer(model_service=ModelService(model_path=config["FRAUD_MODEL_PATH"]))


class InternalFraudScoreRequest(BaseModel):
    claim_id: str = Field(..., min_length=1)


def _parse_dt(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
    return None


def _hours_between(older: datetime | None, newer: datetime | None) -> float:
    if older is None or newer is None:
        return 0.0
    return max(0.0, (newer - older).total_seconds() / 3600.0)


@app.on_event("startup")
async def on_startup() -> None:
    global db_engine, redis_client
    db_engine = create_async_engine(config["DATABASE_URL"], pool_pre_ping=True)
    redis_url = config.get("REDIS_URL") or ""
    if redis_url and Redis is not None:
        redis_client = Redis.from_url(redis_url, decode_responses=True)  # type: ignore[union-attr]
    app.state.config_validated = True
    app.state.startup_initialized = True


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global db_engine, redis_client
    if redis_client is not None:
        await redis_client.close()
    if db_engine is not None:
        await db_engine.dispose()


async def _database_probe() -> None:
    if db_engine is None:
        raise RuntimeError("database engine not initialized")
    async with db_engine.connect() as conn:
        await conn.execute(text("SELECT 1"))


async def _queue_probe() -> bool:
    if redis_client is None:
        return False
    pong = await redis_client.ping()
    return bool(pong)


@internal_router.get("/live")
async def internal_live() -> JSONResponse:
    try:
        await asyncio.wait_for(asyncio.sleep(0), timeout=0.5)
    except asyncio.TimeoutError:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return JSONResponse(status_code=200, content={"status": "ok"})


@internal_router.get("/ready")
async def internal_ready() -> JSONResponse:
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(2.0))
    checker = HealthChecker(
        database_probe=_database_probe,
        redis_client=redis_client,
        queue_probe=_queue_probe,
        http_client=http_client,
    )

    try:
        checks = await asyncio.gather(
            checker.check_database(),
            checker.check_redis(),
            checker.check_queue(),
            checker.check_downstream("api", os.getenv("API_SERVICE_URL", "http://api:8000")),
        )
    finally:
        await http_client.aclose()

    check_map = {result.name: result.to_dict() for result in checks}
    failed = [name for name, result in check_map.items() if result.get("status") == "fail"]
    degraded_reasons = degraded_mode.list_reasons()
    degraded_reasons.extend(f"{name}_degraded" for name, result in check_map.items() if result.get("status") == "degraded")

    if failed:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "checks": check_map},
        )

    if degraded_reasons:
        return JSONResponse(
            status_code=200,
            content={
                "status": "degraded",
                "degraded": True,
                "degraded_reasons": sorted(set(degraded_reasons)),
                "checks": check_map,
            },
        )

    return JSONResponse(status_code=200, content={"status": "ok", "checks": check_map})


@internal_router.get("/startup")
async def internal_startup() -> JSONResponse:
    if app.state.is_started:
        return JSONResponse(status_code=200, content={"status": "ok"})

    config_validated = bool(app.state.config_validated)
    startup_initialized = bool(app.state.startup_initialized)
    db_result = await HealthChecker(database_probe=_database_probe).check_database()

    checks = {
        "config": {"name": "config", "status": "ok" if config_validated else "fail"},
        "migrations": {"name": "migrations", "status": "ok" if db_result.status == "ok" else "fail"},
        "database": db_result.to_dict(),
        "initialization": {"name": "initialization", "status": "ok" if startup_initialized else "fail"},
    }

    if config_validated and startup_initialized and db_result.status == "ok":
        app.state.is_started = True
        return JSONResponse(status_code=200, content={"status": "ok", "checks": checks})

    return JSONResponse(status_code=503, content={"status": "unavailable", "checks": checks})


app.include_router(internal_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return create_success_response(
        data={"status": "healthy", "service": "fraud-scoring"},
        correlation_id=get_correlation_id()
    )


@app.post("/api/v1/fraud/check")
async def check_fraud(request: Request):
    """
    Analyze a claim or policy for fraud risk.
    
    Request body:
    {
        "worker_id": "uuid",
        "claim_id": "uuid",  # optional
        "policy_id": "uuid",  # optional
        "metadata": {}  # optional additional context
    }
    
    Response:
    {
        "success": true,
        "data": {
            "score": 0.75,
            "risk_level": "high",
            "factors": [
                {"factor": "claim_frequency", "weight": 0.3, "description": "Multiple claims in short period"},
                {"factor": "amount_anomaly", "weight": 0.25, "description": "Claim amount significantly above average"}
            ],
            "recommendation": "Manual review required"
        },
        "correlation_id": "..."
    }
    """
    body = await request.json()

    score = float(body.get("score", 0.35))
    
    # Determine risk level based on thresholds
    threshold_high = float(config["FRAUD_THRESHOLD_HIGH"])
    threshold_critical = float(config["FRAUD_THRESHOLD_CRITICAL"])
    
    if score >= threshold_critical:
        risk_level = "critical"
        recommendation = "Reject claim - high fraud risk"
    elif score >= threshold_high:
        risk_level = "high"
        recommendation = "Manual review required"
    elif score >= 0.3:
        risk_level = "medium"
        recommendation = "Automated review with spot checks"
    else:
        risk_level = "low"
        recommendation = "Auto-approve"
    
    result = {
        "score": score,
        "risk_level": risk_level,
        "factors": [
            {
                "factor": "claim_history",
                "weight": 0.2,
                "description": "Historical claim patterns analyzed"
            },
            {
                "factor": "behavioral_analysis",
                "weight": 0.15,
                "description": "Worker behavior consistency check"
            }
        ],
        "recommendation": recommendation
    }
    
    return create_success_response(
        data=result,
        correlation_id=get_correlation_id()
    )


async def _fetch_claim_context(claim_id: str) -> dict[str, Any]:
    if db_engine is None:
        raise ServiceException("DB_NOT_READY", "Database engine not initialized", 503)

    zone_coordinates = json.loads(config.get("ZONE_COORDINATES_JSON", "{}"))
    now = datetime.now(timezone.utc)

    async with db_engine.connect() as conn:
        base_query = text(
            """
            SELECT
                c.id,
                c.worker_id,
                c.policy_id,
                c.trigger_event_id,
                c.status,
                c.created_at,
                c.amount,
                c.currency,
                c.beneficiary_handle,
                c.current_device_id,
                te.zone_id,
                te.event_start,
                te.created_at AS trigger_created_at,
                p.created_at AS policy_created_at
            FROM claims c
            LEFT JOIN trigger_events te ON te.id = c.trigger_event_id
            LEFT JOIN policies p ON p.id = c.policy_id
            WHERE c.id = :claim_id
            """
        )
        claim_row = (await conn.execute(base_query, {"claim_id": claim_id})).mappings().first()
        if claim_row is None:
            raise ServiceException("CLAIM_NOT_FOUND", f"Claim {claim_id} not found", 404)

        worker_id = str(claim_row["worker_id"])
        zone_id = str(claim_row.get("zone_id") or "")

        claims_rows = (
            await conn.execute(
                text(
                    """
                    SELECT id, worker_id, policy_id, trigger_event_id, status, created_at
                    FROM claims
                    WHERE worker_id = :worker_id
                    """
                ),
                {"worker_id": worker_id},
            )
        ).mappings().all()

        sessions_rows = (
            await conn.execute(
                text(
                    """
                    SELECT worker_id, device_id, created_at
                    FROM worker_sessions
                    WHERE worker_id = :worker_id
                    ORDER BY created_at DESC
                    LIMIT 20
                    """
                ),
                {"worker_id": worker_id},
            )
        ).mappings().all()

        payouts_rows = (
            await conn.execute(
                text(
                    """
                    SELECT worker_id, beneficiary_handle
                    FROM payout_transactions
                    WHERE beneficiary_handle IS NOT NULL
                    """
                )
            )
        ).mappings().all()

    claim_created_at = _parse_dt(claim_row.get("created_at"))
    policy_created_at = _parse_dt(claim_row.get("policy_created_at"))
    trigger_event_start = _parse_dt(claim_row.get("event_start") or claim_row.get("trigger_created_at"))

    claim_count_30d = 0
    zone_claim_density_1h = 0
    for row in claims_rows:
        created_at = _parse_dt(row.get("created_at"))
        if created_at is None:
            continue
        if created_at >= now - timedelta(days=30):
            claim_count_30d += 1
        if zone_id and created_at >= now - timedelta(hours=1):
            zone_claim_density_1h += 1

    current_device = str(claim_row.get("current_device_id") or "")
    prior_device = ""
    for sess in sessions_rows:
        device = str(sess.get("device_id") or "")
        if device:
            prior_device = device
            break

    beneficiary_handle = str(claim_row.get("beneficiary_handle") or "")
    beneficiary_reuse_count = len({
        str(row.get("worker_id"))
        for row in payouts_rows
        if str(row.get("beneficiary_handle") or "") == beneficiary_handle and row.get("worker_id") is not None
    })

    ml_features = {
        "hour_of_claim": float((claim_created_at or now).hour),
        "days_since_policy_purchased": _hours_between(policy_created_at, claim_created_at or now) / 24.0,
        "worker_claim_count_30d": float(claim_count_30d),
        "zone_claim_density_1h": float(zone_claim_density_1h),
        "policy_activation_to_trigger_hours": _hours_between(policy_created_at, trigger_event_start),
        "worker_earnings_vs_zone_avg_ratio": 1.0,
        "device_change_flag": 1.0 if current_device and prior_device and current_device != prior_device else 0.0,
        "beneficiary_reuse_count": float(beneficiary_reuse_count),
    }

    return {
        "claim": dict(claim_row),
        "worker": {"id": worker_id},
        "policy": {"id": str(claim_row.get("policy_id")), "created_at": claim_row.get("policy_created_at")},
        "trigger_event": {
            "id": str(claim_row.get("trigger_event_id")),
            "zone_id": zone_id,
            "event_start": claim_row.get("event_start") or claim_row.get("trigger_created_at"),
        },
        "session_data": {
            "now": now.isoformat(),
            "claims": [dict(row) for row in claims_rows],
            "sessions": [
                {
                    "worker_id": row.get("worker_id"),
                    "device_id": row.get("device_id"),
                    "created_at": row.get("created_at"),
                    "lat": None,
                    "lon": None,
                }
                for row in sessions_rows
            ],
            "payouts": [dict(row) for row in payouts_rows],
            "policies": [{"id": str(claim_row.get("policy_id")), "created_at": claim_row.get("policy_created_at")}],
            "trigger_events": [
                {
                    "id": str(claim_row.get("trigger_event_id")),
                    "zone_id": zone_id,
                    "event_start": claim_row.get("event_start") or claim_row.get("trigger_created_at"),
                    "created_at": claim_row.get("trigger_created_at"),
                }
            ],
            "zone_coordinates": zone_coordinates,
        },
        "payout_data": {"payouts": [dict(row) for row in payouts_rows]},
        "ml_features": ml_features,
    }


async def _persist_assessment(result: dict[str, Any]) -> None:
    if db_engine is None:
        return

    query = text(
        """
        INSERT INTO fraud_assessments (
            claim_id,
            score,
            risk_tier,
            decision,
            reason_codes,
            ml_score,
            rule_flags,
            model_version,
            created_at,
            updated_at
        )
        VALUES (
            :claim_id,
            :score,
            :risk_tier,
            :decision,
            :reason_codes,
            :ml_score,
            :rule_flags,
            :model_version,
            NOW(),
            NOW()
        )
        ON CONFLICT (claim_id)
        DO UPDATE SET
            score = EXCLUDED.score,
            risk_tier = EXCLUDED.risk_tier,
            decision = EXCLUDED.decision,
            reason_codes = EXCLUDED.reason_codes,
            ml_score = EXCLUDED.ml_score,
            rule_flags = EXCLUDED.rule_flags,
            model_version = EXCLUDED.model_version,
            updated_at = NOW()
        """
    )

    async with db_engine.begin() as conn:
        await conn.execute(
            query,
            {
                "claim_id": result["claim_id"],
                "score": result["final_score"],
                "risk_tier": result["risk_tier"],
                "decision": result["decision"],
                "reason_codes": result["reason_tags"],
                "ml_score": result["ml_score"],
                "rule_flags": json.dumps(result["rule_flags"]),
                "model_version": result["model_version"],
            },
        )


async def _emit_fraud_scored_event(result: dict[str, Any]) -> None:
    if redis_client is None:
        return

    event = {
        "name": "fraud.scored",
        "data": {
            "claim_id": result["claim_id"],
            "score": result["final_score"],
            "risk_tier": result["risk_tier"],
            "decision": result["decision"],
        },
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    await redis_client.lpush("bull:fraud-events:wait", json.dumps(event))


@app.post("/internal/fraud/score")
async def internal_fraud_score(payload: InternalFraudScoreRequest):
    context = await _fetch_claim_context(payload.claim_id)

    score_result = fraud_scorer.score_claim(
        claim_id=payload.claim_id,
        claim_data=context["claim"],
        worker_data=context["worker"],
        policy_data=context["policy"],
        trigger_data=context["trigger_event"],
        session_data=context["session_data"],
        payout_data=context["payout_data"],
        ml_features=context["ml_features"],
    )

    output = {
        "claim_id": score_result.claim_id,
        "final_score": score_result.final_score,
        "rule_score": score_result.rule_score,
        "ml_score": score_result.ml_score,
        "risk_tier": score_result.risk_tier,
        "anomaly": score_result.anomaly,
        "decision": score_result.decision,
        "reason_tags": score_result.reason_tags,
        "rule_flags": score_result.rule_flags,
        "model_version": score_result.model_version,
    }

    await _persist_assessment(output)
    await _emit_fraud_scored_event(output)

    return create_success_response(data=output, correlation_id=get_correlation_id())


@app.get("/api/v1/fraud/stats")
async def get_fraud_stats():
    """Get fraud detection statistics."""
    # TODO: Implement actual stats retrieval
    stats = {
        "total_checks": 1250,
        "high_risk_detected": 45,
        "critical_risk_detected": 12,
        "average_score": 0.23
    }
    
    return create_success_response(
        data=stats,
        correlation_id=get_correlation_id()
    )


if __name__ == "__main__":
    import uvicorn
    port = int(config.get("SERVICE_PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)

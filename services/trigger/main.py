"""
Trigger Ingestion Service

Ingests external trigger events (weather, traffic, disruptions) and evaluates
whether they meet parametric insurance trigger criteria.
"""

import asyncio
from fastapi import APIRouter, FastAPI, Request
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Optional, List
import sys
import os
import httpx

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
    ValidationException,
    service_exception_handler,
    generic_exception_handler,
    create_success_response,
)
from app.health.probes import HealthChecker, get_degraded_mode_manager

# Validate configuration at startup
validator = create_config_validator("Trigger Ingestion Service")
config = (
    validator
    .add_required("DATABASE_URL", "PostgreSQL connection string")
    .add_required("OPENWEATHER_API_KEY", "OpenWeather API key for weather data")
    .add_required("OPENWEATHER_API_URL", "OpenWeather API base URL")
    .add_optional("OPENAQ_API_URL", "OpenAQ API base URL for air quality", default="https://api.openaq.org/v2")
    .add_optional("TRIGGER_HEAVY_RAIN_MM", "Heavy rain trigger threshold in mm/hour", default="5.0")
    .add_optional("TRIGGER_EXTREME_HEAT_C", "Extreme heat trigger threshold in Celsius", default="42.0")
    .add_optional("TRIGGER_POLLUTION_AQI", "Severe pollution AQI threshold", default="300")
    .add_optional("SERVICE_PORT", "Port for the service", default="8003")
    .add_optional("REDIS_URL", "Redis URL for cache and queue checks", default="")
    .add_optional("LOG_LEVEL", "Logging level", default="INFO")
    .add_optional("CORS_ORIGINS", "Allowed CORS origins (comma-separated)", default="*")
    .validate()
)

print(validator.get_config_summary(config))

# Initialize FastAPI app
app = FastAPI(
    title="Trigger Ingestion Service",
    description="Ingests and evaluates parametric insurance triggers",
    version="1.0.0"
)
app.state.is_started = False
app.state.config_validated = False
app.state.startup_initialized = False

internal_router = APIRouter()
degraded_mode = get_degraded_mode_manager()
redis_client: Redis | None = None  # type: ignore[type-arg]

# Add middleware
app.add_middleware(CorrelationIdMiddleware)

# Add exception handlers
app.add_exception_handler(ServiceException, service_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


@app.on_event("startup")
async def on_startup() -> None:
    global redis_client
    redis_url = config.get("REDIS_URL") or ""
    if redis_url and Redis is not None:
        redis_client = Redis.from_url(redis_url, decode_responses=True)  # type: ignore[union-attr]
    app.state.config_validated = True
    app.state.startup_initialized = True


@app.on_event("shutdown")
async def on_shutdown() -> None:
    global redis_client
    if redis_client is not None:
        await redis_client.close()


async def _queue_probe() -> bool:
    if redis_client is None:
        return False
    pong = await redis_client.ping()
    return bool(pong)


@internal_router.get("/internal/live")
async def internal_live() -> JSONResponse:
    try:
        await asyncio.wait_for(asyncio.sleep(0), timeout=0.5)
    except asyncio.TimeoutError:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return JSONResponse(status_code=200, content={"status": "ok"})


@internal_router.get("/internal/ready")
async def internal_ready() -> JSONResponse:
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(2.0))
    checker = HealthChecker(
        redis_client=redis_client,
        queue_probe=_queue_probe,
        http_client=http_client,
    )

    try:
        checks = await asyncio.gather(
            checker.check_redis(),
            checker.check_queue(),
            checker.check_downstream("api", os.getenv("API_SERVICE_URL", "http://api:8000")),
            checker.check_downstream("fraud", os.getenv("FRAUD_SERVICE_URL", "http://fraud:8002")),
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


@internal_router.get("/internal/startup")
async def internal_startup() -> JSONResponse:
    if app.state.is_started:
        return JSONResponse(status_code=200, content={"status": "ok"})

    config_validated = bool(app.state.config_validated)
    startup_initialized = bool(app.state.startup_initialized)
    checks = {
        "config": {"name": "config", "status": "ok" if config_validated else "fail"},
        "migrations": {"name": "migrations", "status": "ok" if startup_initialized else "fail"},
        "initialization": {"name": "initialization", "status": "ok" if startup_initialized else "fail"},
    }

    if config_validated and startup_initialized:
        app.state.is_started = True
        return JSONResponse(status_code=200, content={"status": "ok", "checks": checks})

    return JSONResponse(status_code=503, content={"status": "unavailable", "checks": checks})


app.include_router(internal_router)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return create_success_response(
        data={"status": "healthy", "service": "trigger-ingestion"},
        correlation_id=get_correlation_id()
    )


@app.post("/api/v1/triggers/ingest")
async def ingest_trigger_event(request: Request):
    """
    Ingest a trigger event from external source.
    
    Request body:
    {
        "event_type": "weather" | "traffic" | "disruption" | "emergency",
        "severity": "low" | "medium" | "high" | "critical",
        "location": {
            "latitude": 12.9716,
            "longitude": 77.5946,
            "city": "Bangalore",
            "region": "Karnataka",
            "country": "India"
        },
        "timestamp": "2026-04-01T16:00:00Z",
        "metadata": {
            "temperature": 43.5,
            "rainfall_mm": 8.2,
            "aqi": 350
        }
    }
    
    Response:
    {
        "success": true,
        "data": {
            "event_id": "uuid",
            "trigger_activated": true,
            "affected_policies": 125,
            "evaluation": {
                "threshold_met": true,
                "criteria": "Heavy rainfall > 5mm/hour",
                "confidence": 0.95
            }
        },
        "correlation_id": "..."
    }
    """
    body = await request.json()
    
    # Validate required fields
    if not body.get("event_type"):
        raise ValidationException("event_type is required")
    if not body.get("location"):
        raise ValidationException("location is required")
    
    event_type = body["event_type"]
    severity = body.get("severity", "medium")
    location = body["location"]
    metadata = body.get("metadata", {})
    
    # TODO: Implement actual trigger evaluation logic
    # This is a placeholder implementation
    
    # Simulate trigger evaluation
    trigger_activated = False
    threshold_met = False
    criteria = ""
    
    if event_type == "weather":
        rainfall = metadata.get("rainfall_mm", 0)
        temperature = metadata.get("temperature", 0)
        
        rain_threshold = float(config.get("TRIGGER_HEAVY_RAIN_MM", 5.0))
        heat_threshold = float(config.get("TRIGGER_EXTREME_HEAT_C", 42.0))
        
        if rainfall >= rain_threshold:
            trigger_activated = True
            threshold_met = True
            criteria = f"Heavy rainfall > {rain_threshold}mm/hour"
        elif temperature >= heat_threshold:
            trigger_activated = True
            threshold_met = True
            criteria = f"Extreme heat > {heat_threshold}°C"
    
    elif event_type == "disruption":
        aqi = metadata.get("aqi", 0)
        pollution_threshold = float(config.get("TRIGGER_POLLUTION_AQI", 300))
        
        if aqi >= pollution_threshold:
            trigger_activated = True
            threshold_met = True
            criteria = f"Severe pollution AQI > {pollution_threshold}"
    
    # Simulated event ID and affected count
    event_id = "evt_" + get_correlation_id()[:8]
    affected_policies = 125 if trigger_activated else 0
    
    result = {
        "event_id": event_id,
        "trigger_activated": trigger_activated,
        "affected_policies": affected_policies,
        "evaluation": {
            "threshold_met": threshold_met,
            "criteria": criteria,
            "confidence": 0.95 if threshold_met else 0.0
        }
    }
    
    return create_success_response(
        data=result,
        correlation_id=get_correlation_id()
    )


@app.get("/api/v1/triggers/recent")
async def get_recent_triggers(limit: int = 10):
    """Get recent trigger events."""
    # TODO: Implement actual database query
    events = [
        {
            "event_id": "evt_001",
            "event_type": "weather",
            "severity": "high",
            "timestamp": "2026-04-01T15:30:00Z",
            "trigger_activated": True
        }
    ]
    
    return create_success_response(
        data=events[:limit],
        correlation_id=get_correlation_id()
    )


@app.get("/api/v1/triggers/stats")
async def get_trigger_stats():
    """Get trigger statistics."""
    # TODO: Implement actual stats retrieval
    stats = {
        "total_events": 1543,
        "triggers_activated": 87,
        "policies_affected": 12450,
        "by_type": {
            "weather": 45,
            "traffic": 12,
            "disruption": 25,
            "emergency": 5
        }
    }
    
    return create_success_response(
        data=stats,
        correlation_id=get_correlation_id()
    )


if __name__ == "__main__":
    import uvicorn
    port = int(config.get("SERVICE_PORT", 8003))
    uvicorn.run(app, host="0.0.0.0", port=port)

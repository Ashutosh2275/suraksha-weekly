from __future__ import annotations

import asyncio
import os
import sys
from typing import Any

import httpx
import redis.asyncio as aioredis
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

# Make repository root importable for shared.fastapi_common.*
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../../.."))

from core.config import settings
from core.database import DatabaseManager
from shared.fastapi_common.health.probes import HealthChecker, get_degraded_mode_manager

router = APIRouter(tags=["internal"])
_degraded_mode = get_degraded_mode_manager()


async def _database_probe() -> None:
    if DatabaseManager._session_factory is None:
        raise RuntimeError("database session factory unavailable")
    async with DatabaseManager._session_factory() as session:
        await session.execute(text("SELECT 1"))


async def _migration_probe() -> bool:
    if DatabaseManager._session_factory is None:
        return False
    async with DatabaseManager._session_factory() as session:
        result = await session.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
        return bool(result.scalar_one_or_none())


async def _queue_probe(redis_client: aioredis.Redis) -> bool:
    pong = await redis_client.ping()
    return bool(pong)


def _serialize_checks(results: list[Any]) -> dict[str, Any]:
    checks: dict[str, Any] = {}
    for result in results:
        if hasattr(result, "to_dict"):
            payload = result.to_dict()
            checks[payload["name"]] = payload
    return checks


@router.get("/internal/live")
async def internal_live() -> JSONResponse:
    try:
        await asyncio.wait_for(asyncio.sleep(0), timeout=0.5)
    except asyncio.TimeoutError:
        return JSONResponse(status_code=503, content={"status": "unavailable"})
    return JSONResponse(status_code=200, content={"status": "ok"})


@router.get("/internal/ready")
async def internal_ready() -> JSONResponse:
    redis_client: aioredis.Redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(2.0))
    try:
        checker = HealthChecker(
            database_probe=_database_probe,
            redis_client=redis_client,
            queue_probe=lambda: _queue_probe(redis_client),
            http_client=http_client,
        )

        downstream_urls = [
            ("fraud", os.getenv("FRAUD_SERVICE_URL", "http://fraud:8002")),
            ("trigger", os.getenv("TRIGGER_SERVICE_URL", "http://trigger:8003")),
        ]

        tasks = [
            checker.check_database(),
            checker.check_redis(),
            checker.check_queue(),
        ]
        tasks.extend(checker.check_downstream(name, url) for name, url in downstream_urls)

        results = await asyncio.gather(*tasks)
        checks = _serialize_checks(results)

        failed = [name for name, result in checks.items() if result.get("status") == "fail"]
        degraded = [name for name, result in checks.items() if result.get("status") == "degraded"]
        degraded_reasons = _degraded_mode.list_reasons() + [f"{item}_degraded" for item in degraded]

        if failed:
            return JSONResponse(
                status_code=503,
                content={"status": "unavailable", "checks": checks},
            )

        if degraded_reasons:
            return JSONResponse(
                status_code=200,
                content={
                    "status": "degraded",
                    "degraded": True,
                    "degraded_reasons": sorted(set(degraded_reasons)),
                    "checks": checks,
                },
            )

        return JSONResponse(status_code=200, content={"status": "ok", "checks": checks})
    finally:
        await http_client.aclose()
        await redis_client.aclose()


@router.get("/internal/startup")
async def internal_startup(request: Request) -> JSONResponse:
    if getattr(request.app.state, "is_started", False):
        return JSONResponse(status_code=200, content={"status": "ok"})

    config_validated = bool(getattr(request.app.state, "config_validated", False))
    migration_ok = await _migration_probe()
    db_result = await HealthChecker(database_probe=_database_probe).check_database()

    checks = {
        "config": {"name": "config", "status": "ok" if config_validated else "fail"},
        "migrations": {"name": "migrations", "status": "ok" if migration_ok else "fail"},
        db_result.name: db_result.to_dict(),
    }

    if config_validated and migration_ok and db_result.status == "ok":
        request.app.state.is_started = True
        return JSONResponse(status_code=200, content={"status": "ok", "checks": checks})

    return JSONResponse(
        status_code=503,
        content={"status": "unavailable", "checks": checks},
    )

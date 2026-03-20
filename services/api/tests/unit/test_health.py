"""
Health Probe Unit Tests (PRD §38)

Test A — All healthy:         readiness 200, all checks=ok
Test B — DB failure:          readiness 503, checks.database=fail
Test C — Degraded mode:       readiness 200, degraded=true
Test D — Startup incomplete:  startup 503 (Alembic wrong revision)
Test E — Startup complete:    startup 200, all steps=completed

Approach: call endpoint functions directly with mock session/redis objects.
Module-level state (_startup_complete) is reset per test via monkeypatch.
"""
from __future__ import annotations

import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# ─────────────────────────────────────────────────────────────────────────────
# Test A — All healthy
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_a_all_healthy(monkeypatch):
    """
    All four dependency checks return 'ok'.
    readiness_probe → HTTP 200, status='ok', degraded=False, all checks pass.
    """
    import routers.health as health

    monkeypatch.setattr(health, "_startup_complete", True)
    monkeypatch.setattr(health, "_check_db",            AsyncMock(return_value=("database",      "ok")))
    monkeypatch.setattr(health, "_check_cache",         AsyncMock(return_value=("cache",         "ok")))
    monkeypatch.setattr(health, "_check_queue",         AsyncMock(return_value=("queue",         "ok")))
    monkeypatch.setattr(health, "_check_fraud_service", AsyncMock(return_value=("fraud_service", "ok")))
    monkeypatch.setattr(health, "_mock_degraded_reasons", MagicMock(return_value=[]))

    mock_session = AsyncMock()
    mock_redis   = AsyncMock()

    with patch("asyncio.create_task"):
        response = await health.readiness_probe(session=mock_session, redis=mock_redis)

    assert response.status_code == 200
    body = json.loads(response.body)
    assert body["status"]   == "ok"
    assert body["degraded"] is False
    assert body["checks"]["database"]      == "ok"
    assert body["checks"]["cache"]         == "ok"
    assert body["checks"]["queue"]         == "ok"
    assert body["checks"]["fraud_service"] == "ok"
    assert body["degraded_reasons"]        == []


# ─────────────────────────────────────────────────────────────────────────────
# Test B — DB failure
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_b_db_failure(monkeypatch):
    """
    DB check returns 'fail'; all others pass.
    readiness_probe → HTTP 503, status='unavailable', checks.database='fail'.
    """
    import routers.health as health

    monkeypatch.setattr(health, "_startup_complete", True)
    monkeypatch.setattr(health, "_check_db",            AsyncMock(return_value=("database",      "fail")))
    monkeypatch.setattr(health, "_check_cache",         AsyncMock(return_value=("cache",         "ok")))
    monkeypatch.setattr(health, "_check_queue",         AsyncMock(return_value=("queue",         "ok")))
    monkeypatch.setattr(health, "_check_fraud_service", AsyncMock(return_value=("fraud_service", "ok")))
    monkeypatch.setattr(health, "_mock_degraded_reasons", MagicMock(return_value=[]))

    mock_session = AsyncMock()
    mock_redis   = AsyncMock()

    response = await health.readiness_probe(session=mock_session, redis=mock_redis)

    assert response.status_code == 503
    body = json.loads(response.body)
    assert body["status"]              == "unavailable"
    assert body["checks"]["database"]  == "fail"
    # Other checks still reported correctly
    assert body["checks"]["cache"]         == "ok"
    assert body["checks"]["queue"]         == "ok"
    assert body["checks"]["fraud_service"] == "ok"


# ─────────────────────────────────────────────────────────────────────────────
# Test C — Degraded mode
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_c_degraded_mode(monkeypatch):
    """
    MOCK_MODE=true: all checks pass but fraud_service returns 'degraded'
    and MOCK flags add to degraded_reasons.
    readiness_probe → HTTP 200, status='degraded', degraded=True.
    """
    import routers.health as health

    monkeypatch.setattr(health, "_startup_complete", True)
    monkeypatch.setattr(health, "_check_db",            AsyncMock(return_value=("database",      "ok")))
    monkeypatch.setattr(health, "_check_cache",         AsyncMock(return_value=("cache",         "ok")))
    monkeypatch.setattr(health, "_check_queue",         AsyncMock(return_value=("queue",         "ok")))
    # In MOCK_MODE the fraud service check returns "degraded" (not "fail")
    monkeypatch.setattr(health, "_check_fraud_service", AsyncMock(return_value=("fraud_service", "degraded")))
    # Simulate MOCK_MODE mock-reason flags
    monkeypatch.setattr(
        health, "_mock_degraded_reasons",
        MagicMock(return_value=["weather_api_mock", "aqi_api_mock"]),
    )

    mock_session = AsyncMock()
    mock_redis   = AsyncMock()

    with patch("asyncio.create_task"):
        response = await health.readiness_probe(session=mock_session, redis=mock_redis)

    assert response.status_code == 200
    body = json.loads(response.body)
    assert body["status"]   == "degraded"
    assert body["degraded"] is True
    # fraud_service normalised to "ok" in checks when degraded
    assert body["checks"]["fraud_service"] == "ok"
    reasons = body["degraded_reasons"]
    assert "weather_api_mock"    in reasons
    assert "aqi_api_mock"        in reasons
    assert "fraud_service_mock"  in reasons


# ─────────────────────────────────────────────────────────────────────────────
# Test D — Startup incomplete (wrong Alembic revision)
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_d_startup_incomplete(monkeypatch):
    """
    Alembic returns the wrong schema revision.
    startup_probe → HTTP 503, alembic_migration step=failed,
    _startup_complete remains False.
    """
    import routers.health as health

    monkeypatch.setattr(health, "_startup_complete",    False)
    monkeypatch.setattr(health, "_startup_steps_cache", [])

    monkeypatch.setattr(
        health, "_run_alembic_check",
        AsyncMock(return_value=(False, "DB schema at '006', expected '007'")),
    )
    monkeypatch.setattr(
        health, "_run_redis_startup_check",
        AsyncMock(return_value=(True, "pong")),
    )
    monkeypatch.setattr(
        health, "_run_env_var_check",
        MagicMock(return_value=(True, [])),
    )
    monkeypatch.setattr(
        health, "_run_ml_model_check",
        MagicMock(return_value=(True, "models present")),
    )

    response = await health.startup_probe()

    assert response.status_code == 503
    body = json.loads(response.body)
    assert body["status"] == "unavailable"

    steps = {s["step"]: s["status"] for s in body["initialization_steps"]}
    assert steps["alembic_migration"] == "failed"

    # Startup must NOT be marked complete after a failed check
    assert health._startup_complete is False


# ─────────────────────────────────────────────────────────────────────────────
# Test E — Startup complete
# ─────────────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_e_startup_complete(monkeypatch):
    """
    All four startup steps pass.
    startup_probe → HTTP 200, all steps=completed, _startup_complete=True.
    """
    import routers.health as health

    monkeypatch.setattr(health, "_startup_complete",    False)
    monkeypatch.setattr(health, "_startup_steps_cache", [])

    monkeypatch.setattr(
        health, "_run_alembic_check",
        AsyncMock(return_value=(True, "schema=007_add_fraud_clusters_and_indexes")),
    )
    monkeypatch.setattr(
        health, "_run_redis_startup_check",
        AsyncMock(return_value=(True, "pong")),
    )
    monkeypatch.setattr(
        health, "_run_env_var_check",
        MagicMock(return_value=(True, [])),
    )
    monkeypatch.setattr(
        health, "_run_ml_model_check",
        MagicMock(return_value=(True, "premium_model.pkl, fraud_model.pkl present")),
    )

    response = await health.startup_probe()

    assert response.status_code == 200
    body = json.loads(response.body)
    assert body["status"] in ("ok", "degraded")   # ok or degraded if MOCK flags are set
    assert "initialization_steps" in body

    steps = {s["step"]: s["status"] for s in body["initialization_steps"]}
    assert steps["alembic_migration"]     == "completed"
    assert steps["redis_connection"]      == "completed"
    assert steps["environment_variables"] == "completed"
    assert steps["ml_model_files"]        == "completed"

    # Service must be marked complete after all steps pass
    assert health._startup_complete is True

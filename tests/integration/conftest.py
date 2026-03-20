"""
Integration test fixtures — real PostgreSQL (TEST_DATABASE_URL) + Redis.

Required env vars:
    TEST_DATABASE_URL  e.g. postgresql+asyncpg://suraksha:password@localhost:5432/suraksha_test
    TEST_REDIS_URL     e.g. redis://localhost:6379/1  (DB 1 to avoid polluting main DB)

Uses a real async PostgreSQL session and a real Redis client.
Each test function gets its own session that is rolled back at the end, so tests
are fully isolated — no shared mutable state.
"""
from __future__ import annotations

import os
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from typing import AsyncGenerator

import pytest
import pytest_asyncio

# Integration tests are skipped if TEST_DATABASE_URL is not set
TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://suraksha:password@localhost:5432/suraksha_test",
)
TEST_REDIS_URL = os.getenv("TEST_REDIS_URL", "redis://localhost:6379/1")


# ── Database ──────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="session")
async def db_engine():
    """Create a single engine for the whole test session, then drop."""
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool
    from models import Base   # noqa: F401  (registers all ORM mappings)

    engine = create_async_engine(TEST_DB_URL, echo=False, poolclass=NullPool)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator:
    """
    Per-test session with savepoint isolation.
    Rolls back after each test so the DB is always clean.
    """
    from sqlalchemy.ext.asyncio import AsyncSession

    async with db_engine.connect() as conn:
        await conn.begin()
        await conn.begin_nested()   # savepoint

        session = AsyncSession(conn, expire_on_commit=False)
        yield session

        await session.close()
        await conn.rollback()


# ── Redis (DB 1 — isolated from main app) ────────────────────────────────────

@pytest_asyncio.fixture
async def redis_client():
    import redis.asyncio as aioredis

    client = aioredis.from_url(TEST_REDIS_URL, decode_responses=True)
    yield client
    # Flush only the test DB (DB 1) to clean up
    await client.flushdb()
    await client.aclose()


# ── FastAPI test client ───────────────────────────────────────────────────────

@pytest_asyncio.fixture
async def test_client(db_engine):
    """
    ASGI test client wired to use the test DB session.
    ML warm-up is disabled via patching so tests start quickly.
    """
    import httpx
    from httpx import ASGITransport
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker
    from core.database import get_db

    session_factory = async_sessionmaker(db_engine, expire_on_commit=False)

    async def _override_get_db():
        async with session_factory() as session:
            yield session

    # Import with minimal lifespan to avoid Redis listener + ML overhead
    from fastapi import FastAPI
    from contextlib import asynccontextmanager

    @asynccontextmanager
    async def _test_lifespan(app: FastAPI):
        from core.database import DatabaseManager
        DatabaseManager._engine = db_engine
        DatabaseManager._session_factory = session_factory
        yield

    from app import _register_routers
    app = FastAPI(lifespan=_test_lifespan)
    _register_routers(app)
    app.dependency_overrides[get_db] = _override_get_db

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        yield client


# ── Seed helpers ──────────────────────────────────────────────────────────────

async def seed_worker(session, **kwargs) -> "Worker":
    from models import Worker
    defaults = dict(
        id=str(uuid.uuid4()),
        phone=f"+91{uuid.uuid4().int % 9_000_000_000 + 7_000_000_000:010d}",
        name="Test Worker",
        city="Mumbai",
        platform_type="Zomato",
        service_zones=["South Mumbai"],
        avg_daily_hours=8.0,
        avg_weekly_earnings=4800.0,
        trust_score=75.0,
        trust_tier="silver",
        is_active=True,
    )
    defaults.update(kwargs)
    w = Worker(**defaults)
    session.add(w)
    await session.flush()
    return w


async def seed_policy(session, worker_id: str, **kwargs) -> "Policy":
    from models import Policy
    defaults = dict(
        id=str(uuid.uuid4()),
        worker_id=worker_id,
        plan_variant="standard",
        status="active",
        coverage_cap=1500.0,
        weekly_premium=149.0,
        start_date=datetime.now(timezone.utc) - timedelta(days=8),
        end_date=datetime.now(timezone.utc) + timedelta(days=6),
        renewal_count=1,
        waiting_period_until=datetime.now(timezone.utc) - timedelta(hours=25),
    )
    defaults.update(kwargs)
    p = defaults.get("_obj") or (lambda d: (_ for _ in ()).throw(Exception()))
    p = type("_Policy", (), {})()
    from models import Policy
    p = Policy(**defaults)
    session.add(p)
    await session.flush()
    return p


async def seed_trigger_event(session, **kwargs) -> "TriggerEvent":
    from models import TriggerEvent
    defaults = dict(
        id=str(uuid.uuid4()),
        type="HeavyRain",
        zone="South Mumbai",
        city="Mumbai",
        value=42.0,
        threshold=5.0,
        confidence_score=0.91,
        sources=["IMD", "OpenWeatherMap"],
        triggered_at=datetime.now(timezone.utc),
        is_active=True,
        audit_snapshot={},
    )
    defaults.update(kwargs)
    t = TriggerEvent(**defaults)
    session.add(t)
    await session.flush()
    return t


@pytest_asyncio.fixture
async def db_worker(db_session):
    return await seed_worker(db_session)


@pytest_asyncio.fixture
async def db_policy(db_session, db_worker):
    return await seed_policy(db_session, worker_id=db_worker.id)


@pytest_asyncio.fixture
async def db_trigger_event(db_session):
    return await seed_trigger_event(db_session)

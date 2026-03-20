"""
conftest.py for API v1 contract tests.

Sets up a shared async httpx client + in-process FastAPI app against a real
PostgreSQL test database mirrored by Alembic migrations at test time.

Environment variables expected (same as CI test stage):
    DATABASE_URL   postgresql+asyncpg://...
    REDIS_URL      redis://...
    JWT_SECRET     any-string
    MOCK_MODE      true
    ENVIRONMENT    testing
"""
from __future__ import annotations

import asyncio
import os
import uuid
from typing import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

# Patch env before importing app
os.environ.setdefault("DATABASE_URL",  "postgresql+asyncpg://suraksha:password@localhost:5432/suraksha_db")
os.environ.setdefault("REDIS_URL",     "redis://localhost:6379/0")
os.environ.setdefault("JWT_SECRET",    "test-jwt-secret-32-chars-minimum!")
os.environ.setdefault("MOCK_MODE",     "true")
os.environ.setdefault("ENVIRONMENT",   "testing")
os.environ.setdefault("ADMIN_TOKEN",   "test-admin-token")

from app import create_app                          # noqa: E402
from core.config import settings                    # noqa: E402
from core.database import DatabaseManager           # noqa: E402
from core.security import JWTHandler                # noqa: E402
from models import Base, Worker, Policy             # noqa: E402


# ─────────────────────────────────────────────────────────────────────────────
# Session-scoped event loop (required for async fixtures)
# ─────────────────────────────────────────────────────────────────────────────
@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ─────────────────────────────────────────────────────────────────────────────
# DB engine + Alembic migrations
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def db_engine():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    DatabaseManager._session_factory = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncGenerator[AsyncSession, None]:
    async with DatabaseManager._session_factory() as session:
        yield session
        await session.rollback()


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI test client
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def app(db_engine):
    _app = create_app()
    return _app


@pytest_asyncio.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac


# ─────────────────────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────────────────────
@pytest_asyncio.fixture
async def test_worker(db_session: AsyncSession) -> Worker:
    """Create and persist a test worker row."""
    worker = Worker(
        id=str(uuid.uuid4()),
        phone=f"+919{uuid.uuid4().int % 1_000_000_000:09d}",
        name="Contract Test Worker",
        city="Mumbai",
        service_zones=["Andheri"],
        platform_type="Zomato",
        avg_daily_hours=8.0,
        avg_weekly_earnings=5000.0,
        trust_score=75.0,
        trust_tier="gold",
    )
    db_session.add(worker)
    await db_session.commit()
    await db_session.refresh(worker)
    return worker


@pytest.fixture
def worker_token(test_worker: Worker) -> str:
    return JWTHandler.create_token({"sub": test_worker.id})


@pytest.fixture
def auth_headers(worker_token: str) -> dict:
    return {"Authorization": f"Bearer {worker_token}"}


@pytest.fixture
def admin_headers() -> dict:
    return {"X-Admin-Token": settings.ADMIN_TOKEN}


@pytest.fixture
def no_auth_headers() -> dict:
    return {}

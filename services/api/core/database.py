"""
SQLAlchemy database configuration and session factory.
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    create_async_engine,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.pool import NullPool

from core.config import settings


class DatabaseManager:
    """Manages database connection and session creation."""

    _engine: AsyncEngine | None = None
    _session_factory: async_sessionmaker | None = None

    @classmethod
    async def init_db(cls) -> None:
        """
        Initialize database engine and session factory.
        """
        use_null_pool = settings.MOCK_MODE
        engine_kwargs = {
            "echo": settings.DEBUG,
            "poolclass": NullPool if use_null_pool else None,
        }
        if not use_null_pool:
            engine_kwargs["pool_size"]    = settings.DATABASE_POOL_SIZE
            engine_kwargs["max_overflow"] = settings.DATABASE_MAX_OVERFLOW
            engine_kwargs["pool_timeout"] = settings.DATABASE_POOL_TIMEOUT
            engine_kwargs["pool_recycle"] = settings.DATABASE_POOL_RECYCLE

        cls._engine = create_async_engine(
            settings.DATABASE_URL,
            **engine_kwargs,
        )

        cls._session_factory = async_sessionmaker(
            cls._engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )

    @classmethod
    async def close_db(cls) -> None:
        """
        Close database engine.
        """
        if cls._engine:
            await cls._engine.dispose()

    @classmethod
    async def get_session(cls) -> AsyncGenerator[AsyncSession, None]:
        """
        Get database session generator.

        Yields:
            AsyncSession: Database session

        Raises:
            RuntimeError: If database not initialized
        """
        if not cls._session_factory:
            raise RuntimeError("Database not initialized. Call init_db() first.")

        async with cls._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()


# Module-level functions for FastAPI dependency injection
async def init_db() -> None:
    """Initialize database."""
    await DatabaseManager.init_db()


async def close_db() -> None:
    """Close database."""
    await DatabaseManager.close_db()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session.

    Yields:
        AsyncSession: Database session
    """
    async for session in DatabaseManager.get_session():
        yield session

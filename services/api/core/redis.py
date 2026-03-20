"""
Redis connection helper for FastAPI dependency injection.

Usage:
    from core.redis import get_redis
    import redis.asyncio as aioredis

    @router.post("/simulate")
    async def simulate(redis: aioredis.Redis = Depends(get_redis)):
        ...
"""
from __future__ import annotations

from typing import AsyncGenerator

import redis.asyncio as aioredis

from core.config import settings


async def get_redis() -> AsyncGenerator[aioredis.Redis, None]:
    """
    Yield a Redis connection for the duration of a single request.

    Opens a connection from the default connection pool backed by
    settings.REDIS_URL, then closes it on request completion.
    """
    client: aioredis.Redis = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
    try:
        yield client
    finally:
        await client.aclose()

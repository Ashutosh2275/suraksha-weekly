"""OpenWeather adapter implementation."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from .base import TriggerAdapter, TriggerReading

logger = logging.getLogger(__name__)


class OpenWeatherAdapter(TriggerAdapter):
    """Fetch weather trigger inputs from OpenWeatherMap."""

    CACHE_TTL_SECONDS = 300

    def __init__(
        self,
        *,
        api_key: str,
        zone_coordinates: dict[str, dict[str, float]],
        redis_client: Any,
        base_url: str = "https://api.openweathermap.org/data/2.5/weather",
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.api_key = api_key
        self.zone_coordinates = zone_coordinates
        self.redis = redis_client
        self.base_url = base_url.rstrip("/")
        self._http_client = http_client

    def _cache_key(self, zone_id: str) -> str:
        return f"trigger:openweather:{zone_id}"

    async def _read_cache(self, zone_id: str) -> TriggerReading | None:
        if self.redis is None:
            return None
        cached = await self.redis.get(self._cache_key(zone_id))
        if not cached:
            return None
        if isinstance(cached, bytes):
            cached = cached.decode("utf-8")
        try:
            return TriggerReading.model_validate_json(cached)
        except Exception:
            logger.warning("Invalid cached OpenWeather payload for zone '%s'", zone_id)
            return None

    async def _write_cache(self, reading: TriggerReading) -> None:
        if self.redis is None:
            return
        await self.redis.setex(
            self._cache_key(reading.zone_id),
            self.CACHE_TTL_SECONDS,
            reading.model_dump_json(),
        )

    async def fetch(self, zone_id: str) -> TriggerReading | None:
        cached = await self._read_cache(zone_id)
        if cached is not None:
            return cached

        coords = self.zone_coordinates.get(zone_id)
        if not coords:
            logger.warning("No coordinates configured for zone '%s'", zone_id)
            return None

        params = {
            "lat": coords["lat"],
            "lon": coords["lon"],
            "appid": self.api_key,
            "units": "metric",
        }

        own_client = self._http_client is None
        client = self._http_client or httpx.AsyncClient(timeout=10.0)
        try:
            response = await client.get(self.base_url, params=params)
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            logger.warning("OpenWeather fetch failed for zone '%s': %s", zone_id, exc)
            return None
        finally:
            if own_client:
                await client.aclose()

        rainfall = float((payload.get("rain") or {}).get("1h") or 0.0)
        temperature = float((payload.get("main") or {}).get("temp") or 0.0)
        weather = payload.get("weather") or []
        weather_condition = "unknown"
        if weather:
            weather_condition = str(weather[0].get("main") or weather[0].get("description") or "unknown")

        reading_timestamp = datetime.now(timezone.utc)
        if payload.get("dt"):
            reading_timestamp = datetime.fromtimestamp(int(payload["dt"]), tz=timezone.utc)

        reading = TriggerReading(
            zone_id=zone_id,
            source="openweather",
            timestamp=reading_timestamp,
            fetched_at=datetime.now(timezone.utc),
            raw_data={
                "rainfall_mm_per_hour": rainfall,
                "temperature_celsius": temperature,
                "weather_condition": weather_condition,
                "provider_payload": payload,
            },
        )
        await self._write_cache(reading)
        return reading

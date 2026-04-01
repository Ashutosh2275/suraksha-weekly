"""OpenAQ adapter implementation."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

import httpx

from .base import TriggerAdapter, TriggerReading

logger = logging.getLogger(__name__)


class OpenAQAdapter(TriggerAdapter):
    """Fetch air-quality trigger inputs from OpenAQ."""

    CACHE_TTL_SECONDS = 300

    def __init__(
        self,
        *,
        zone_coordinates: dict[str, dict[str, float]],
        redis_client: Any,
        base_url: str = "https://api.openaq.org/v2/latest",
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        self.zone_coordinates = zone_coordinates
        self.redis = redis_client
        self.base_url = base_url.rstrip("/")
        self._http_client = http_client

    def _cache_key(self, zone_id: str) -> str:
        return f"trigger:openaq:{zone_id}"

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
            logger.warning("Invalid cached OpenAQ payload for zone '%s'", zone_id)
            return None

    async def _write_cache(self, reading: TriggerReading) -> None:
        if self.redis is None:
            return
        await self.redis.setex(
            self._cache_key(reading.zone_id),
            self.CACHE_TTL_SECONDS,
            reading.model_dump_json(),
        )

    def _extract_measurement(self, payload: dict[str, Any]) -> tuple[float, str]:
        results = payload.get("results") or []
        measurements: list[dict[str, Any]] = []
        for result in results:
            measurements.extend(result.get("measurements") or [])

        if not measurements:
            return 0.0, "unknown"

        # Prefer PM2.5 as an AQI proxy when available.
        preferred = next((m for m in measurements if str(m.get("parameter", "")).lower() in {"pm25", "pm2.5"}), None)
        measurement = preferred or measurements[0]

        value = float(measurement.get("value") or 0.0)
        pollutant = str(measurement.get("parameter") or "unknown")
        return value, pollutant

    async def fetch(self, zone_id: str) -> TriggerReading | None:
        cached = await self._read_cache(zone_id)
        if cached is not None:
            return cached

        coords = self.zone_coordinates.get(zone_id)
        if not coords:
            logger.warning("No coordinates configured for zone '%s'", zone_id)
            return None

        params = {
            "coordinates": f"{coords['lat']},{coords['lon']}",
            "radius": 25000,
            "limit": 5,
        }

        own_client = self._http_client is None
        client = self._http_client or httpx.AsyncClient(timeout=10.0)
        try:
            response = await client.get(self.base_url, params=params)
            response.raise_for_status()
            payload = response.json()
        except Exception as exc:
            logger.warning("OpenAQ fetch failed for zone '%s': %s", zone_id, exc)
            return None
        finally:
            if own_client:
                await client.aclose()

        aqi_value, dominant_pollutant = self._extract_measurement(payload)
        reading = TriggerReading(
            zone_id=zone_id,
            source="openaq",
            timestamp=datetime.now(timezone.utc),
            fetched_at=datetime.now(timezone.utc),
            raw_data={
                "aqi_value": aqi_value,
                "dominant_pollutant": dominant_pollutant,
                "provider_payload": payload,
            },
        )
        await self._write_cache(reading)
        return reading

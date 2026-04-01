"""Mock adapter for deterministic and scenario-driven testing."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from .base import TriggerAdapter, TriggerReading


class MockAdapter(TriggerAdapter):
    """Return static or cycling trigger values."""

    def __init__(
        self,
        scenarios: dict[str, dict[str, Any] | list[dict[str, Any]]] | None = None,
        *,
        source: str = "mock",
        default_reading: dict[str, Any] | None = None,
    ) -> None:
        self.scenarios = scenarios or {}
        self.source = source
        self.default_reading = default_reading or {
            "rainfall_mm_per_hour": 0.0,
            "temperature_celsius": 30.0,
            "weather_condition": "clear",
            "aqi_value": 80.0,
            "dominant_pollutant": "pm25",
        }
        self._indices: dict[str, int] = {}

    def _normalize(self, zone_id: str, data: dict[str, Any]) -> dict[str, Any]:
        return {
            "rainfall_mm_per_hour": float(data.get("rainfall_mm_per_hour", data.get("rainfall", 0.0))),
            "temperature_celsius": float(data.get("temperature_celsius", data.get("temperature", 30.0))),
            "weather_condition": str(data.get("weather_condition", "clear")),
            "aqi_value": float(data.get("aqi_value", data.get("aqi", 80.0))),
            "dominant_pollutant": str(data.get("dominant_pollutant", "pm25")),
            "scenario_zone": zone_id,
        }

    def _next_zone_payload(self, zone_id: str) -> dict[str, Any]:
        configured = self.scenarios.get(zone_id)
        if configured is None:
            return self._normalize(zone_id, self.default_reading)

        if isinstance(configured, list):
            if not configured:
                return self._normalize(zone_id, self.default_reading)
            index = self._indices.get(zone_id, 0)
            payload = configured[index % len(configured)]
            self._indices[zone_id] = index + 1
            return self._normalize(zone_id, payload)

        return self._normalize(zone_id, configured)

    async def fetch(self, zone_id: str) -> TriggerReading | None:
        payload = self._next_zone_payload(zone_id)
        now = datetime.now(timezone.utc)
        return TriggerReading(
            zone_id=zone_id,
            source=self.source,
            timestamp=now,
            raw_data=payload,
            fetched_at=now,
        )

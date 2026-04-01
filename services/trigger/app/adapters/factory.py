"""Factory for trigger ingestion adapters."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

from .base import TriggerAdapter
from .mock import MockAdapter
from .openaq import OpenAQAdapter
from .openweather import OpenWeatherAdapter

logger = logging.getLogger(__name__)


class TriggerAdapterFactory:
    """Create weather and AQI adapters based on environment configuration."""

    def __init__(
        self,
        *,
        redis_client: Any = None,
        zone_coordinates: dict[str, dict[str, float]] | None = None,
        mock_scenarios: dict[str, dict[str, Any] | list[dict[str, Any]]] | None = None,
    ) -> None:
        self.redis_client = redis_client
        self.zone_coordinates = zone_coordinates or self._load_zone_coordinates()
        self.mock_scenarios = mock_scenarios or self._load_mock_scenarios()

    def _load_zone_coordinates(self) -> dict[str, dict[str, float]]:
        raw = os.getenv("ZONE_COORDINATES", "{}")
        try:
            parsed = json.loads(raw)
            return {
                str(zone): {"lat": float(coords["lat"]), "lon": float(coords["lon"])}
                for zone, coords in parsed.items()
                if isinstance(coords, dict) and "lat" in coords and "lon" in coords
            }
        except Exception:
            logger.warning("Invalid ZONE_COORDINATES JSON, using empty mapping")
            return {}

    def _load_mock_scenarios(self) -> dict[str, dict[str, Any] | list[dict[str, Any]]]:
        raw = os.getenv("MOCK_TRIGGER_SCENARIOS", "{}")
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            logger.warning("Invalid MOCK_TRIGGER_SCENARIOS JSON, using empty scenarios")
        return {}

    def _provider_name(self, env_key: str) -> str:
        return os.getenv(env_key, "").strip().lower()

    def _mock_triggers_enabled(self) -> bool:
        value = os.getenv("MOCK_TRIGGERS", "false").strip().lower()
        return value in {"1", "true", "yes", "on"}

    def weather_adapter(self) -> TriggerAdapter:
        if self._mock_triggers_enabled():
            return MockAdapter(self.mock_scenarios, source="mock_weather")

        provider = self._provider_name("WEATHER_PROVIDER")
        if provider in {"", "mock"}:
            return MockAdapter(self.mock_scenarios, source="mock_weather")

        if provider == "openweather":
            api_key = os.getenv("OPENWEATHER_API_KEY", "")
            if not api_key:
                logger.warning("OPENWEATHER_API_KEY missing. Falling back to MockAdapter")
                return MockAdapter(self.mock_scenarios, source="mock_weather")
            base_url = os.getenv("OPENWEATHER_API_URL", "https://api.openweathermap.org/data/2.5/weather")
            return OpenWeatherAdapter(
                api_key=api_key,
                zone_coordinates=self.zone_coordinates,
                redis_client=self.redis_client,
                base_url=base_url,
            )

        logger.warning("Unknown WEATHER_PROVIDER '%s'. Falling back to MockAdapter", provider)
        return MockAdapter(self.mock_scenarios, source="mock_weather")

    def aqi_adapter(self) -> TriggerAdapter:
        if self._mock_triggers_enabled():
            return MockAdapter(self.mock_scenarios, source="mock_aqi")

        provider = self._provider_name("AQI_PROVIDER")
        if provider in {"", "mock"}:
            return MockAdapter(self.mock_scenarios, source="mock_aqi")

        if provider == "openaq":
            base_url = os.getenv("OPENAQ_API_URL", "https://api.openaq.org/v2/latest")
            return OpenAQAdapter(
                zone_coordinates=self.zone_coordinates,
                redis_client=self.redis_client,
                base_url=base_url,
            )

        logger.warning("Unknown AQI_PROVIDER '%s'. Falling back to MockAdapter", provider)
        return MockAdapter(self.mock_scenarios, source="mock_aqi")

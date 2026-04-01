from __future__ import annotations

from unittest.mock import AsyncMock, Mock

import httpx
import pytest

from app.adapters import MockAdapter, OpenAQAdapter, OpenWeatherAdapter, TriggerAdapterFactory


class _FakeRedis:
    def __init__(self) -> None:
        self._data: dict[str, str] = {}

    async def get(self, key: str):
        return self._data.get(key)

    async def setex(self, key: str, ttl: int, value: str):
        self._data[key] = value


def _response(payload: dict) -> Mock:
    response = Mock()
    response.raise_for_status = Mock()
    response.json = Mock(return_value=payload)
    return response


@pytest.mark.asyncio
async def test_openweather_fetch_falls_back_to_none_on_http_error() -> None:
    redis = _FakeRedis()
    client = AsyncMock()
    client.get.side_effect = httpx.HTTPError("boom")

    adapter = OpenWeatherAdapter(
        api_key="test-key",
        zone_coordinates={"zone_1": {"lat": 12.97, "lon": 77.59}},
        redis_client=redis,
        http_client=client,
    )

    reading = await adapter.fetch("zone_1")

    assert reading is None


@pytest.mark.asyncio
async def test_openaq_fetch_falls_back_to_none_on_http_error() -> None:
    redis = _FakeRedis()
    client = AsyncMock()
    client.get.side_effect = httpx.HTTPError("boom")

    adapter = OpenAQAdapter(
        zone_coordinates={"zone_1": {"lat": 12.97, "lon": 77.59}},
        redis_client=redis,
        http_client=client,
    )

    reading = await adapter.fetch("zone_1")

    assert reading is None


@pytest.mark.asyncio
async def test_openweather_uses_cache_after_first_fetch() -> None:
    redis = _FakeRedis()
    client = AsyncMock()
    client.get.return_value = _response(
        {
            "dt": 1711977600,
            "rain": {"1h": 12.5},
            "main": {"temp": 31.2},
            "weather": [{"main": "Rain"}],
        }
    )

    adapter = OpenWeatherAdapter(
        api_key="test-key",
        zone_coordinates={"zone_1": {"lat": 12.97, "lon": 77.59}},
        redis_client=redis,
        http_client=client,
    )

    first = await adapter.fetch("zone_1")
    second = await adapter.fetch("zone_1")

    assert first is not None
    assert second is not None
    assert second.raw_data["rainfall_mm_per_hour"] == 12.5
    assert client.get.await_count == 1


@pytest.mark.asyncio
async def test_mock_adapter_supports_static_and_cycling_scenarios() -> None:
    adapter = MockAdapter(
        {
            "zone_1": {"rainfall": 35, "aqi": 320},
            "zone_2": [
                {"rainfall": 10, "aqi": 120},
                {"rainfall": 25, "aqi": 280},
            ],
        }
    )

    z1 = await adapter.fetch("zone_1")
    z2a = await adapter.fetch("zone_2")
    z2b = await adapter.fetch("zone_2")

    assert z1 is not None
    assert z1.raw_data["rainfall_mm_per_hour"] == 35.0
    assert z1.raw_data["aqi_value"] == 320.0

    assert z2a is not None
    assert z2b is not None
    assert z2a.raw_data["rainfall_mm_per_hour"] == 10.0
    assert z2b.raw_data["rainfall_mm_per_hour"] == 25.0


def test_factory_defaults_to_mock_when_providers_not_set(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("WEATHER_PROVIDER", raising=False)
    monkeypatch.delenv("AQI_PROVIDER", raising=False)
    monkeypatch.delenv("MOCK_TRIGGERS", raising=False)

    factory = TriggerAdapterFactory(redis_client=None)

    assert isinstance(factory.weather_adapter(), MockAdapter)
    assert isinstance(factory.aqi_adapter(), MockAdapter)


def test_factory_uses_mock_when_mock_triggers_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MOCK_TRIGGERS", "true")
    monkeypatch.setenv("WEATHER_PROVIDER", "openweather")
    monkeypatch.setenv("AQI_PROVIDER", "openaq")

    factory = TriggerAdapterFactory(redis_client=None)

    assert isinstance(factory.weather_adapter(), MockAdapter)
    assert isinstance(factory.aqi_adapter(), MockAdapter)

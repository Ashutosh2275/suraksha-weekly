from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta, timezone
from typing import Any

import pytest

from app.adapters.base import TriggerAdapter, TriggerReading
from app.services.trigger_evaluator import EvaluatorConfig, TriggerEvaluator, TriggerEventRecord


class _SequenceAdapter(TriggerAdapter):
    def __init__(self, readings: list[TriggerReading | None]) -> None:
        self._readings = readings
        self._i = 0

    async def fetch(self, zone_id: str) -> TriggerReading | None:
        if self._i >= len(self._readings):
            return self._readings[-1] if self._readings else None
        value = self._readings[self._i]
        self._i += 1
        return value


class _InMemoryRepo:
    def __init__(self, initial: list[TriggerEventRecord] | None = None) -> None:
        self.events: list[TriggerEventRecord] = initial or []

    async def find_active(self, zone_id: str, trigger_type: str, since: datetime) -> TriggerEventRecord | None:
        for event in reversed(self.events):
            if event.zone_id != zone_id or event.trigger_type != trigger_type:
                continue
            if event.ended_at is None or event.ended_at >= since:
                return event
        return None

    async def find_recent_identical(
        self,
        zone_id: str,
        trigger_type: str,
        snapshot_signature: str,
        ended_after: datetime,
    ) -> TriggerEventRecord | None:
        for event in reversed(self.events):
            if event.zone_id != zone_id or event.trigger_type != trigger_type:
                continue
            if event.ended_at is None or event.ended_at < ended_after:
                continue
            if (event.source_data or {}).get("snapshot_signature") == snapshot_signature:
                return event
        return None

    async def insert_event(self, event: TriggerEventRecord) -> TriggerEventRecord:
        self.events.append(event)
        return event

    async def update_event_confirmation(
        self,
        event_id: str,
        *,
        is_confirmed: bool,
        confidence_score: float,
        source_data: dict[str, Any],
    ) -> TriggerEventRecord:
        for idx, event in enumerate(self.events):
            if event.id == event_id:
                updated = replace(
                    event,
                    is_confirmed=is_confirmed,
                    confidence_score=confidence_score,
                    source_data=source_data,
                )
                self.events[idx] = updated
                return updated
        raise AssertionError("event not found")


class _QueueCapture:
    def __init__(self) -> None:
        self.messages: list[tuple[str, dict[str, Any]]] = []

    async def emit(self, event_name: str, payload: dict[str, Any]) -> None:
        self.messages.append((event_name, payload))


def _reading(zone: str, *, fetched_at: datetime, rainfall: float = 0.0, temp: float = 30.0, aqi: float = 90.0) -> TriggerReading:
    return TriggerReading(
        zone_id=zone,
        source="test",
        timestamp=fetched_at,
        fetched_at=fetched_at,
        raw_data={
            "rainfall_mm_per_hour": rainfall,
            "temperature_celsius": temp,
            "aqi_value": aqi,
            "weather_condition": "rain" if rainfall > 0 else "clear",
            "dominant_pollutant": "pm25",
        },
    )


@pytest.mark.asyncio
async def test_single_source_trigger_detected() -> None:
    zone = "zone_1"
    start = datetime(2026, 4, 2, 6, 0, tzinfo=timezone.utc)

    weather = [_reading(zone, fetched_at=start + timedelta(minutes=5 * i), rainfall=20.0) for i in range(7)]
    aqi = [None] * 7

    evaluator = TriggerEvaluator(
        weather_adapter=_SequenceAdapter(weather),
        aqi_adapter=_SequenceAdapter(aqi),
        repository=_InMemoryRepo(),
        queue_publisher=_QueueCapture(),
        config=EvaluatorConfig(zone_ids=[zone]),
    )

    for i in range(7):
        await evaluator.poll_once(start + timedelta(minutes=5 * i))

    assert len(evaluator.repository.events) == 1
    event = evaluator.repository.events[0]
    assert event.trigger_type == "HEAVY_RAIN"
    assert event.is_confirmed is False
    assert event.confidence_score == pytest.approx(0.7)
    assert [name for name, _ in evaluator.queue.messages] == ["trigger.detected"]


@pytest.mark.asyncio
async def test_dual_source_confirmation() -> None:
    zone = "zone_1"
    start = datetime(2026, 4, 2, 6, 0, tzinfo=timezone.utc)

    weather = [_reading(zone, fetched_at=start + timedelta(minutes=5 * i), rainfall=20.0) for i in range(7)]
    aqi = [_reading(zone, fetched_at=start + timedelta(minutes=5 * i), rainfall=21.0) for i in range(7)]

    repo = _InMemoryRepo()
    queue = _QueueCapture()
    evaluator = TriggerEvaluator(
        weather_adapter=_SequenceAdapter(weather),
        aqi_adapter=_SequenceAdapter(aqi),
        repository=repo,
        queue_publisher=queue,
        config=EvaluatorConfig(zone_ids=[zone]),
    )

    for i in range(7):
        await evaluator.poll_once(start + timedelta(minutes=5 * i))

    assert len(repo.events) == 1
    event = repo.events[0]
    assert event.is_confirmed is True
    assert event.confidence_score == pytest.approx(0.95)
    assert [name for name, _ in queue.messages] == ["trigger.detected", "trigger.confirmed"]


@pytest.mark.asyncio
async def test_stale_data_caps_confidence() -> None:
    zone = "zone_1"
    start = datetime(2026, 4, 2, 6, 0, tzinfo=timezone.utc)

    # fetched_at intentionally stale by > 15 minutes in every poll.
    weather = [_reading(zone, fetched_at=start - timedelta(minutes=30), rainfall=25.0) for _ in range(7)]
    aqi = [None] * 7

    repo = _InMemoryRepo()
    queue = _QueueCapture()
    evaluator = TriggerEvaluator(
        weather_adapter=_SequenceAdapter(weather),
        aqi_adapter=_SequenceAdapter(aqi),
        repository=repo,
        queue_publisher=queue,
        config=EvaluatorConfig(zone_ids=[zone]),
    )

    for i in range(7):
        await evaluator.poll_once(start + timedelta(minutes=5 * i))

    assert repo.events == []
    assert queue.messages == []


@pytest.mark.asyncio
async def test_deduplication_blocks_identical_recent_trigger() -> None:
    zone = "zone_1"
    now = datetime(2026, 4, 2, 7, 0, tzinfo=timezone.utc)

    weather_reading = _reading(zone, fetched_at=now, rainfall=20.0)
    snapshot = {
        "trigger_type": "HEAVY_RAIN",
        "weather": weather_reading.model_dump(mode="json"),
        "aqi": None,
    }
    from app.services.trigger_evaluator import TriggerEvaluator as _Eval

    signature = _Eval(
        weather_adapter=_SequenceAdapter([weather_reading]),
        aqi_adapter=_SequenceAdapter([None]),
        repository=_InMemoryRepo(),
        queue_publisher=_QueueCapture(),
        config=EvaluatorConfig(zone_ids=[zone]),
    )._snapshot_signature(zone, "HEAVY_RAIN", snapshot)

    existing = TriggerEventRecord(
        id="existing-1",
        zone_id=zone,
        trigger_type="HEAVY_RAIN",
        started_at=now - timedelta(hours=2, minutes=30),
        ended_at=now - timedelta(hours=1),
        confidence_score=0.8,
        is_confirmed=False,
        source_data={"snapshot": snapshot, "snapshot_signature": signature},
    )

    repo = _InMemoryRepo(initial=[existing])
    queue = _QueueCapture()
    evaluator = TriggerEvaluator(
        weather_adapter=_SequenceAdapter([weather_reading] * 7),
        aqi_adapter=_SequenceAdapter([None] * 7),
        repository=repo,
        queue_publisher=queue,
        config=EvaluatorConfig(zone_ids=[zone]),
    )

    # warm-up enough polls for sustained heavy-rain condition
    for i in range(7):
        await evaluator.poll_once(now + timedelta(minutes=5 * i))

    # no new event inserted, only pre-existing remains
    assert len(repo.events) == 1
    assert repo.events[0].id == "existing-1"
    assert queue.messages == []

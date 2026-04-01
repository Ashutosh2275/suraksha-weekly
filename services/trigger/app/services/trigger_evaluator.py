"""Trigger evaluation pipeline with scheduled polling."""

from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Protocol
from zoneinfo import ZoneInfo

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.adapters.base import TriggerAdapter, TriggerReading

logger = logging.getLogger(__name__)

IST = ZoneInfo("Asia/Kolkata")


@dataclass
class TriggerEventRecord:
    """Persistence-facing TriggerEvent representation."""

    id: str
    zone_id: str
    trigger_type: str
    started_at: datetime
    ended_at: datetime | None
    confidence_score: float
    is_confirmed: bool
    source_data: dict[str, Any]


@dataclass
class EvaluatorConfig:
    """Configuration for trigger evaluation."""

    zone_ids: list[str]
    poll_interval_minutes: int = 5
    stale_minutes: int = 15
    active_window_hours: int = 2
    dedup_window_hours: int = 4

    heavy_rain_mm_per_hour: float = 15.0
    heavy_rain_duration_minutes: int = 30

    extreme_heat_celsius: float = 42.0
    extreme_heat_start_hour_ist: int = 11
    extreme_heat_end_hour_ist: int = 16

    severe_pollution_aqi: float = 300.0
    severe_pollution_duration_minutes: int = 120


class TriggerEventRepository(Protocol):
    """Repository contract for TriggerEvent persistence."""

    async def find_active(self, zone_id: str, trigger_type: str, since: datetime) -> TriggerEventRecord | None:
        ...

    async def find_recent_identical(
        self,
        zone_id: str,
        trigger_type: str,
        snapshot_signature: str,
        ended_after: datetime,
    ) -> TriggerEventRecord | None:
        ...

    async def insert_event(self, event: TriggerEventRecord) -> TriggerEventRecord:
        ...

    async def update_event_confirmation(
        self,
        event_id: str,
        *,
        is_confirmed: bool,
        confidence_score: float,
        source_data: dict[str, Any],
    ) -> TriggerEventRecord:
        ...


class TriggerEventQueuePublisher(Protocol):
    """Queue publisher contract for trigger events."""

    async def emit(self, event_name: str, payload: dict[str, Any]) -> None:
        ...


class BullMQPublisher:
    """Minimal Redis-backed BullMQ-compatible publisher."""

    def __init__(self, redis_client: Any, queue_name: str = "trigger-events") -> None:
        self.redis = redis_client
        self.queue_name = queue_name

    async def emit(self, event_name: str, payload: dict[str, Any]) -> None:
        job = {
            "name": event_name,
            "data": payload,
            "opts": {},
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
        }
        # Simplified BullMQ enqueue shape; consumers can adapt payload at dequeue.
        await self.redis.lpush(f"bull:{self.queue_name}:wait", json.dumps(job))


class TriggerEvaluator:
    """Scheduled trigger evaluator pipeline."""

    def __init__(
        self,
        *,
        weather_adapter: TriggerAdapter,
        aqi_adapter: TriggerAdapter,
        repository: TriggerEventRepository,
        queue_publisher: TriggerEventQueuePublisher,
        config: EvaluatorConfig,
    ) -> None:
        self.weather_adapter = weather_adapter
        self.aqi_adapter = aqi_adapter
        self.repository = repository
        self.queue = queue_publisher
        self.config = config
        self._manual_local_restrictions: dict[str, bool] = {}
        self._history: dict[tuple[str, str], list[tuple[datetime, bool]]] = {}

    def set_local_restriction(self, zone_id: str, enabled: bool) -> None:
        """Set local restriction flag (typically called by admin API)."""
        self._manual_local_restrictions[zone_id] = enabled

    async def poll_once(self, now_utc: datetime | None = None) -> None:
        now = now_utc or datetime.now(timezone.utc)
        for zone_id in self.config.zone_ids:
            weather_reading = await self.weather_adapter.fetch(zone_id)
            aqi_reading = await self.aqi_adapter.fetch(zone_id)
            await self._evaluate_zone(zone_id, now, weather_reading, aqi_reading)

    async def _evaluate_zone(
        self,
        zone_id: str,
        now: datetime,
        weather_reading: TriggerReading | None,
        aqi_reading: TriggerReading | None,
    ) -> None:
        checks = [
            self._check_heavy_rain(zone_id, now, weather_reading, aqi_reading),
            self._check_extreme_heat(zone_id, now, weather_reading, aqi_reading),
            self._check_severe_pollution(zone_id, now, weather_reading, aqi_reading),
            self._check_local_restriction(zone_id, now, weather_reading, aqi_reading),
        ]

        for check in checks:
            if not check["triggered"]:
                continue
            confidence = self._compute_confidence(check["confirming_sources"], check["stale_sources"])
            if confidence < 0.7:
                continue
            await self._upsert_trigger(zone_id, check, confidence, now)

    def _add_history_and_check_sustained(
        self,
        zone_id: str,
        trigger_type: str,
        now: datetime,
        condition_met: bool,
        required_minutes: int,
    ) -> bool:
        key = (zone_id, trigger_type)
        points = self._history.setdefault(key, [])
        points.append((now, condition_met))

        # Keep only the history needed for the evaluation window + one poll buffer.
        max_age = timedelta(minutes=required_minutes + self.config.poll_interval_minutes)
        cutoff = now - max_age
        self._history[key] = [(ts, ok) for ts, ok in points if ts >= cutoff]
        points = self._history[key]

        # Trailing contiguous true duration.
        trailing_true_ts: list[datetime] = []
        for ts, ok in reversed(points):
            if not ok:
                break
            trailing_true_ts.append(ts)

        if not trailing_true_ts:
            return False

        earliest = min(trailing_true_ts)
        sustained_for = now - earliest
        return sustained_for >= timedelta(minutes=required_minutes)

    def _reading_stale(self, reading: TriggerReading | None, now: datetime) -> bool:
        if reading is None:
            return False
        return (now - reading.fetched_at) > timedelta(minutes=self.config.stale_minutes)

    def _compute_confidence(self, confirming_sources: set[str], stale_sources: set[str]) -> float:
        if len(confirming_sources) >= 2:
            score = 0.95
        elif len(confirming_sources) == 1:
            score = 0.7
        else:
            score = 0.0
        if stale_sources:
            score = min(score, 0.5)
        return score

    def _snapshot_signature(self, zone_id: str, trigger_type: str, snapshot: dict[str, Any]) -> str:
        blob = json.dumps({"zone_id": zone_id, "trigger_type": trigger_type, "snapshot": snapshot}, sort_keys=True)
        return hashlib.sha256(blob.encode("utf-8")).hexdigest()

    def _build_source_snapshot(
        self,
        trigger_type: str,
        weather_reading: TriggerReading | None,
        aqi_reading: TriggerReading | None,
    ) -> dict[str, Any]:
        return {
            "trigger_type": trigger_type,
            "weather": weather_reading.model_dump(mode="json") if weather_reading else None,
            "aqi": aqi_reading.model_dump(mode="json") if aqi_reading else None,
        }

    async def _upsert_trigger(self, zone_id: str, check: dict[str, Any], confidence: float, now: datetime) -> None:
        trigger_type = check["trigger_type"]
        snapshot = check["snapshot"]
        signature = self._snapshot_signature(zone_id, trigger_type, snapshot)

        active_since = now - timedelta(hours=self.config.active_window_hours)
        active = await self.repository.find_active(zone_id, trigger_type, active_since)

        if active is None:
            ended_after = now - timedelta(hours=self.config.dedup_window_hours)
            duplicate = await self.repository.find_recent_identical(zone_id, trigger_type, signature, ended_after)
            if duplicate is not None:
                return

            active = await self.repository.insert_event(
                TriggerEventRecord(
                    id=f"{zone_id}:{trigger_type}:{int(now.timestamp())}",
                    zone_id=zone_id,
                    trigger_type=trigger_type,
                    started_at=now,
                    ended_at=None,
                    confidence_score=confidence,
                    is_confirmed=False,
                    source_data={"snapshot": snapshot, "snapshot_signature": signature},
                )
            )
            await self.queue.emit(
                "trigger.detected",
                {
                    "event_id": active.id,
                    "zone_id": zone_id,
                    "trigger_type": trigger_type,
                    "confidence_score": confidence,
                    "timestamp": now.isoformat(),
                },
            )

        if confidence >= 0.9 and not active.is_confirmed:
            updated = await self.repository.update_event_confirmation(
                active.id,
                is_confirmed=True,
                confidence_score=confidence,
                source_data={"snapshot": snapshot, "snapshot_signature": signature},
            )
            await self.queue.emit(
                "trigger.confirmed",
                {
                    "event_id": updated.id,
                    "zone_id": zone_id,
                    "trigger_type": trigger_type,
                    "confidence_score": confidence,
                    "timestamp": now.isoformat(),
                },
            )

    def _check_heavy_rain(
        self,
        zone_id: str,
        now: datetime,
        weather_reading: TriggerReading | None,
        aqi_reading: TriggerReading | None,
    ) -> dict[str, Any]:
        weather_rain = float((weather_reading.raw_data if weather_reading else {}).get("rainfall_mm_per_hour", 0.0))
        aqi_rain = float((aqi_reading.raw_data if aqi_reading else {}).get("rainfall_mm_per_hour", 0.0))

        weather_ok = weather_reading is not None and weather_rain >= self.config.heavy_rain_mm_per_hour
        aqi_ok = aqi_reading is not None and aqi_rain >= self.config.heavy_rain_mm_per_hour

        sustained = self._add_history_and_check_sustained(
            zone_id,
            "HEAVY_RAIN",
            now,
            weather_ok or aqi_ok,
            self.config.heavy_rain_duration_minutes,
        )

        confirming_sources: set[str] = set()
        stale_sources: set[str] = set()
        if sustained:
            if weather_ok:
                confirming_sources.add("weather")
                if self._reading_stale(weather_reading, now):
                    stale_sources.add("weather")
            if aqi_ok:
                confirming_sources.add("aq")
                if self._reading_stale(aqi_reading, now):
                    stale_sources.add("aq")

        return {
            "trigger_type": "HEAVY_RAIN",
            "triggered": sustained,
            "confirming_sources": confirming_sources,
            "stale_sources": stale_sources,
            "snapshot": self._build_source_snapshot("HEAVY_RAIN", weather_reading, aqi_reading),
        }

    def _check_extreme_heat(
        self,
        zone_id: str,
        now: datetime,
        weather_reading: TriggerReading | None,
        aqi_reading: TriggerReading | None,
    ) -> dict[str, Any]:
        ist_hour = now.astimezone(IST).hour
        in_window = self.config.extreme_heat_start_hour_ist <= ist_hour < self.config.extreme_heat_end_hour_ist

        weather_temp = float((weather_reading.raw_data if weather_reading else {}).get("temperature_celsius", 0.0))
        aqi_temp = float((aqi_reading.raw_data if aqi_reading else {}).get("temperature_celsius", 0.0))

        weather_ok = in_window and weather_reading is not None and weather_temp >= self.config.extreme_heat_celsius
        aqi_ok = in_window and aqi_reading is not None and aqi_temp >= self.config.extreme_heat_celsius

        confirming_sources: set[str] = set()
        stale_sources: set[str] = set()
        if weather_ok:
            confirming_sources.add("weather")
            if self._reading_stale(weather_reading, now):
                stale_sources.add("weather")
        if aqi_ok:
            confirming_sources.add("aq")
            if self._reading_stale(aqi_reading, now):
                stale_sources.add("aq")

        return {
            "trigger_type": "EXTREME_HEAT",
            "triggered": weather_ok or aqi_ok,
            "confirming_sources": confirming_sources,
            "stale_sources": stale_sources,
            "snapshot": self._build_source_snapshot("EXTREME_HEAT", weather_reading, aqi_reading),
        }

    def _check_severe_pollution(
        self,
        zone_id: str,
        now: datetime,
        weather_reading: TriggerReading | None,
        aqi_reading: TriggerReading | None,
    ) -> dict[str, Any]:
        weather_aqi = float((weather_reading.raw_data if weather_reading else {}).get("aqi_value", 0.0))
        aqi_value = float((aqi_reading.raw_data if aqi_reading else {}).get("aqi_value", 0.0))

        weather_ok = weather_reading is not None and weather_aqi >= self.config.severe_pollution_aqi
        aqi_ok = aqi_reading is not None and aqi_value >= self.config.severe_pollution_aqi

        sustained = self._add_history_and_check_sustained(
            zone_id,
            "SEVERE_POLLUTION",
            now,
            weather_ok or aqi_ok,
            self.config.severe_pollution_duration_minutes,
        )

        confirming_sources: set[str] = set()
        stale_sources: set[str] = set()
        if sustained:
            if weather_ok:
                confirming_sources.add("weather")
                if self._reading_stale(weather_reading, now):
                    stale_sources.add("weather")
            if aqi_ok:
                confirming_sources.add("aq")
                if self._reading_stale(aqi_reading, now):
                    stale_sources.add("aq")

        return {
            "trigger_type": "SEVERE_POLLUTION",
            "triggered": sustained,
            "confirming_sources": confirming_sources,
            "stale_sources": stale_sources,
            "snapshot": self._build_source_snapshot("SEVERE_POLLUTION", weather_reading, aqi_reading),
        }

    def _check_local_restriction(
        self,
        zone_id: str,
        now: datetime,
        weather_reading: TriggerReading | None,
        aqi_reading: TriggerReading | None,
    ) -> dict[str, Any]:
        is_set = bool(self._manual_local_restrictions.get(zone_id, False))
        return {
            "trigger_type": "LOCAL_RESTRICTION",
            "triggered": is_set,
            "confirming_sources": {"manual"} if is_set else set(),
            "stale_sources": set(),
            "snapshot": {
                **self._build_source_snapshot("LOCAL_RESTRICTION", weather_reading, aqi_reading),
                "manual_flag": is_set,
            },
        }


def build_scheduler(evaluator: TriggerEvaluator, *, start_immediately: bool = False) -> AsyncIOScheduler:
    """Build a 5-minute APScheduler poller for trigger evaluation."""
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(
        evaluator.poll_once,
        trigger="interval",
        minutes=evaluator.config.poll_interval_minutes,
        id="trigger_evaluator_poll",
        replace_existing=True,
    )
    if start_immediately:
        scheduler.start()
    return scheduler

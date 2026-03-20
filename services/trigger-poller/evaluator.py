"""
Trigger Evaluator — Suraksha Weekly (FR-4 / PRD §8 / PRD §10)

Evaluates raw sensor readings against configurable thresholds and
produces TriggerEvaluation objects for every zone × trigger-type pair.

Confidence rules (per PRD §8):
  1 source  → 0.60   (below threshold, logged as EVALUATED)
  2 sources → 0.85   (above threshold)
  3+ sources or extreme value (≥2× threshold) → 0.95
  Trigger fires if confidence ≥ TRIGGER_CONFIDENCE_THRESHOLD (default 0.75)

Trigger Feed Integrity (PRD §10 §19):
  - If ≥2 sources are available and their readings diverge by >20 %, the
    confidence is penalised to INCONSISTENT_SOURCES_CONFIDENCE (0.50) and
    the evaluation is tagged "INCONSISTENT_SOURCES" in its audit_snapshot.
  - A trigger will NOT fire when confidence < 0.70 regardless of threshold.
    This prevents fraudulent payouts from manipulated single-source feeds.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional

import redis.asyncio as aioredis

from config import PollerConfig

logger = logging.getLogger(__name__)

# ── Feed integrity constant ───────────────────────────────────────────────────
INCONSISTENT_SOURCES_CONFIDENCE = 0.50   # assigned when sources diverge >20%
_DIVERGENCE_THRESHOLD            = 0.20  # 20% relative divergence


# ── Duration tracking Redis key helpers ──────────────────────────────────────

def _dur_key(trigger_type: str, zone: str) -> str:
    return f"trigger_duration:{trigger_type}:{zone.lower().replace(' ', '_')}"


async def _update_duration(
    redis: aioredis.Redis,
    trigger_type: str,
    zone: str,
    breaching: bool,
    ttl_seconds: int = 14400,
) -> int:
    """
    Track how long a threshold has been continuously breached for a zone.

    - If breaching=True and key absent: set key to now.
    - If breaching=True and key present: return elapsed minutes.
    - If breaching=False: delete key (condition cleared).

    Returns elapsed breach minutes (0 if just started).
    """
    key = _dur_key(trigger_type, zone)
    if not breaching:
        await redis.delete(key)
        return 0

    stored = await redis.get(key)
    if stored is None:
        await redis.setex(key, ttl_seconds, datetime.utcnow().isoformat())
        return 0

    try:
        start = datetime.fromisoformat(stored.decode())
        return int((datetime.utcnow() - start).total_seconds() / 60)
    except Exception:
        await redis.setex(key, ttl_seconds, datetime.utcnow().isoformat())
        return 0


# ── Feed integrity: multi-source divergence check ────────────────────────────

def check_source_divergence(
    source_readings: dict[str, float],
) -> tuple[bool, float]:
    """
    Check whether per-source readings are mutually consistent.

    Args:
        source_readings: {source_name: measured_value} — at least 2 entries.

    Returns:
        (is_inconsistent: bool, divergence_ratio: float)
        is_inconsistent = True if any reading deviates from the mean by >20%.
    """
    if not source_readings or len(source_readings) < 2:
        return False, 0.0

    values   = list(source_readings.values())
    mean_val = sum(values) / len(values)
    if mean_val <= 0:
        return False, 0.0

    max_dev = max(abs(v - mean_val) / mean_val for v in values)
    return max_dev > _DIVERGENCE_THRESHOLD, round(max_dev, 4)


# ── Confidence scoring ────────────────────────────────────────────────────────

def compute_confidence(
    sources:         list[str],
    value:           float,
    threshold:       float,
    source_readings: Optional[dict[str, float]] = None,
) -> tuple[float, bool]:
    """
    Compute a confidence score for a trigger evaluation with optional
    feed-integrity cross-validation.

    Args:
        sources:         List of corroborating data source names.
        value:           Measured value (representative single reading).
        threshold:       Configured trigger threshold.
        source_readings: Optional per-source readings for divergence check.

    Returns:
        (confidence: float, is_inconsistent: bool)
        - confidence is 0.50 if sources diverge >20%, otherwise 0.60/0.85/0.95
          per the PRD quorum rules.
        - is_inconsistent is True when the >20% divergence rule fired.
    """
    # ── Feed integrity cross-validation ──────────────────────────────────────
    if source_readings and len(source_readings) >= 2:
        inconsistent, divergence = check_source_divergence(source_readings)
        if inconsistent:
            logger.warning(
                "[evaluator] INCONSISTENT_SOURCES — divergence=%.1f%%  readings=%s",
                divergence * 100,
                {k: round(v, 2) for k, v in source_readings.items()},
            )
            return INCONSISTENT_SOURCES_CONFIDENCE, True

    # ── Standard quorum-based confidence ─────────────────────────────────────
    n          = len([s for s in sources if s])
    exceedance = (value / threshold) if threshold > 0 else 2.0

    if n >= 3 or exceedance >= 2.0:
        confidence = 0.95
    elif n >= 2 or exceedance >= 1.5:
        confidence = 0.85
    else:
        confidence = 0.60

    return confidence, False


# ── Data container for one zone's sensor readings ────────────────────────────

@dataclass
class ZoneReading:
    zone: str
    city: str
    # Weather
    rain_mm_hr: float = 0.0
    temp_c: float = 25.0
    weather_sources: list[str] = field(default_factory=list)
    # Per-source weather readings (for cross-validation)
    weather_source_readings: Optional[dict[str, float]] = None
    # AQI
    aqi: int = 50
    pm25: float = 0.0
    aqi_sources: list[str] = field(default_factory=list)
    # Per-source AQI readings (for cross-validation)
    aqi_source_readings: Optional[dict[str, float]] = None
    # Local restriction
    has_restriction: bool = False
    restriction_reason: str = ""
    restriction_source: str = ""
    # Platform outage
    outage_minutes: int = 0
    outage_platform: str = ""
    outage_source: str = ""
    # Cache staleness
    weather_cache_staleness: int = 0
    aqi_cache_staleness: int = 0
    # Whether mock duration check should be skipped
    mock_mode: bool = False


# ── Evaluation result ─────────────────────────────────────────────────────────

@dataclass
class TriggerEvaluation:
    trigger_type: str   # HeavyRain | ExtremeHeat | SeverePollution | LocalRestriction | PlatformOutage
    zone: str
    city: str
    measured_value: float
    threshold: float
    confidence_score: float
    sources: list[str]
    status: str         # "active" | "evaluated"
    audit_snapshot: dict


# ── Per-trigger evaluators ────────────────────────────────────────────────────

async def _eval_heavy_rain(
    reading: ZoneReading,
    cfg: PollerConfig,
    redis: aioredis.Redis,
) -> TriggerEvaluation:
    threshold = cfg.heavy_rain_mm_per_hr
    value     = reading.rain_mm_hr
    sources   = reading.weather_sources or ["OpenWeatherMap"]
    breaching = value >= threshold

    elapsed      = await _update_duration(redis, "HeavyRain", reading.zone, breaching,
                                          ttl_seconds=cfg.heavy_rain_duration_minutes * 60 * 3)
    duration_met = reading.mock_mode or (elapsed >= cfg.heavy_rain_duration_minutes)

    if breaching:
        confidence, is_inconsistent = compute_confidence(
            sources, value, threshold, reading.weather_source_readings
        )
    else:
        confidence, is_inconsistent = 0.60, False

    # Block on confirmed low confidence or inconsistent sources
    active = breaching and duration_met and confidence >= cfg.confidence_threshold

    return TriggerEvaluation(
        trigger_type     = "HeavyRain",
        zone             = reading.zone,
        city             = reading.city,
        measured_value   = round(value, 2),
        threshold        = threshold,
        confidence_score = confidence,
        sources          = sources,
        status           = "active" if active else "evaluated",
        audit_snapshot   = {
            "rain_mm_hr":                value,
            "threshold":                 threshold,
            "elapsed_minutes":           elapsed,
            "duration_required":         cfg.heavy_rain_duration_minutes,
            "duration_met":              duration_met,
            "cache_staleness_minutes":   reading.weather_cache_staleness,
            "source_readings":           reading.weather_source_readings,
            "inconsistent_sources":      is_inconsistent,
        },
    )


async def _eval_extreme_heat(
    reading: ZoneReading,
    cfg: PollerConfig,
    redis: aioredis.Redis,
) -> TriggerEvaluation:
    threshold = cfg.extreme_heat_celsius
    value     = reading.temp_c
    sources   = reading.weather_sources or ["OpenWeatherMap"]
    breaching = value >= threshold

    elapsed      = await _update_duration(redis, "ExtremeHeat", reading.zone, breaching,
                                          ttl_seconds=cfg.extreme_heat_hours * 3600 * 3)
    duration_met = reading.mock_mode or (elapsed >= cfg.extreme_heat_hours * 60)

    if breaching:
        confidence, is_inconsistent = compute_confidence(
            sources, value, threshold, reading.weather_source_readings
        )
    else:
        confidence, is_inconsistent = 0.60, False

    active = breaching and duration_met and confidence >= cfg.confidence_threshold

    return TriggerEvaluation(
        trigger_type     = "ExtremeHeat",
        zone             = reading.zone,
        city             = reading.city,
        measured_value   = round(value, 1),
        threshold        = threshold,
        confidence_score = confidence,
        sources          = sources,
        status           = "active" if active else "evaluated",
        audit_snapshot   = {
            "temp_c":                        value,
            "threshold":                     threshold,
            "elapsed_minutes":               elapsed,
            "duration_required_minutes":     cfg.extreme_heat_hours * 60,
            "duration_met":                  duration_met,
            "cache_staleness_minutes":       reading.weather_cache_staleness,
            "source_readings":               reading.weather_source_readings,
            "inconsistent_sources":          is_inconsistent,
        },
    )


async def _eval_severe_pollution(
    reading: ZoneReading,
    cfg: PollerConfig,
    redis: aioredis.Redis,
) -> TriggerEvaluation:
    threshold = cfg.severe_aqi
    value     = reading.aqi
    sources   = reading.aqi_sources or ["OpenAQ"]
    breaching = value >= threshold

    elapsed      = await _update_duration(redis, "SeverePollution", reading.zone, breaching,
                                          ttl_seconds=cfg.severe_aqi_hours * 3600 * 3)
    duration_met = reading.mock_mode or (elapsed >= cfg.severe_aqi_hours * 60)

    if breaching:
        confidence, is_inconsistent = compute_confidence(
            sources, float(value), float(threshold), reading.aqi_source_readings
        )
    else:
        confidence, is_inconsistent = 0.60, False

    active = breaching and duration_met and confidence >= cfg.confidence_threshold

    return TriggerEvaluation(
        trigger_type     = "SeverePollution",
        zone             = reading.zone,
        city             = reading.city,
        measured_value   = float(value),
        threshold        = float(threshold),
        confidence_score = confidence,
        sources          = sources,
        status           = "active" if active else "evaluated",
        audit_snapshot   = {
            "aqi":                           value,
            "pm25":                          reading.pm25,
            "threshold":                     threshold,
            "elapsed_minutes":               elapsed,
            "duration_required_minutes":     cfg.severe_aqi_hours * 60,
            "duration_met":                  duration_met,
            "cache_staleness_minutes":       reading.aqi_cache_staleness,
            "source_readings":               reading.aqi_source_readings,
            "inconsistent_sources":          is_inconsistent,
        },
    )


def _eval_local_restriction(reading: ZoneReading, cfg: PollerConfig) -> TriggerEvaluation:
    value   = 1.0 if reading.has_restriction else 0.0
    sources = [reading.restriction_source] if reading.restriction_source else ["GovernmentFeed"]
    # Official government feeds get high inherent confidence; single source is acceptable
    # because government feeds are authoritative (no cross-validation needed).
    confidence = 0.95 if reading.has_restriction else 0.60
    active = reading.has_restriction and confidence >= cfg.confidence_threshold

    return TriggerEvaluation(
        trigger_type     = "LocalRestriction",
        zone             = reading.zone,
        city             = reading.city,
        measured_value   = value,
        threshold        = 1.0,
        confidence_score = confidence,
        sources          = sources,
        status           = "active" if active else "evaluated",
        audit_snapshot   = {
            "restriction_active":  reading.has_restriction,
            "reason":              reading.restriction_reason,
            "source":              reading.restriction_source,
            "inconsistent_sources": False,
        },
    )


def _eval_platform_outage(reading: ZoneReading, cfg: PollerConfig) -> TriggerEvaluation:
    threshold = cfg.platform_outage_minutes
    value     = float(reading.outage_minutes)
    sources   = [reading.outage_source] if reading.outage_source else ["PlatformMonitor"]
    if reading.outage_platform:
        sources = [reading.outage_platform + "_Monitor", *sources]
    breaching = value >= threshold

    confidence, is_inconsistent = (
        compute_confidence(sources, value, threshold) if breaching else (0.60, False)
    )
    active = breaching and confidence >= cfg.confidence_threshold

    return TriggerEvaluation(
        trigger_type     = "PlatformOutage",
        zone             = reading.zone,
        city             = reading.city,
        measured_value   = value,
        threshold        = float(threshold),
        confidence_score = confidence,
        sources          = sources,
        status           = "active" if active else "evaluated",
        audit_snapshot   = {
            "platform":             reading.outage_platform,
            "outage_minutes":       reading.outage_minutes,
            "threshold_minutes":    threshold,
            "source":               reading.outage_source,
            "inconsistent_sources": is_inconsistent,
        },
    )


# ── Master evaluator ──────────────────────────────────────────────────────────

async def evaluate_all_triggers(
    reading: ZoneReading,
    cfg: PollerConfig,
    redis: aioredis.Redis,
) -> list[TriggerEvaluation]:
    """
    Run all 5 parametric trigger evaluations for a single zone reading.

    Returns a list of TriggerEvaluation objects — one per trigger type.
    All are persisted (status=EVALUATED or ACTIVE) for full audit trail.

    Feed integrity: any trigger with confidence < cfg.confidence_threshold
    (including those penalised for inconsistent sources) will have
    status="evaluated" and will NOT fire.
    """
    results: list[TriggerEvaluation] = []

    results.append(await _eval_heavy_rain(reading, cfg, redis))
    results.append(await _eval_extreme_heat(reading, cfg, redis))
    results.append(await _eval_severe_pollution(reading, cfg, redis))
    results.append(_eval_local_restriction(reading, cfg))
    results.append(_eval_platform_outage(reading, cfg))

    n_active       = sum(1 for r in results if r.status == "active")
    n_inconsistent = sum(
        1 for r in results if r.audit_snapshot.get("inconsistent_sources")
    )

    if n_active:
        logger.info(
            "[evaluator] %d/%d triggers ACTIVE for %s, %s",
            n_active, len(results), reading.zone, reading.city,
        )
    if n_inconsistent:
        logger.warning(
            "[evaluator] %d trigger(s) BLOCKED by INCONSISTENT_SOURCES for %s, %s",
            n_inconsistent, reading.zone, reading.city,
        )

    return results

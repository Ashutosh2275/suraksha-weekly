"""
Unit tests for trigger evaluator — PRD §23 suites 2 and 16.

Coverage:
  2.  Threshold boundary tests (one per trigger type — AT / BELOW / ABOVE)
  16. Trigger feed integrity (divergent sources → low confidence → no fire)
"""
from __future__ import annotations

import pytest
from unittest.mock import AsyncMock, patch
from dataclasses import dataclass
from typing import Optional

from evaluator import (
    ZoneReading,
    TriggerEvaluation,
    compute_confidence,
    check_source_divergence,
    INCONSISTENT_SOURCES_CONFIDENCE,
    _DIVERGENCE_THRESHOLD,
    evaluate_all_triggers,
    _eval_heavy_rain,
    _eval_extreme_heat,
    _eval_severe_pollution,
    _eval_local_restriction,
    _eval_platform_outage,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Shared helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _cfg(
    heavy_rain_mm_per_hr: float = 5.0,
    heavy_rain_duration_minutes: int = 0,  # 0 = always met in tests using mock_mode
    extreme_heat_celsius: float = 42.0,
    extreme_heat_hours: int = 0,
    severe_aqi: int = 300,
    severe_aqi_hours: int = 0,
    platform_outage_minutes: int = 60,
    confidence_threshold: float = 0.75,
    mock_mode: bool = False,
):
    """Build a minimal PollerConfig-like object for testing."""
    from config import PollerConfig
    cfg = PollerConfig(
        heavy_rain_mm_per_hr=heavy_rain_mm_per_hr,
        heavy_rain_duration_minutes=heavy_rain_duration_minutes,
        extreme_heat_celsius=extreme_heat_celsius,
        extreme_heat_hours=extreme_heat_hours,
        severe_aqi=severe_aqi,
        severe_aqi_hours=severe_aqi_hours,
        platform_outage_minutes=platform_outage_minutes,
        confidence_threshold=confidence_threshold,
        mock_mode=mock_mode,
    )
    return cfg


def _base_reading(
    zone: str = "Zone-1",
    city: str = "Mumbai",
    **kwargs,
) -> ZoneReading:
    return ZoneReading(
        zone=zone,
        city=city,
        mock_mode=True,   # skip duration check so threshold is the only gate
        **kwargs,
    )


@pytest.fixture
def mock_redis():
    r = AsyncMock()
    r.get.return_value = None
    r.setex.return_value = True
    r.delete.return_value = 1
    return r


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 2 — Threshold boundary tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestHeavyRainThreshold:
    """HeavyRain threshold = 5.0 mm/hr (cfg default)."""

    THRESHOLD = 5.0

    @pytest.mark.asyncio
    async def test_heavy_rain_at_threshold_fires(self, mock_redis):
        """Value exactly AT threshold (5.0) → status='active'."""
        cfg = _cfg(heavy_rain_mm_per_hr=self.THRESHOLD)
        reading = _base_reading(
            rain_mm_hr=self.THRESHOLD,
            weather_sources=["IMD", "OpenWeatherMap"],   # 2 sources → conf=0.85
        )
        result = await _eval_heavy_rain(reading, cfg, mock_redis)

        assert result.status == "active", (
            f"HeavyRain at threshold={self.THRESHOLD} should fire, "
            f"confidence={result.confidence_score}"
        )
        assert result.measured_value == pytest.approx(self.THRESHOLD, abs=0.01)

    @pytest.mark.asyncio
    async def test_heavy_rain_below_threshold_does_not_fire(self, mock_redis):
        """Value 1 unit BELOW threshold (4.0) → status='evaluated' (not active)."""
        cfg = _cfg(heavy_rain_mm_per_hr=self.THRESHOLD)
        reading = _base_reading(
            rain_mm_hr=self.THRESHOLD - 1.0,
            weather_sources=["IMD", "OpenWeatherMap"],
        )
        result = await _eval_heavy_rain(reading, cfg, mock_redis)

        assert result.status == "evaluated", (
            f"HeavyRain below threshold should NOT fire, got status={result.status}"
        )

    @pytest.mark.asyncio
    async def test_heavy_rain_above_threshold_fires_with_correct_confidence(self, mock_redis):
        """Value 1 unit ABOVE threshold (6.0) with 2 sources → fires, conf=0.85."""
        cfg = _cfg(heavy_rain_mm_per_hr=self.THRESHOLD)
        reading = _base_reading(
            rain_mm_hr=self.THRESHOLD + 1.0,
            weather_sources=["IMD", "OpenWeatherMap"],
        )
        result = await _eval_heavy_rain(reading, cfg, mock_redis)

        assert result.status == "active"
        assert result.confidence_score == pytest.approx(0.85, abs=0.01), (
            f"2 sources should give confidence=0.85, got {result.confidence_score}"
        )

    @pytest.mark.asyncio
    async def test_heavy_rain_at_double_threshold_fires_with_max_confidence(self, mock_redis):
        """Value ≥ 2× threshold → exceedance=2.0 → confidence=0.95 regardless of source count."""
        cfg = _cfg(heavy_rain_mm_per_hr=self.THRESHOLD)
        reading = _base_reading(
            rain_mm_hr=self.THRESHOLD * 2,
            weather_sources=["IMD"],  # only 1 source
        )
        result = await _eval_heavy_rain(reading, cfg, mock_redis)

        assert result.status == "active"
        assert result.confidence_score == pytest.approx(0.95, abs=0.01), (
            "Value ≥ 2× threshold should give confidence=0.95 even with 1 source"
        )


class TestExtremeHeatThreshold:
    """ExtremeHeat threshold = 42.0 °C (cfg default)."""

    THRESHOLD = 42.0

    @pytest.mark.asyncio
    async def test_extreme_heat_at_threshold_fires(self, mock_redis):
        """Temperature exactly at 42.0°C with 2 sources → active."""
        cfg = _cfg(extreme_heat_celsius=self.THRESHOLD)
        reading = _base_reading(
            temp_c=self.THRESHOLD,
            weather_sources=["OpenWeatherMap", "IMD"],
        )
        result = await _eval_extreme_heat(reading, cfg, mock_redis)

        assert result.status == "active", (
            f"ExtremeHeat at threshold should fire, confidence={result.confidence_score}"
        )

    @pytest.mark.asyncio
    async def test_extreme_heat_below_threshold_does_not_fire(self, mock_redis):
        """Temperature 1°C below (41.0) → should not fire."""
        cfg = _cfg(extreme_heat_celsius=self.THRESHOLD)
        reading = _base_reading(
            temp_c=self.THRESHOLD - 1.0,
            weather_sources=["OpenWeatherMap", "IMD"],
        )
        result = await _eval_extreme_heat(reading, cfg, mock_redis)

        assert result.status == "evaluated"

    @pytest.mark.asyncio
    async def test_extreme_heat_above_threshold_fires(self, mock_redis):
        """Temperature 1°C above (43.0) → active with correct confidence."""
        cfg = _cfg(extreme_heat_celsius=self.THRESHOLD)
        reading = _base_reading(
            temp_c=self.THRESHOLD + 1.0,
            weather_sources=["OpenWeatherMap", "IMD"],
        )
        result = await _eval_extreme_heat(reading, cfg, mock_redis)

        assert result.status == "active"
        assert result.confidence_score >= cfg.confidence_threshold


class TestSeverePollutionThreshold:
    """SeverePollution threshold = 300 AQI (cfg default)."""

    THRESHOLD = 300

    @pytest.mark.asyncio
    async def test_severe_pollution_at_threshold_fires(self, mock_redis):
        """AQI exactly 300 with 2 sources → active."""
        cfg = _cfg(severe_aqi=self.THRESHOLD)
        reading = _base_reading(
            aqi=self.THRESHOLD,
            aqi_sources=["OpenAQ", "CPCB"],
        )
        result = await _eval_severe_pollution(reading, cfg, mock_redis)

        assert result.status == "active"

    @pytest.mark.asyncio
    async def test_severe_pollution_below_threshold_does_not_fire(self, mock_redis):
        """AQI 299 → should not fire."""
        cfg = _cfg(severe_aqi=self.THRESHOLD)
        reading = _base_reading(
            aqi=self.THRESHOLD - 1,
            aqi_sources=["OpenAQ", "CPCB"],
        )
        result = await _eval_severe_pollution(reading, cfg, mock_redis)

        assert result.status == "evaluated", (
            f"AQI {self.THRESHOLD-1} must not fire (below threshold={self.THRESHOLD})"
        )

    @pytest.mark.asyncio
    async def test_severe_pollution_above_threshold_fires(self, mock_redis):
        """AQI 301 → active."""
        cfg = _cfg(severe_aqi=self.THRESHOLD)
        reading = _base_reading(
            aqi=self.THRESHOLD + 1,
            aqi_sources=["OpenAQ", "CPCB"],
        )
        result = await _eval_severe_pollution(reading, cfg, mock_redis)

        assert result.status == "active"
        assert result.confidence_score >= cfg.confidence_threshold


class TestLocalRestrictionThreshold:
    """LocalRestriction fires when has_restriction=True (threshold=1.0)."""

    def test_local_restriction_active_fires(self):
        """has_restriction=True → active, confidence=0.95."""
        cfg = _cfg()
        reading = _base_reading(
            has_restriction=True,
            restriction_reason="Section 144",
            restriction_source="DistrictCollector",
        )
        result = _eval_local_restriction(reading, cfg)

        assert result.status == "active"
        assert result.confidence_score == pytest.approx(0.95, abs=0.01)
        assert result.measured_value == pytest.approx(1.0, abs=0.01)

    def test_local_restriction_inactive_does_not_fire(self):
        """has_restriction=False → evaluated, not active."""
        cfg = _cfg()
        reading = _base_reading(has_restriction=False)
        result = _eval_local_restriction(reading, cfg)

        assert result.status == "evaluated"
        assert result.measured_value == pytest.approx(0.0, abs=0.01)

    def test_local_restriction_threshold_is_one(self):
        """Architecture guard: LocalRestriction threshold is always 1.0."""
        cfg = _cfg()
        reading = _base_reading(has_restriction=True)
        result = _eval_local_restriction(reading, cfg)

        assert result.threshold == pytest.approx(1.0, abs=0.001)


class TestPlatformOutageThreshold:
    """PlatformOutage threshold = 60 minutes (cfg default)."""

    THRESHOLD = 60

    def test_platform_outage_at_threshold_fires(self):
        """Outage exactly at 60 min with 2 sources → active."""
        cfg = _cfg(platform_outage_minutes=self.THRESHOLD)
        reading = _base_reading(
            outage_minutes=self.THRESHOLD,
            outage_platform="Zomato",
            outage_source="PlatformMonitor",
        )
        result = _eval_platform_outage(reading, cfg)

        assert result.status == "active"

    def test_platform_outage_below_threshold_does_not_fire(self):
        """Outage at 59 min → not fired."""
        cfg = _cfg(platform_outage_minutes=self.THRESHOLD)
        reading = _base_reading(
            outage_minutes=self.THRESHOLD - 1,
            outage_platform="Zomato",
            outage_source="PlatformMonitor",
        )
        result = _eval_platform_outage(reading, cfg)

        assert result.status == "evaluated"

    def test_platform_outage_above_threshold_fires(self):
        """Outage at 61 min → active."""
        cfg = _cfg(platform_outage_minutes=self.THRESHOLD)
        reading = _base_reading(
            outage_minutes=self.THRESHOLD + 1,
            outage_platform="Swiggy",
            outage_source="PlatformMonitor",
        )
        result = _eval_platform_outage(reading, cfg)

        assert result.status == "active"

    def test_platform_outage_source_appended(self):
        """outage_platform name is prepended to sources list."""
        cfg = _cfg(platform_outage_minutes=self.THRESHOLD)
        reading = _base_reading(
            outage_minutes=self.THRESHOLD,
            outage_platform="Zomato",
            outage_source="APIMonitor",
        )
        result = _eval_platform_outage(reading, cfg)

        assert any("Zomato" in s for s in result.sources), (
            f"Platform name must appear in sources: {result.sources}"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Suite 16 — Trigger feed integrity
# ═══════════════════════════════════════════════════════════════════════════════

class TestTriggerFeedIntegrity:
    """
    PRD §23 — Test 16:
    When two sources diverge by > 20%, confidence is penalised to 0.50
    and the trigger must NOT fire.
    """

    def test_check_source_divergence_detects_25pct_gap(self):
        """compute_confidence source_readings with 25% gap → inconsistent=True."""
        # A=100, B=60 → mean=80, max_dev = |100-80|/80 = 25% > 20%
        inconsistent, dev = check_source_divergence({"IMD": 100.0, "OpenWeatherMap": 60.0})
        assert inconsistent is True, (
            f"25% divergence must be flagged as inconsistent, dev={dev:.1%}"
        )
        assert dev > _DIVERGENCE_THRESHOLD

    def test_check_source_divergence_allows_10pct_gap(self):
        """10% divergence → consistent."""
        inconsistent, dev = check_source_divergence({"A": 100.0, "B": 95.0})
        assert inconsistent is False, f"10% divergence should be OK, got inconsistent={inconsistent}"

    def test_check_source_divergence_boundary_exactly_20pct(self):
        """
        Exactly at the 20% boundary: max deviation = 20% → NOT inconsistent
        (rule is strictly >, not >=).
        """
        # mean=87.5, A deviation from mean: |75-87.5|/87.5 = 14.3%... let me use exact values
        # For exactly 20% deviation: mean=m, one source = m*(1+0.20) = 1.2m
        # other = m*(1-0.20) = 0.8m; so A=120, B=80 → mean=100, max_dev=0.20
        inconsistent, dev = check_source_divergence({"A": 120.0, "B": 80.0})
        assert dev == pytest.approx(0.20, abs=0.001)
        assert inconsistent is False, "Exactly 20% is NOT inconsistent (rule is >20%)"

    def test_compute_confidence_inconsistent_sources_returns_0_50(self):
        """
        When sources diverge >20%, compute_confidence must return
        (INCONSISTENT_SOURCES_CONFIDENCE=0.50, is_inconsistent=True).
        """
        source_readings = {"IMD": 50.0, "OpenWeatherMap": 30.0}  # A=50,B=30→mean=40,dev=25%
        confidence, is_inconsistent = compute_confidence(
            sources=["IMD", "OpenWeatherMap"],
            value=50.0,
            threshold=5.0,
            source_readings=source_readings,
        )
        assert confidence == pytest.approx(INCONSISTENT_SOURCES_CONFIDENCE, abs=0.001), (
            f"Inconsistent sources must yield confidence={INCONSISTENT_SOURCES_CONFIDENCE}, "
            f"got {confidence}"
        )
        assert is_inconsistent is True

    @pytest.mark.asyncio
    async def test_heavy_rain_with_inconsistent_sources_does_not_fire(self, mock_redis):
        """
        HeavyRain above threshold but sources diverge 25% →
        confidence=0.50 < threshold(0.75) → status='evaluated', NOT active.
        """
        cfg = _cfg(heavy_rain_mm_per_hr=5.0, confidence_threshold=0.75)
        reading = _base_reading(
            rain_mm_hr=42.0,   # well above threshold
            weather_sources=["IMD", "OpenWeatherMap"],
            weather_source_readings={"IMD": 42.0, "OpenWeatherMap": 25.0},  # mean=33.5, dev=25%
        )
        result = await _eval_heavy_rain(reading, cfg, mock_redis)

        assert result.confidence_score == pytest.approx(INCONSISTENT_SOURCES_CONFIDENCE, abs=0.001)
        assert result.status == "evaluated", (
            "Trigger with inconsistent sources must NOT fire even if value exceeds threshold"
        )
        assert result.audit_snapshot["inconsistent_sources"] is True

    @pytest.mark.asyncio
    async def test_severe_pollution_with_inconsistent_aqi_sources_blocked(self, mock_redis):
        """
        SeverePollution fired on raw value but sources diverge >20% →
        confidence penalised → no payout initiated.
        """
        cfg = _cfg(severe_aqi=300, confidence_threshold=0.75)
        reading = _base_reading(
            aqi=350,
            aqi_sources=["OpenAQ", "CPCB"],
            aqi_source_readings={"OpenAQ": 350, "CPCB": 220},  # 45% divergence
        )
        result = await _eval_severe_pollution(reading, cfg, mock_redis)

        assert result.confidence_score == pytest.approx(0.50, abs=0.001)
        assert result.status == "evaluated"

    @pytest.mark.asyncio
    async def test_single_source_gives_confidence_0_60(self, mock_redis):
        """Single corroborating source below 2× threshold → confidence=0.60 < 0.75."""
        cfg = _cfg(heavy_rain_mm_per_hr=5.0, confidence_threshold=0.75)
        reading = _base_reading(
            rain_mm_hr=6.0,   # above threshold, but modest (not 2×)
            weather_sources=["IMD"],  # only ONE source
        )
        result = await _eval_heavy_rain(reading, cfg, mock_redis)

        assert result.confidence_score == pytest.approx(0.60, abs=0.01), (
            f"Single source < 2× threshold → confidence 0.60, got {result.confidence_score}"
        )
        assert result.status == "evaluated", (
            "Single-source trigger below threshold must not fire (confidence 0.60 < 0.75)"
        )

    @pytest.mark.asyncio
    async def test_two_sources_gives_confidence_0_85(self, mock_redis):
        """Two consistent sources → confidence=0.85 ≥ 0.75 → active."""
        cfg = _cfg(heavy_rain_mm_per_hr=5.0, confidence_threshold=0.75)
        reading = _base_reading(
            rain_mm_hr=6.0,
            weather_sources=["IMD", "OpenWeatherMap"],
            # close readings → consistent
            weather_source_readings={"IMD": 6.0, "OpenWeatherMap": 6.2},
        )
        result = await _eval_heavy_rain(reading, cfg, mock_redis)

        assert result.confidence_score == pytest.approx(0.85, abs=0.01)
        assert result.status == "active"

    @pytest.mark.asyncio
    async def test_inconsistent_sources_flag_stored_in_audit_snapshot(self, mock_redis):
        """
        Audit snapshot must record inconsistent_sources=True when divergence fires.
        This ensures full explainability per PRD §10.
        """
        cfg = _cfg(heavy_rain_mm_per_hr=5.0)
        reading = _base_reading(
            rain_mm_hr=30.0,
            weather_sources=["IMD", "OpenWeatherMap"],
            weather_source_readings={"IMD": 30.0, "OpenWeatherMap": 18.0},  # 40% diff
        )
        result = await _eval_heavy_rain(reading, cfg, mock_redis)

        assert result.audit_snapshot.get("inconsistent_sources") is True, (
            "Inconsistent sources must be flagged in audit_snapshot"
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Confidence scoring unit tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestComputeConfidence:
    """Direct unit tests for the compute_confidence() helper."""

    def test_three_sources_gives_0_95(self):
        conf, inconsistent = compute_confidence(
            sources=["A", "B", "C"], value=10.0, threshold=5.0
        )
        assert conf == pytest.approx(0.95)
        assert inconsistent is False

    def test_extreme_value_double_threshold_gives_0_95(self):
        conf, inconsistent = compute_confidence(
            sources=["A"], value=10.0, threshold=5.0  # exceedance=2.0
        )
        assert conf == pytest.approx(0.95)

    def test_two_sources_gives_0_85(self):
        conf, inconsistent = compute_confidence(
            sources=["A", "B"], value=6.0, threshold=5.0  # exceedance=1.2
        )
        assert conf == pytest.approx(0.85)

    def test_one_source_below_15x_gives_0_60(self):
        conf, _ = compute_confidence(
            sources=["A"], value=6.0, threshold=5.0  # exceedance=1.2, n=1
        )
        assert conf == pytest.approx(0.60)

    def test_inconsistent_threshold_constant_is_0_50(self):
        assert INCONSISTENT_SOURCES_CONFIDENCE == pytest.approx(0.50)

    def test_divergence_threshold_is_20_pct(self):
        assert _DIVERGENCE_THRESHOLD == pytest.approx(0.20)

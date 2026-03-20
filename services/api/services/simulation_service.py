"""
Insurance Economics Simulation Engine — Suraksha Weekly (PRD §44)

Simulates financial impact of catastrophic events on the insurance portfolio.
Used by admin dashboard to stress-test pricing, coverage, and expansion decisions.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional

import numpy as np


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Data Classes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@dataclass
class SimulationInputs:
    """Configurable simulation parameters."""

    claim_frequency_per_week: float = 0.14  # 14% of active policies per week
    avg_claim_severity_inr: dict[str, float] = field(default_factory=lambda: {
        "HeavyRain": 350.0,
        "ExtremeHeat": 280.0,
        "SeverePollution": 320.0,
        "LocalRestriction": 650.0,
        "PlatformOutage": 180.0,
    })
    weeks: int = 6
    active_policy_count: int = 1000
    avg_weekly_premium_inr: float = 89.0
    operating_expense_per_policy_inr: float = 12.0

    # Scenario-specific parameters
    trigger_fire_probability: dict[str, float] = field(default_factory=lambda: {
        "HeavyRain": 0.20,
        "ExtremeHeat": 0.15,
        "SeverePollution": 0.25,
        "LocalRestriction": 0.05,
        "PlatformOutage": 0.10,
    })

    # City-specific parameters (coverage area, baseline risk)
    city_weights: dict[str, float] = field(default_factory=lambda: {
        "Mumbai": 0.30,
        "Delhi": 0.25,
        "Bengaluru": 0.20,
        "Hyderabad": 0.15,
        "Pune": 0.10,
    })

    avg_coverage_cap_inr: float = 1500.0  # Average across plan variants


@dataclass
class WeeklyBreakdown:
    """Per-week simulation results."""

    week: int
    claims_count: int
    claims_cost_inr: float
    premium_earned_inr: float
    loss_ratio_pct: float
    combined_ratio_pct: float
    triggers_fired: list[str]


@dataclass
class CitySegment:
    """Per-city simulation results."""

    city: str
    claims_count: int
    claims_cost_inr: float
    premium_earned_inr: float
    operating_expenses_inr: float
    loss_ratio_pct: float
    combined_ratio_pct: float
    contribution_margin_pct: float
    stop_expand_flag: bool
    stop_expand_reason: Optional[str] = None


@dataclass
class SimulationOutput:
    """Complete simulation results."""

    scenario_name: str
    inputs: dict[str, Any]

    # Aggregate metrics
    gross_loss_ratio_pct: float
    combined_ratio_pct: float
    contribution_margin_pct: float
    required_premium_adjustment_pct: float
    exposure_at_risk_inr: float

    # Detailed breakdowns
    weekly_breakdown: list[WeeklyBreakdown]
    city_segment_breakdown: list[CitySegment]

    # Flags
    is_sustainable: bool
    sustainability_issues: list[str]

    # Metadata
    simulation_timestamp: str
    cache_key: str


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Simulation Service
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class SimulationService:
    """
    Insurance Economics Simulation Engine.

    Computes portfolio-level financial metrics under various catastrophe scenarios.
    """

    COMBINED_RATIO_TARGET = 85.0  # Target combined ratio percentage
    STOP_EXPAND_THRESHOLD = 90.0  # Combined ratio threshold to stop city expansion
    CONSECUTIVE_WEEKS_THRESHOLD = 3  # Weeks of poor performance to trigger stop

    # ── Preset Scenarios ──────────────────────────────────────────────────────

    SCENARIOS = {
        "monsoon_stress": {
            "name": "Monsoon Stress Test",
            "description": "3-month monsoon with 60% HeavyRain trigger frequency",
            "overrides": {
                "weeks": 12,
                "claim_frequency_per_week": 0.42,  # 3× baseline
                "trigger_fire_probability": {
                    "HeavyRain": 0.60,
                    "SeverePollution": 0.10,
                },
                "city_weights": {
                    "Mumbai": 0.50,
                    "Delhi": 0.30,
                    "Pune": 0.20,
                },
            },
        },
        "aqi_season_stress": {
            "name": "AQI Season Stress Test",
            "description": "8-week pollution season with 40% SeverePollution frequency",
            "overrides": {
                "weeks": 8,
                "claim_frequency_per_week": 0.28,  # 2× baseline
                "trigger_fire_probability": {
                    "SeverePollution": 0.40,
                    "HeavyRain": 0.05,
                },
                "city_weights": {
                    "Delhi": 0.60,
                    "Bengaluru": 0.40,
                },
            },
        },
        "extreme_heatwave": {
            "name": "Extreme Heatwave",
            "description": "6-week heatwave with 50% ExtremeHeat frequency",
            "overrides": {
                "weeks": 6,
                "claim_frequency_per_week": 0.35,  # 2.5× baseline
                "trigger_fire_probability": {
                    "ExtremeHeat": 0.50,
                },
                # All cities equally affected
            },
        },
        "civic_lockdown": {
            "name": "Civic Restriction/City Lockdown",
            "description": "2-week lockdown with 80% LocalRestriction frequency",
            "overrides": {
                "weeks": 2,
                "claim_frequency_per_week": 0.56,  # 4× baseline
                "trigger_fire_probability": {
                    "LocalRestriction": 0.80,
                },
                "avg_claim_severity_inr": {
                    "LocalRestriction": 750.0,  # Higher severity during lockdown
                },
            },
        },
    }

    def __init__(self):
        """Initialize simulation service."""
        pass

    def run_scenario(
        self,
        scenario_name: str,
        overrides: Optional[dict[str, Any]] = None,
    ) -> SimulationOutput:
        """
        Run a simulation scenario with optional parameter overrides.

        Args:
            scenario_name: Name of preset scenario or "custom"
            overrides: Dict of parameter overrides to apply

        Returns:
            SimulationOutput with complete results

        Raises:
            ValueError: If scenario_name is invalid
        """
        # Load base inputs
        inputs = SimulationInputs()

        # Apply scenario preset
        if scenario_name != "custom" and scenario_name not in self.SCENARIOS:
            raise ValueError(
                f"Invalid scenario: {scenario_name}. "
                f"Valid options: {list(self.SCENARIOS.keys())} or 'custom'"
            )

        if scenario_name != "custom":
            scenario_config = self.SCENARIOS[scenario_name]
            self._apply_overrides(inputs, scenario_config["overrides"])

        # Apply user overrides
        if overrides:
            self._apply_overrides(inputs, overrides)

        # Generate cache key
        cache_key = self._generate_cache_key(scenario_name, overrides or {})

        # Run simulation
        weekly_breakdown = self._simulate_weeks(inputs)
        city_breakdown = self._simulate_cities(inputs, weekly_breakdown)

        # Compute aggregate metrics
        total_claims_cost = sum(w.claims_cost_inr for w in weekly_breakdown)
        total_premium = sum(w.premium_earned_inr for w in weekly_breakdown)
        total_operating = (
            inputs.active_policy_count
            * inputs.operating_expense_per_policy_inr
            * inputs.weeks
        )

        gross_loss_ratio = (total_claims_cost / total_premium * 100) if total_premium > 0 else 0.0
        combined_ratio = ((total_claims_cost + total_operating) / total_premium * 100) if total_premium > 0 else 0.0
        contribution_margin = 100.0 - combined_ratio

        # Premium adjustment calculation
        if combined_ratio > self.COMBINED_RATIO_TARGET:
            # Increase premium by 60% of the overage
            required_adjustment = (combined_ratio - self.COMBINED_RATIO_TARGET) * 0.6
        else:
            required_adjustment = 0.0

        # Exposure at risk
        avg_trigger_prob = np.mean(list(inputs.trigger_fire_probability.values()))
        exposure_at_risk = (
            inputs.active_policy_count
            * inputs.avg_coverage_cap_inr
            * avg_trigger_prob
        )

        # Sustainability checks
        is_sustainable = combined_ratio <= self.COMBINED_RATIO_TARGET
        issues = []

        if combined_ratio > self.COMBINED_RATIO_TARGET:
            issues.append(
                f"Combined ratio {combined_ratio:.1f}% exceeds target {self.COMBINED_RATIO_TARGET:.1f}%"
            )

        for city_seg in city_breakdown:
            if city_seg.stop_expand_flag:
                issues.append(f"{city_seg.city}: {city_seg.stop_expand_reason}")

        # Build output
        return SimulationOutput(
            scenario_name=scenario_name,
            inputs={
                "claim_frequency_per_week": inputs.claim_frequency_per_week,
                "avg_claim_severity_inr": inputs.avg_claim_severity_inr,
                "weeks": inputs.weeks,
                "active_policy_count": inputs.active_policy_count,
                "avg_weekly_premium_inr": inputs.avg_weekly_premium_inr,
                "operating_expense_per_policy_inr": inputs.operating_expense_per_policy_inr,
                "trigger_fire_probability": inputs.trigger_fire_probability,
                "city_weights": inputs.city_weights,
            },
            gross_loss_ratio_pct=round(gross_loss_ratio, 2),
            combined_ratio_pct=round(combined_ratio, 2),
            contribution_margin_pct=round(contribution_margin, 2),
            required_premium_adjustment_pct=round(required_adjustment, 2),
            exposure_at_risk_inr=round(exposure_at_risk, 2),
            weekly_breakdown=weekly_breakdown,
            city_segment_breakdown=city_breakdown,
            is_sustainable=is_sustainable,
            sustainability_issues=issues,
            simulation_timestamp=datetime.utcnow().isoformat() + "Z",
            cache_key=cache_key,
        )

    def _apply_overrides(self, inputs: SimulationInputs, overrides: dict[str, Any]) -> None:
        """Apply parameter overrides to inputs object."""
        for key, value in overrides.items():
            if hasattr(inputs, key):
                attr = getattr(inputs, key)
                if isinstance(attr, dict) and isinstance(value, dict):
                    # Merge nested dicts
                    attr.update(value)
                else:
                    setattr(inputs, key, value)

    def _generate_cache_key(self, scenario_name: str, overrides: dict[str, Any]) -> str:
        """Generate deterministic cache key from scenario + overrides."""
        overrides_json = json.dumps(overrides, sort_keys=True)
        hash_digest = hashlib.sha256(overrides_json.encode()).hexdigest()
        return f"simulation:{scenario_name}:{hash_digest[:16]}"

    def _simulate_weeks(self, inputs: SimulationInputs) -> list[WeeklyBreakdown]:
        """Simulate week-by-week claims and financial metrics."""
        weekly_results = []

        for week_num in range(1, inputs.weeks + 1):
            # Determine which triggers fire this week (probabilistic)
            triggers_fired = []
            week_claim_freq = inputs.claim_frequency_per_week
            week_severity_avg = 0.0

            for trigger_type, fire_prob in inputs.trigger_fire_probability.items():
                if np.random.random() < fire_prob:
                    triggers_fired.append(trigger_type)
                    week_severity_avg += inputs.avg_claim_severity_inr.get(trigger_type, 300.0)

            if triggers_fired:
                week_severity_avg /= len(triggers_fired)
            else:
                week_severity_avg = 250.0  # Baseline claim severity

            # Claims count this week
            claims_count = int(inputs.active_policy_count * week_claim_freq)

            # Claims cost
            claims_cost = claims_count * week_severity_avg

            # Premium earned
            premium_earned = inputs.active_policy_count * inputs.avg_weekly_premium_inr

            # Operating expenses
            operating = inputs.active_policy_count * inputs.operating_expense_per_policy_inr

            # Loss ratio
            loss_ratio = (claims_cost / premium_earned * 100) if premium_earned > 0 else 0.0
            combined_ratio = ((claims_cost + operating) / premium_earned * 100) if premium_earned > 0 else 0.0

            weekly_results.append(
                WeeklyBreakdown(
                    week=week_num,
                    claims_count=claims_count,
                    claims_cost_inr=round(claims_cost, 2),
                    premium_earned_inr=round(premium_earned, 2),
                    loss_ratio_pct=round(loss_ratio, 2),
                    combined_ratio_pct=round(combined_ratio, 2),
                    triggers_fired=triggers_fired,
                )
            )

        return weekly_results

    def _simulate_cities(
        self,
        inputs: SimulationInputs,
        weekly_breakdown: list[WeeklyBreakdown],
    ) -> list[CitySegment]:
        """Simulate per-city financial breakdown and expansion flags."""
        city_results = []

        total_premium = sum(w.premium_earned_inr for w in weekly_breakdown)
        total_claims_cost = sum(w.claims_cost_inr for w in weekly_breakdown)

        for city, weight in inputs.city_weights.items():
            city_claims_cost = total_claims_cost * weight
            city_premium = total_premium * weight
            city_operating = (
                inputs.active_policy_count * weight
                * inputs.operating_expense_per_policy_inr
                * inputs.weeks
            )
            city_claims_count = int(sum(w.claims_count for w in weekly_breakdown) * weight)

            loss_ratio = (city_claims_cost / city_premium * 100) if city_premium > 0 else 0.0
            combined_ratio = (
                (city_claims_cost + city_operating) / city_premium * 100
            ) if city_premium > 0 else 0.0
            contribution_margin = 100.0 - combined_ratio

            # Check stop-expand flag: combined_ratio > 90% for 3+ consecutive weeks
            consecutive_high_weeks = 0
            stop_flag = False
            stop_reason = None

            for week in weekly_breakdown:
                if week.combined_ratio_pct > self.STOP_EXPAND_THRESHOLD:
                    consecutive_high_weeks += 1
                    if consecutive_high_weeks >= self.CONSECUTIVE_WEEKS_THRESHOLD:
                        stop_flag = True
                        stop_reason = (
                            f"Combined ratio exceeded {self.STOP_EXPAND_THRESHOLD:.0f}% "
                            f"for {consecutive_high_weeks} consecutive weeks"
                        )
                        break
                else:
                    consecutive_high_weeks = 0

            city_results.append(
                CitySegment(
                    city=city,
                    claims_count=city_claims_count,
                    claims_cost_inr=round(city_claims_cost, 2),
                    premium_earned_inr=round(city_premium, 2),
                    operating_expenses_inr=round(city_operating, 2),
                    loss_ratio_pct=round(loss_ratio, 2),
                    combined_ratio_pct=round(combined_ratio, 2),
                    contribution_margin_pct=round(contribution_margin, 2),
                    stop_expand_flag=stop_flag,
                    stop_expand_reason=stop_reason,
                )
            )

        return city_results


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Module-level instance
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_simulation_service: Optional[SimulationService] = None


def get_simulation_service() -> SimulationService:
    """Get or create SimulationService singleton."""
    global _simulation_service
    if _simulation_service is None:
        _simulation_service = SimulationService()
    return _simulation_service

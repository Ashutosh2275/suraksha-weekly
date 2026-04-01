"""Deterministic fraud rule engine for claim moderation."""

from __future__ import annotations

import math
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Literal


Severity = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


@dataclass
class RuleResult:
    rule_name: str
    triggered: bool
    severity: Severity
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _parse_dt(value: str | datetime | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    normalized = value.replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def duplicate_claim_check(
    worker_id: str,
    policy_id: str,
    trigger_event_id: str,
    *,
    session_data: dict[str, Any] | None = None,
) -> RuleResult:
    claims = (session_data or {}).get("claims", [])
    exists = any(
        str(c.get("worker_id")) == worker_id
        and str(c.get("policy_id")) == policy_id
        and str(c.get("trigger_event_id")) == trigger_event_id
        and str(c.get("status", "")).lower() != "rejected"
        for c in claims
    )

    if exists:
        return RuleResult(
            rule_name="duplicate_claim_check",
            triggered=True,
            severity="CRITICAL",
            reason="A non-rejected claim already exists for the same worker/policy/trigger tuple.",
        )

    return RuleResult(
        rule_name="duplicate_claim_check",
        triggered=False,
        severity="LOW",
        reason="No existing non-rejected duplicate claim found.",
    )


def velocity_check(
    worker_id: str,
    lookback_hours: int = 24,
    *,
    session_data: dict[str, Any] | None = None,
) -> RuleResult:
    data = session_data or {}
    claims = data.get("claims", [])
    now = _parse_dt(data.get("now")) or _now_utc()
    cutoff = now - timedelta(hours=lookback_hours)

    count = 0
    for claim in claims:
        if str(claim.get("worker_id")) != worker_id:
            continue
        status = str(claim.get("status", "")).lower()
        if status not in {"approved", "pending"}:
            continue
        created_at = _parse_dt(claim.get("created_at"))
        if created_at is not None and created_at >= cutoff:
            count += 1

    if count >= 3:
        return RuleResult(
            rule_name="velocity_check",
            triggered=True,
            severity="HIGH",
            reason=f"Worker has {count} approved/pending claims in last {lookback_hours} hours.",
        )
    if count >= 2:
        return RuleResult(
            rule_name="velocity_check",
            triggered=True,
            severity="MEDIUM",
            reason=f"Worker has {count} approved/pending claims in last {lookback_hours} hours.",
        )

    return RuleResult(
        rule_name="velocity_check",
        triggered=False,
        severity="LOW",
        reason="Claim velocity is within expected threshold.",
    )


def device_consistency_check(
    worker_id: str,
    current_device_id: str,
    *,
    session_data: dict[str, Any] | None = None,
) -> RuleResult:
    data = session_data or {}
    sessions = [s for s in data.get("sessions", []) if str(s.get("worker_id")) == worker_id]
    sessions.sort(key=lambda s: _parse_dt(s.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    latest_five = sessions[:5]

    now = _parse_dt(data.get("claim_time")) or _parse_dt(data.get("now")) or _now_utc()
    triggered = False
    for sess in latest_five:
        seen_device = str(sess.get("device_id", ""))
        created_at = _parse_dt(sess.get("created_at"))
        if created_at is None:
            continue
        if seen_device != current_device_id and (now - created_at) <= timedelta(hours=2):
            triggered = True
            break

    if triggered:
        return RuleResult(
            rule_name="device_consistency_check",
            triggered=True,
            severity="MEDIUM",
            reason="Device ID changed within 2 hours of claim initiation.",
        )

    return RuleResult(
        rule_name="device_consistency_check",
        triggered=False,
        severity="LOW",
        reason="Recent device pattern is consistent.",
    )


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def impossible_travel_check(
    worker_id: str,
    claim_zone_id: str,
    *,
    session_data: dict[str, Any] | None = None,
) -> RuleResult:
    data = session_data or {}
    zone_coordinates = data.get("zone_coordinates", {})
    sessions = [s for s in data.get("sessions", []) if str(s.get("worker_id")) == worker_id]
    sessions.sort(key=lambda s: _parse_dt(s.get("created_at")) or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    latest = sessions[0] if sessions else None

    target = zone_coordinates.get(claim_zone_id)
    if latest is None or target is None:
        return RuleResult(
            rule_name="impossible_travel_check",
            triggered=False,
            severity="LOW",
            reason="Insufficient location data to evaluate impossible travel.",
        )

    last_lat = latest.get("lat")
    last_lon = latest.get("lon")
    last_time = _parse_dt(latest.get("created_at"))
    now = _parse_dt(data.get("claim_time")) or _parse_dt(data.get("now")) or _now_utc()

    if last_lat is None or last_lon is None or last_time is None:
        return RuleResult(
            rule_name="impossible_travel_check",
            triggered=False,
            severity="LOW",
            reason="Last known session lacks complete GPS/time fields.",
        )

    distance_km = _haversine_km(float(last_lat), float(last_lon), float(target["lat"]), float(target["lon"]))
    delta = now - last_time
    triggered = distance_km > 50.0 and delta < timedelta(minutes=30)

    if triggered:
        return RuleResult(
            rule_name="impossible_travel_check",
            triggered=True,
            severity="HIGH",
            reason=(
                f"Distance from last known location to claim zone is {distance_km:.1f} km "
                f"within {delta.total_seconds() / 60:.1f} minutes."
            ),
        )

    return RuleResult(
        rule_name="impossible_travel_check",
        triggered=False,
        severity="LOW",
        reason="Travel pattern appears plausible for claim timing.",
    )


def beneficiary_reuse_check(
    beneficiary_handle: str,
    *,
    session_data: dict[str, Any] | None = None,
) -> RuleResult:
    payouts = (session_data or {}).get("payouts", [])
    workers = {
        str(item.get("worker_id"))
        for item in payouts
        if str(item.get("beneficiary_handle")) == beneficiary_handle and item.get("worker_id")
    }
    count = len(workers)

    if count > 10:
        return RuleResult(
            rule_name="beneficiary_reuse_check",
            triggered=True,
            severity="CRITICAL",
            reason=f"Beneficiary handle is linked to {count} distinct workers (>10).",
        )
    if count > 3:
        return RuleResult(
            rule_name="beneficiary_reuse_check",
            triggered=True,
            severity="HIGH",
            reason=f"Beneficiary handle is linked to {count} distinct workers (>3).",
        )

    return RuleResult(
        rule_name="beneficiary_reuse_check",
        triggered=False,
        severity="LOW",
        reason="Beneficiary handle reuse is within threshold.",
    )


def policy_timing_abuse_check(
    policy_id: str,
    trigger_event_id: str,
    *,
    session_data: dict[str, Any] | None = None,
) -> RuleResult:
    data = session_data or {}
    policies = data.get("policies", [])
    triggers = data.get("trigger_events", [])

    policy = next((p for p in policies if str(p.get("id")) == policy_id), None)
    trigger = next((t for t in triggers if str(t.get("id")) == trigger_event_id), None)

    if policy is None or trigger is None:
        return RuleResult(
            rule_name="policy_timing_abuse_check",
            triggered=False,
            severity="LOW",
            reason="Policy or trigger record unavailable for timing abuse check.",
        )

    purchased_at = _parse_dt(policy.get("purchased_at") or policy.get("created_at"))
    event_start = _parse_dt(trigger.get("event_start") or trigger.get("created_at"))
    if purchased_at is None or event_start is None:
        return RuleResult(
            rule_name="policy_timing_abuse_check",
            triggered=False,
            severity="LOW",
            reason="Policy purchase time or trigger event_start missing.",
        )

    delta = event_start - purchased_at
    triggered = timedelta(0) <= delta <= timedelta(hours=2)

    if triggered:
        return RuleResult(
            rule_name="policy_timing_abuse_check",
            triggered=True,
            severity="HIGH",
            reason="Policy was purchased within 2 hours before trigger event_start.",
        )

    return RuleResult(
        rule_name="policy_timing_abuse_check",
        triggered=False,
        severity="LOW",
        reason="Policy purchase timing does not indicate abuse.",
    )


class RuleEngine:
    """Run deterministic fraud checks and aggregate into a composite score."""

    _SEVERITY_WEIGHT = {
        "LOW": 0.15,
        "MEDIUM": 0.5,
        "HIGH": 0.8,
        "CRITICAL": 1.0,
    }

    def __init__(self) -> None:
        self.last_composite_rule_score: float = 0.0
        self.last_triggered_rule_names: list[str] = []

    def run_all_rules(
        self,
        claim: dict[str, Any],
        worker: dict[str, Any],
        policy: dict[str, Any],
        trigger_event: dict[str, Any],
        session_data: dict[str, Any],
    ) -> list[RuleResult]:
        worker_id = str(worker.get("id") or claim.get("worker_id"))
        policy_id = str(policy.get("id") or claim.get("policy_id"))
        trigger_id = str(trigger_event.get("id") or claim.get("trigger_event_id"))

        enriched = dict(session_data)
        enriched.setdefault("claim_time", claim.get("created_at"))

        results = [
            duplicate_claim_check(worker_id, policy_id, trigger_id, session_data=enriched),
            velocity_check(worker_id, lookback_hours=24, session_data=enriched),
            device_consistency_check(worker_id, str(claim.get("current_device_id") or ""), session_data=enriched),
            impossible_travel_check(worker_id, str(claim.get("zone_id") or trigger_event.get("zone_id") or ""), session_data=enriched),
            beneficiary_reuse_check(str(claim.get("beneficiary_handle") or ""), session_data=enriched),
            policy_timing_abuse_check(policy_id, trigger_id, session_data=enriched),
        ]

        self.last_composite_rule_score, self.last_triggered_rule_names = self.aggregate_results(results)
        return results

    def aggregate_results(self, results: list[RuleResult]) -> tuple[float, list[str]]:
        triggered = [result for result in results if result.triggered]
        names = [result.rule_name for result in triggered]

        if any(result.severity == "CRITICAL" for result in triggered):
            return 1.0, names

        if not triggered:
            return 0.0, []

        weight_sum = sum(self._SEVERITY_WEIGHT[result.severity] for result in triggered)
        score = min(1.0, round(weight_sum / 3.0, 4))
        return score, names

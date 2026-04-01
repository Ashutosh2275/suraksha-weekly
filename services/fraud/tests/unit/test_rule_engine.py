from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.rules.rule_engine import (  # noqa: E402
    RuleEngine,
    beneficiary_reuse_check,
    device_consistency_check,
    duplicate_claim_check,
    impossible_travel_check,
    policy_timing_abuse_check,
    velocity_check,
)


def _iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


def test_duplicate_claim_check_triggered_and_clean() -> None:
    claims = [
        {
            "worker_id": "w1",
            "policy_id": "p1",
            "trigger_event_id": "t1",
            "status": "approved",
        }
    ]
    hit = duplicate_claim_check("w1", "p1", "t1", session_data={"claims": claims})
    clean = duplicate_claim_check("w1", "p1", "t2", session_data={"claims": claims})

    assert hit.triggered is True
    assert hit.severity == "CRITICAL"
    assert clean.triggered is False


def test_velocity_check_triggered_and_clean() -> None:
    now = datetime(2026, 4, 2, 10, 0, tzinfo=timezone.utc)
    claims = [
        {"worker_id": "w1", "status": "approved", "created_at": _iso(now - timedelta(hours=1))},
        {"worker_id": "w1", "status": "pending", "created_at": _iso(now - timedelta(hours=2))},
        {"worker_id": "w1", "status": "approved", "created_at": _iso(now - timedelta(hours=3))},
    ]

    hit = velocity_check("w1", session_data={"claims": claims, "now": _iso(now)})
    clean = velocity_check(
        "w2",
        session_data={"claims": [{"worker_id": "w2", "status": "approved", "created_at": _iso(now - timedelta(hours=26))}], "now": _iso(now)},
    )

    assert hit.triggered is True
    assert hit.severity == "HIGH"
    assert clean.triggered is False


def test_device_consistency_check_triggered_and_clean() -> None:
    now = datetime(2026, 4, 2, 10, 0, tzinfo=timezone.utc)
    sessions = [
        {"worker_id": "w1", "device_id": "old-device", "created_at": _iso(now - timedelta(minutes=30))},
        {"worker_id": "w1", "device_id": "old-device", "created_at": _iso(now - timedelta(minutes=90))},
    ]

    hit = device_consistency_check("w1", "new-device", session_data={"sessions": sessions, "claim_time": _iso(now)})
    clean = device_consistency_check("w1", "old-device", session_data={"sessions": sessions, "claim_time": _iso(now)})

    assert hit.triggered is True
    assert hit.severity == "MEDIUM"
    assert clean.triggered is False


def test_impossible_travel_check_triggered_and_clean() -> None:
    now = datetime(2026, 4, 2, 10, 0, tzinfo=timezone.utc)
    sessions = [
        {
            "worker_id": "w1",
            "device_id": "d1",
            "lat": 12.9716,
            "lon": 77.5946,
            "created_at": _iso(now - timedelta(minutes=10)),
        }
    ]
    zone_coordinates = {
        "zone_far": {"lat": 13.5204, "lon": 74.7927},
        "zone_near": {"lat": 12.98, "lon": 77.60},
    }

    hit = impossible_travel_check(
        "w1",
        "zone_far",
        session_data={"sessions": sessions, "zone_coordinates": zone_coordinates, "claim_time": _iso(now)},
    )
    clean = impossible_travel_check(
        "w1",
        "zone_near",
        session_data={"sessions": sessions, "zone_coordinates": zone_coordinates, "claim_time": _iso(now)},
    )

    assert hit.triggered is True
    assert hit.severity == "HIGH"
    assert clean.triggered is False


def test_beneficiary_reuse_check_triggered_and_clean() -> None:
    payouts = [
        {"worker_id": f"w{i}", "beneficiary_handle": "upi://same"}
        for i in range(1, 6)
    ]
    hit = beneficiary_reuse_check("upi://same", session_data={"payouts": payouts})
    clean = beneficiary_reuse_check("upi://new", session_data={"payouts": payouts})

    assert hit.triggered is True
    assert hit.severity == "HIGH"
    assert clean.triggered is False


def test_policy_timing_abuse_check_triggered_and_clean() -> None:
    now = datetime(2026, 4, 2, 10, 0, tzinfo=timezone.utc)
    data = {
        "policies": [
            {"id": "p1", "purchased_at": _iso(now - timedelta(minutes=90))},
            {"id": "p2", "purchased_at": _iso(now - timedelta(hours=6))},
        ],
        "trigger_events": [
            {"id": "t1", "event_start": _iso(now)},
            {"id": "t2", "event_start": _iso(now)},
        ],
    }

    hit = policy_timing_abuse_check("p1", "t1", session_data=data)
    clean = policy_timing_abuse_check("p2", "t2", session_data=data)

    assert hit.triggered is True
    assert hit.severity == "HIGH"
    assert clean.triggered is False


def test_rule_engine_run_all_and_critical_override() -> None:
    now = datetime(2026, 4, 2, 10, 0, tzinfo=timezone.utc)
    engine = RuleEngine()
    claim = {
        "worker_id": "w1",
        "policy_id": "p1",
        "trigger_event_id": "t1",
        "current_device_id": "new-device",
        "zone_id": "zone_far",
        "beneficiary_handle": "upi://same",
        "created_at": _iso(now),
    }
    worker = {"id": "w1"}
    policy = {"id": "p1"}
    trigger = {"id": "t1", "zone_id": "zone_far"}
    session_data = {
        "now": _iso(now),
        "claims": [
            {
                "worker_id": "w1",
                "policy_id": "p1",
                "trigger_event_id": "t1",
                "status": "approved",
                "created_at": _iso(now - timedelta(hours=1)),
            }
        ],
        "sessions": [
            {
                "worker_id": "w1",
                "device_id": "old-device",
                "lat": 12.9716,
                "lon": 77.5946,
                "created_at": _iso(now - timedelta(minutes=10)),
            }
        ],
        "zone_coordinates": {"zone_far": {"lat": 13.5204, "lon": 74.7927}},
        "payouts": [{"worker_id": f"w{i}", "beneficiary_handle": "upi://same"} for i in range(1, 5)],
        "policies": [{"id": "p1", "purchased_at": _iso(now - timedelta(minutes=30))}],
        "trigger_events": [{"id": "t1", "event_start": _iso(now)}],
    }

    results = engine.run_all_rules(claim, worker, policy, trigger, session_data)

    assert len(results) == 6
    assert "duplicate_claim_check" in engine.last_triggered_rule_names
    assert engine.last_composite_rule_score == 1.0

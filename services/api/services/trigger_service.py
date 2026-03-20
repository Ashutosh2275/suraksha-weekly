"""
Trigger Service — Suraksha Weekly (FR-4 / PRD §8)

Business logic for reading and simulating TriggerEvent records.
Called by the triggers router; writes use the same DB + Redis
infrastructure as the trigger-poller service.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime
from typing import Optional

import redis.asyncio as aioredis
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from models import TriggerEvent, AuditLog

logger = logging.getLogger(__name__)

# ── Trigger type → payout multiplier (mirrors PRD §8) ────────────────────────
TRIGGER_PAYOUT_MULT: dict[str, float] = {
    "HeavyRain":        0.80,
    "ExtremeHeat":      0.60,
    "SeverePollution":  0.75,
    "LocalRestriction": 1.00,
    "PlatformOutage":   0.90,
}

# ── Default thresholds (mirrors trigger-poller/config.py) ─────────────────────
_DEFAULT_THRESHOLDS: dict[str, float] = {
    "HeavyRain":        5.0,
    "ExtremeHeat":      42.0,
    "SeverePollution":  300.0,
    "LocalRestriction": 1.0,
    "PlatformOutage":   60.0,
}

VALID_TRIGGER_TYPES = set(_DEFAULT_THRESHOLDS.keys())


# ── Read operations ───────────────────────────────────────────────────────────

async def get_active_triggers(
    session: AsyncSession,
    *,
    city: Optional[str] = None,
    zone: Optional[str] = None,
    trigger_type: Optional[str] = None,
    limit: int = 50,
) -> list[TriggerEvent]:
    """
    Return currently active TriggerEvent rows, newest first.

    Optionally filtered by city (via zone prefix convention), zone, or type.
    Only returns rows with status 'active' — evaluated-but-not-triggered rows
    are excluded (they exist for audit purposes only).
    """
    query = (
        select(TriggerEvent)
        .where(TriggerEvent.status == "active")
        .order_by(desc(TriggerEvent.triggered_at))
        .limit(limit)
    )

    if zone:
        query = query.where(TriggerEvent.zone == zone)
    if trigger_type:
        query = query.where(TriggerEvent.type == trigger_type)
    # city is encoded inside audit_snapshot; we filter via a JSON cast
    if city:
        from sqlalchemy import cast, String
        query = query.where(
            TriggerEvent.audit_snapshot["city"].as_string() == city
        )

    result = await session.execute(query)
    return list(result.scalars().all())


async def get_trigger_by_id(
    session: AsyncSession,
    trigger_id: str,
) -> Optional[TriggerEvent]:
    """
    Fetch a single TriggerEvent by primary key.

    Returns None if not found — caller raises HTTP 404.
    """
    result = await session.execute(
        select(TriggerEvent).where(TriggerEvent.id == trigger_id)
    )
    return result.scalar_one_or_none()


async def list_recent_triggers(
    session: AsyncSession,
    *,
    zone: Optional[str] = None,
    days: int = 7,
    limit: int = 100,
) -> list[TriggerEvent]:
    """
    Return all trigger events (any status) from the last `days` days.

    Used by the admin dashboard to audit the evaluation history.
    """
    from datetime import timedelta
    cutoff = datetime.utcnow() - timedelta(days=days)

    query = (
        select(TriggerEvent)
        .where(TriggerEvent.triggered_at >= cutoff)
        .order_by(desc(TriggerEvent.triggered_at))
        .limit(limit)
    )
    if zone:
        query = query.where(TriggerEvent.zone == zone)

    result = await session.execute(query)
    return list(result.scalars().all())


# ── Simulate trigger (admin / demo) ──────────────────────────────────────────

async def simulate_trigger(
    session: AsyncSession,
    redis: aioredis.Redis,
    *,
    trigger_type: str,
    zone: str,
    city: str,
    value: float,
    redis_channel: str = "trigger_events",
) -> TriggerEvent:
    """
    Manually inject a simulated TriggerEvent into the DB and publish it
    to Redis pub/sub.  Intended for demos and integration testing.

    The event is written with:
        status            = "active"
        confidence_score  = 0.95   (max — assumed admin-verified)
        sources           = ["manual_simulation"]

    The caller is responsible for committing the session.

    Args:
        session:        Active async DB session (not committed yet)
        redis:          Connected aioredis.Redis instance
        trigger_type:   One of VALID_TRIGGER_TYPES
        zone:           Delivery zone name (e.g. "Andheri")
        city:           City name (e.g. "Mumbai")
        value:          Measured value that breaches the threshold
        redis_channel:  Redis pub/sub channel for downstream consumers

    Returns:
        The newly created TriggerEvent ORM instance.

    Raises:
        ValueError: if trigger_type is not in VALID_TRIGGER_TYPES
    """
    if trigger_type not in VALID_TRIGGER_TYPES:
        raise ValueError(
            f"Unknown trigger type '{trigger_type}'. "
            f"Must be one of: {sorted(VALID_TRIGGER_TYPES)}"
        )

    threshold = _DEFAULT_THRESHOLDS[trigger_type]
    trigger_id = str(uuid.uuid4())
    now = datetime.utcnow()

    audit_snapshot = {
        "city":            city,
        "zone":            zone,
        "trigger_type":    trigger_type,
        "measured_value":  value,
        "threshold":       threshold,
        "confidence_score": 0.95,
        "sources":         ["manual_simulation"],
        "simulated_at":    now.isoformat(),
        "payout_multiplier": TRIGGER_PAYOUT_MULT.get(trigger_type, 1.0),
        "mock_mode":       False,
    }

    event = TriggerEvent(
        id               = trigger_id,
        type             = trigger_type,
        zone             = zone,
        value            = value,
        threshold        = threshold,
        confidence_score = 0.95,
        sources          = ["manual_simulation"],
        status           = "active",
        triggered_at     = now,
        audit_snapshot   = audit_snapshot,
        created_at       = now,
    )
    session.add(event)

    # Write immutable audit log within the same session
    audit = AuditLog(
        id          = str(uuid.uuid4()),
        entity_type = "TriggerEvent",
        entity_id   = trigger_id,
        action      = "simulated",
        actor       = "admin",
        actor_id    = None,
        payload     = audit_snapshot,
        timestamp   = now,
    )
    session.add(audit)

    # Flush so the rows are visible inside the transaction but not yet committed
    await session.flush()

    # Publish to Redis so Claim Orchestration can pick it up immediately
    payload = json.dumps({
        "trigger_id":       trigger_id,
        "type":             trigger_type,
        "zone":             zone,
        "city":             city,
        "measured_value":   value,
        "threshold":        threshold,
        "confidence_score": 0.95,
        "sources":          ["manual_simulation"],
        "triggered_at":     now.isoformat(),
    })
    n = await redis.publish(redis_channel, payload)
    logger.info(
        "[simulate] Published %s for %s/%s → %s receivers",
        trigger_type, city, zone, n,
    )

    return event

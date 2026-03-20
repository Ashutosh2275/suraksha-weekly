"""
DB Writer — Suraksha Weekly Trigger Poller

Direct asyncpg writes to PostgreSQL for TriggerEvent and AuditLog rows.
Bypasses SQLAlchemy to keep the poller service lightweight and dependency-free.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime

import asyncpg

from evaluator import TriggerEvaluation

logger = logging.getLogger(__name__)


async def write_trigger_event(
    conn: asyncpg.Connection,
    evaluation: TriggerEvaluation,
) -> str:
    """
    Insert a TriggerEvent row (EVALUATED or ACTIVE) and a matching AuditLog.

    Both writes are wrapped in a single transaction for atomicity.

    Args:
        conn:       asyncpg connection
        evaluation: TriggerEvaluation from evaluator.py

    Returns:
        trigger_id: UUID str of the newly inserted row
    """
    trigger_id = str(uuid.uuid4())
    audit_id   = str(uuid.uuid4())
    now        = datetime.utcnow()

    async with conn.transaction():
        # ── TriggerEvent ────────────────────────────────────────────────────
        await conn.execute(
            """
            INSERT INTO trigger_events
                (id, type, zone, value, threshold, confidence_score,
                 sources, status, triggered_at, audit_snapshot, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            """,
            trigger_id,
            evaluation.trigger_type,
            evaluation.zone,
            evaluation.measured_value,
            evaluation.threshold,
            evaluation.confidence_score,
            evaluation.sources,           # asyncpg natively handles text[]
            evaluation.status,
            now,
            json.dumps(evaluation.audit_snapshot),
            now,
        )

        # ── AuditLog — immutable record for every evaluation ────────────────
        action = "trigger_fired" if evaluation.status == "active" else "trigger_evaluated"
        payload = {
            "trigger_type":     evaluation.trigger_type,
            "zone":             evaluation.zone,
            "city":             evaluation.city,
            "measured_value":   evaluation.measured_value,
            "threshold":        evaluation.threshold,
            "confidence_score": evaluation.confidence_score,
            "sources":          evaluation.sources,
            "status":           evaluation.status,
        }
        await conn.execute(
            """
            INSERT INTO audit_logs
                (id, entity_type, entity_id, action, actor, actor_id, payload, timestamp)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            audit_id,
            "TriggerEvent",
            trigger_id,
            action,
            "trigger_poller",
            None,                         # actor_id NULL — system actor
            json.dumps(payload),
            now,
        )

    return trigger_id


async def get_db_connection(database_url: str) -> asyncpg.Connection:
    """
    Open a single asyncpg connection.

    The poller uses a single long-lived connection (not a pool) since it runs
    once every 5 minutes and doesn't need concurrent query execution.
    """
    # asyncpg expects postgresql:// not postgresql+asyncpg://
    url = database_url.replace("postgresql+asyncpg://", "postgresql://")
    return await asyncpg.connect(dsn=url)

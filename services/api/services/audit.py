"""Audit logging service for compliance and audit trails."""
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from models import AuditLog


async def log_event(
    session: AsyncSession,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str,
    payload: dict,
    actor_id: Optional[str] = None,
) -> AuditLog:
    """
    Log an event to the audit trail.

    This function creates an immutable record of every state change for compliance
    and debugging. Called on every claim, policy, and payout state transition.

    Args:
        session: SQLAlchemy async session
        entity_type: Type of entity (e.g., "Claim", "Policy", "Worker")
        entity_id: ID of the entity
        action: Action performed (e.g., "created", "approved", "paid")
        actor: Who performed the action (e.g., "system", "admin_user_id", "worker_id")
        payload: Metadata about the action (dict with reason_codes, fraud_score, etc.)
        actor_id: Foreign key to worker if actor is a worker (optional)

    Returns:
        AuditLog: Created audit log entry

    Example:
        ```python
        await log_event(
            session=session,
            entity_type="Claim",
            entity_id=claim.id,
            action="approved",
            actor="system",
            payload={
                "fraud_score": 25.0,
                "reason_codes": ["low_risk", "new_worker"],
                "approved_by": "fraud_engine_v1",
            },
        )
        ```
    """
    audit_log = AuditLog(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        actor=actor,
        actor_id=actor_id,
        payload=payload,
        timestamp=datetime.utcnow(),
    )

    session.add(audit_log)

    # Note: We don't commit here—caller is responsible for committing the transaction.
    # This ensures the audit log is part of the same transaction as the state change.

    return audit_log

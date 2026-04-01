"""Compatibility wrapper for the immutable core audit module."""

from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

import asyncio

from core.audit import audit_logged, log_event as core_log_event


async def log_event(
    session: AsyncSession,
    entity_type: str,
    entity_id: str,
    action: str,
    actor: str,
    payload: dict,
    actor_id: Optional[str] = None,
):
    """Compatibility shim: schedule a fire-and-forget immutable audit insert."""

    _ = session
    try:
        return asyncio.create_task(
            core_log_event(
                entity_type=entity_type,
                entity_id=entity_id,
                action=action,
                actor_id=actor_id,
                actor_role=actor,
                previous_state=None,
                new_state=None,
                metadata=payload,
            )
        )
    except RuntimeError:
        await core_log_event(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_id=actor_id,
            actor_role=actor,
            previous_state=None,
            new_state=None,
            metadata=payload,
        )


__all__ = ["log_event", "audit_logged"]

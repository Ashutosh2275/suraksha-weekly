from __future__ import annotations

import asyncio
import uuid

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from core.audit import AuditLogMutationError, audit_logged
from core.database import DatabaseManager
from models import AuditLog


pytestmark = pytest.mark.asyncio(scope="session")


async def _wait_for_audit_row(db_session, entity_type: str, entity_id: str, expected: int = 1) -> int:
    for _ in range(50):
        result = await db_session.execute(
            select(AuditLog.id).where(AuditLog.entity_type == entity_type, AuditLog.entity_id == entity_id)
        )
        rows = result.scalars().all()
        if len(rows) >= expected:
            return len(rows)
        await asyncio.sleep(0.1)
    return len(rows)


@pytest.mark.asyncio
async def test_audit_logged_inserts_once_and_blocks_delete():
    engine = create_async_engine("postgresql+asyncpg://suraksha:password@localhost:5432/suraksha_db")
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    previous_factory = DatabaseManager._session_factory
    DatabaseManager._session_factory = session_factory

    try:
        async with session_factory() as db_session:
            class PolicyTransitionTarget:
                def __init__(self, entity_id: str) -> None:
                    self.id = entity_id
                    self.status = "active"
                    self.actor_id = None
                    self.actor_role = "system"

            policy = PolicyTransitionTarget(str(uuid.uuid4()))

            @audit_logged("Policy", "status_changed")
            async def transition_policy(policy_row: PolicyTransitionTarget) -> PolicyTransitionTarget:
                policy_row.status = "expired"
                return policy_row

            await transition_policy(policy)
            await asyncio.sleep(0.2)

            inserted = await _wait_for_audit_row(db_session, "Policy", policy.id, expected=1)
            assert inserted == 1

            result = await db_session.execute(
                select(AuditLog).where(AuditLog.entity_type == "Policy", AuditLog.entity_id == policy.id)
            )
            row = result.scalar_one()
            assert row.action == "status_changed"
            assert row.previous_state["status"] == "active"
            assert row.new_state["status"] == "expired"
            assert row.metadata_["wrapped_action"] == "status_changed"

            await db_session.delete(row)
            with pytest.raises(AuditLogMutationError):
                await db_session.commit()

            await db_session.rollback()

            await db_session.execute(text("DELETE FROM audit_logs WHERE entity_id = :entity_id"), {"entity_id": policy.id})
            await db_session.commit()
    finally:
        DatabaseManager._session_factory = previous_factory
        await engine.dispose()

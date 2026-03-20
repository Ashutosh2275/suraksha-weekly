"""
Admin audit-log endpoint contract coverage.
"""
from __future__ import annotations

import uuid
from datetime import datetime

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from models import AuditLog


@pytest.mark.contract
class TestAdminAuditContracts:
    @pytest.mark.asyncio
    async def test_audit_logs_requires_admin_token(self, client: AsyncClient) -> None:
        resp = await client.get('/api/v1/admin/audit-logs')
        assert resp.status_code == 401

    @pytest.mark.asyncio
    async def test_audit_logs_list_returns_rows(
        self,
        client: AsyncClient,
        admin_headers: dict,
        db_session: AsyncSession,
    ) -> None:
        row = AuditLog(
            id=str(uuid.uuid4()),
            entity_type='Claim',
            entity_id=str(uuid.uuid4()),
            action='manual_apply_initiated',
            actor='contract-test',
            payload={'source': 'integration-test'},
            timestamp=datetime.utcnow(),
        )
        db_session.add(row)
        await db_session.commit()

        resp = await client.get('/api/v1/admin/audit-logs?page=1&limit=20', headers=admin_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert 'logs' in body
        assert isinstance(body['logs'], list)
        assert any(item['id'] == row.id for item in body['logs'])

"""Add performance indexes: audit_logs table

policy.py calls _get_pending_downgrade() for every policy detail/renew:
  SELECT ... WHERE entity_type='Policy' AND entity_id=? AND action='plan_downgrade_scheduled'
  ORDER BY timestamp DESC LIMIT 1

Without indexes on `action` and a compound (entity_type, entity_id, action),
each call scans the entire audit_logs table.  At 10,000 workers renewing weekly
this table grows extremely fast; the compound index is critical.

Revision ID: 004_perf_idx_audit_logs
Revises: 003_perf_idx_risk_profiles
Create Date: 2026-03-16 00:00:00.000000
"""
from alembic import op

revision = '004_perf_idx_audit_logs'
down_revision = '003_perf_idx_risk_profiles'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Single-column index on action (used standalone in some audit queries)
    op.create_index(
        'ix_audit_logs_action',
        'audit_logs', ['action'],
        postgresql_using='btree',
    )

    # Compound covering index for _get_pending_downgrade and similar lookups.
    # (entity_type, entity_id, action) is the full WHERE predicate; including
    # timestamp lets Postgres resolve ORDER BY without an extra sort step.
    op.create_index(
        'ix_audit_logs_entity_action_ts',
        'audit_logs',
        ['entity_type', 'entity_id', 'action', 'timestamp'],
        postgresql_using='btree',
    )


def downgrade() -> None:
    op.drop_index('ix_audit_logs_entity_action_ts', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')

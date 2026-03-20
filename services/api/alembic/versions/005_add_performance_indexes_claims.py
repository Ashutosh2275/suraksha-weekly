"""Add performance indexes: claims table

Admin queue queries and payout reconciliation filter claims by status:
  SELECT ... WHERE status IN ('initiated', 'in_review', 'approved') ...
  SELECT ... WHERE status='pending' AND initiated_at < now()-10min ...

Without a status index these become full scans once the claims table grows
(10,000 workers × avg 2 claims/week = ~100k rows in month 1).

Revision ID: 005_perf_idx_claims
Revises: 004_perf_idx_audit_logs
Create Date: 2026-03-16 00:00:00.000000
"""
from alembic import op

revision = '005_perf_idx_claims'
down_revision = '004_perf_idx_audit_logs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # status is used in virtually every claim list / admin queue query
    op.create_index(
        'ix_claims_status',
        'claims', ['status'],
        postgresql_using='btree',
    )

    # Compound index for the payout reconciliation query pattern:
    # WHERE worker_id=? AND status='paid' ORDER BY created_at DESC
    # Also covers the weekly-cap aggregation in payout_service.py.
    op.create_index(
        'ix_claims_worker_status',
        'claims',
        ['worker_id', 'status'],
        postgresql_using='btree',
    )


def downgrade() -> None:
    op.drop_index('ix_claims_worker_status', table_name='claims')
    op.drop_index('ix_claims_status', table_name='claims')

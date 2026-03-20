"""Add performance indexes: payout_transactions table

reconcile_stale_payouts() queries:
  SELECT ... WHERE status IN ('pending','processing') AND initiated_at < ?

Without a status index + compound (status, initiated_at), this is a full scan of
payout_transactions every 5 minutes.  At 10,000 workers with concurrent claims
the table size multiplies quickly.

Revision ID: 006_perf_idx_payout_transactions
Revises: 005_perf_idx_claims
Create Date: 2026-03-16 00:00:00.000000
"""
from alembic import op

revision = '006_perf_idx_payout_transactions'
down_revision = '005_perf_idx_claims'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # status used in all reconciliation + retry queries
    op.create_index(
        'ix_payout_transactions_status',
        'payout_transactions', ['status'],
        postgresql_using='btree',
    )

    # Compound covering index for reconcile_stale_payouts:
    # WHERE status IN (...) AND initiated_at < now()-10min
    op.create_index(
        'ix_payout_transactions_status_initiated',
        'payout_transactions',
        ['status', 'initiated_at'],
        postgresql_using='btree',
    )


def downgrade() -> None:
    op.drop_index('ix_payout_transactions_status_initiated', table_name='payout_transactions')
    op.drop_index('ix_payout_transactions_status', table_name='payout_transactions')

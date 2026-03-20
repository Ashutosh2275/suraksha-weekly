"""Add performance indexes: risk_profiles table

pricing_service.py fetches the most-recent RiskProfile per worker via:
  SELECT ... WHERE worker_id=? ORDER BY computed_at DESC LIMIT 1

Without a compound index on (worker_id, computed_at), Postgres must scan ALL
risk-profile rows for a worker and sort them.  The compound index lets Postgres
jump straight to the latest row for a worker via index-only scan.

Revision ID: 003_perf_idx_risk_profiles
Revises: 002_perf_idx_policies
Create Date: 2026-03-16 00:00:00.000000
"""
from alembic import op

revision = '003_perf_idx_risk_profiles'
down_revision = '002_perf_idx_policies'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Individual index for ORDER BY in isolation
    op.create_index(
        'ix_risk_profiles_computed_at',
        'risk_profiles', ['computed_at'],
        postgresql_using='btree',
    )

    # Compound covering index: worker_id lookup + computed_at sort resolved
    # without touching the table heap.
    op.create_index(
        'ix_risk_profiles_worker_latest',
        'risk_profiles',
        ['worker_id', 'computed_at'],
        postgresql_using='btree',
    )


def downgrade() -> None:
    op.drop_index('ix_risk_profiles_worker_latest', table_name='risk_profiles')
    op.drop_index('ix_risk_profiles_computed_at', table_name='risk_profiles')

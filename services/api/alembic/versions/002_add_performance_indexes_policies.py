"""Add performance indexes: policies table

Adds composite + individual column indexes to support the hot eligibility query
in _find_eligible_policies (claim_orchestrator.py):

  SELECT policy, worker WHERE status='active' AND start_date<=now AND end_date>=now
  AND plan_variant IN (...) [+ JOIN worker.service_zones check]

Without these indexes, every TriggerEvent scans the full policies table.
At 10,000 workers the index reduces this from O(n) → O(log n).

Revision ID: 002_perf_idx_policies
Revises: 001_initial_schema
Create Date: 2026-03-16 00:00:00.000000
"""
from alembic import op

revision = '002_perf_idx_policies'
down_revision = '001_initial_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Individual column indexes (used in isolated WHERE / ORDER BY clauses)
    op.create_index(
        'ix_policies_status',
        'policies', ['status'],
        postgresql_using='btree',
    )
    op.create_index(
        'ix_policies_plan_variant',
        'policies', ['plan_variant'],
        postgresql_using='btree',
    )
    op.create_index(
        'ix_policies_start_date',
        'policies', ['start_date'],
        postgresql_using='btree',
    )
    op.create_index(
        'ix_policies_end_date',
        'policies', ['end_date'],
        postgresql_using='btree',
    )

    # Composite index — covering index for the full eligibility WHERE clause.
    # Postgres can satisfy the entire filter without touching the heap.
    # Column order: high-selectivity filters first (status, plan_variant < dates).
    op.create_index(
        'ix_policies_eligibility',
        'policies',
        ['status', 'plan_variant', 'start_date', 'end_date'],
        postgresql_using='btree',
    )


def downgrade() -> None:
    op.drop_index('ix_policies_eligibility', table_name='policies')
    op.drop_index('ix_policies_end_date', table_name='policies')
    op.drop_index('ix_policies_start_date', table_name='policies')
    op.drop_index('ix_policies_plan_variant', table_name='policies')
    op.drop_index('ix_policies_status', table_name='policies')

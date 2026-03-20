"""Initial migration: create all 8 ORM tables

Revision ID: 001_initial_schema
Revises:
Create Date: 2026-03-14 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create all tables."""
    # Create workers table
    op.create_table(
        'workers',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('city', sa.String(), nullable=False),
        sa.Column('service_zones', sa.ARRAY(sa.String()), nullable=False),
        sa.Column('platform_type', sa.String(), nullable=False),
        sa.Column('avg_daily_hours', sa.Float(), nullable=False),
        sa.Column('avg_weekly_earnings', sa.Float(), nullable=False),
        sa.Column('device_fingerprint', sa.String(), nullable=True),
        sa.Column('trust_score', sa.Float(), nullable=False),
        sa.Column('trust_tier', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('phone', name='uq_worker_phone'),
    )
    op.create_index('ix_workers_city', 'workers', ['city'])
    op.create_index('ix_workers_phone', 'workers', ['phone'])

    # Create policies table
    op.create_table(
        'policies',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('worker_id', sa.String(), nullable=False),
        sa.Column('plan_variant', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('weekly_premium', sa.Float(), nullable=False),
        sa.Column('coverage_cap', sa.Float(), nullable=False),
        sa.Column('start_date', sa.DateTime(), nullable=False),
        sa.Column('end_date', sa.DateTime(), nullable=False),
        sa.Column('renewal_count', sa.Integer(), nullable=False),
        sa.Column('waiting_period_until', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['worker_id'], ['workers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_policies_worker_id', 'policies', ['worker_id'])

    # Create risk_profiles table
    op.create_table(
        'risk_profiles',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('worker_id', sa.String(), nullable=False),
        sa.Column('location_risk_index', sa.Float(), nullable=False),
        sa.Column('disruption_frequency_score', sa.Float(), nullable=False),
        sa.Column('hour_exposure_score', sa.Float(), nullable=False),
        sa.Column('platform_segment_factor', sa.Float(), nullable=False),
        sa.Column('computed_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['worker_id'], ['workers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_risk_profiles_worker_id', 'risk_profiles', ['worker_id'])

    # Create trigger_events table
    op.create_table(
        'trigger_events',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('type', sa.String(), nullable=False),
        sa.Column('zone', sa.String(), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('threshold', sa.Float(), nullable=False),
        sa.Column('confidence_score', sa.Float(), nullable=False),
        sa.Column('sources', sa.ARRAY(sa.String()), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('triggered_at', sa.DateTime(), nullable=False),
        sa.Column('audit_snapshot', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_trigger_events_type', 'trigger_events', ['type'])
    op.create_index('ix_trigger_events_zone', 'trigger_events', ['zone'])

    # Create claims table
    op.create_table(
        'claims',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('worker_id', sa.String(), nullable=False),
        sa.Column('policy_id', sa.String(), nullable=False),
        sa.Column('trigger_event_id', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('fraud_score', sa.Float(), nullable=False),
        sa.Column('fraud_reason_tags', sa.ARRAY(sa.String()), nullable=False),
        sa.Column('payout_amount', sa.Float(), nullable=False),
        sa.Column('idempotency_key', sa.String(), nullable=False),
        sa.Column('initiated_at', sa.DateTime(), nullable=False),
        sa.Column('resolved_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['policy_id'], ['policies.id'], ),
        sa.ForeignKeyConstraint(['trigger_event_id'], ['trigger_events.id'], ),
        sa.ForeignKeyConstraint(['worker_id'], ['workers.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('idempotency_key', name='uq_claim_idempotency'),
        sa.UniqueConstraint('worker_id', 'policy_id', 'trigger_event_id',
                           name='uq_claim_worker_policy_trigger'),
    )
    op.create_index('ix_claims_worker_id', 'claims', ['worker_id'])
    op.create_index('ix_claims_policy_id', 'claims', ['policy_id'])
    op.create_index('ix_claims_trigger_event_id', 'claims', ['trigger_event_id'])

    # Create fraud_assessments table
    op.create_table(
        'fraud_assessments',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('claim_id', sa.String(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('decision', sa.String(), nullable=False),
        sa.Column('reason_codes', sa.ARRAY(sa.String()), nullable=False),
        sa.Column('reviewed_by', sa.String(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('claim_id', name='uq_fraud_assessment_claim'),
    )
    op.create_index('ix_fraud_assessments_claim_id', 'fraud_assessments', ['claim_id'])

    # Create payout_transactions table
    op.create_table(
        'payout_transactions',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('claim_id', sa.String(), nullable=False),
        sa.Column('worker_id', sa.String(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('gateway', sa.String(), nullable=False),
        sa.Column('gateway_ref', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('idempotency_key', sa.String(), nullable=False),
        sa.Column('initiated_at', sa.DateTime(), nullable=False),
        sa.Column('confirmed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['claim_id'], ['claims.id'], ),
        sa.ForeignKeyConstraint(['worker_id'], ['workers.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('claim_id', name='uq_payout_claim'),
        sa.UniqueConstraint('idempotency_key', name='uq_payout_idempotency'),
    )
    op.create_index('ix_payout_transactions_claim_id', 'payout_transactions', ['claim_id'])
    op.create_index('ix_payout_transactions_worker_id', 'payout_transactions', ['worker_id'])
    op.create_index('ix_payout_transactions_gateway_ref', 'payout_transactions', ['gateway_ref'])

    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('entity_type', sa.String(), nullable=False),
        sa.Column('entity_id', sa.String(), nullable=False),
        sa.Column('action', sa.String(), nullable=False),
        sa.Column('actor', sa.String(), nullable=False),
        sa.Column('actor_id', sa.String(), nullable=True),
        sa.Column('payload', sa.JSON(), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['workers.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_audit_logs_entity_type', 'audit_logs', ['entity_type'])
    op.create_index('ix_audit_logs_entity_id', 'audit_logs', ['entity_id'])
    op.create_index('ix_audit_logs_timestamp', 'audit_logs', ['timestamp'])


def downgrade() -> None:
    """Drop all tables."""
    op.drop_index('ix_audit_logs_timestamp', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_id', table_name='audit_logs')
    op.drop_index('ix_audit_logs_entity_type', table_name='audit_logs')
    op.drop_table('audit_logs')

    op.drop_index('ix_payout_transactions_gateway_ref', table_name='payout_transactions')
    op.drop_index('ix_payout_transactions_worker_id', table_name='payout_transactions')
    op.drop_index('ix_payout_transactions_claim_id', table_name='payout_transactions')
    op.drop_table('payout_transactions')

    op.drop_index('ix_fraud_assessments_claim_id', table_name='fraud_assessments')
    op.drop_table('fraud_assessments')

    op.drop_index('ix_claims_trigger_event_id', table_name='claims')
    op.drop_index('ix_claims_policy_id', table_name='claims')
    op.drop_index('ix_claims_worker_id', table_name='claims')
    op.drop_table('claims')

    op.drop_index('ix_trigger_events_zone', table_name='trigger_events')
    op.drop_index('ix_trigger_events_type', table_name='trigger_events')
    op.drop_table('trigger_events')

    op.drop_index('ix_risk_profiles_worker_id', table_name='risk_profiles')
    op.drop_table('risk_profiles')

    op.drop_index('ix_policies_worker_id', table_name='policies')
    op.drop_table('policies')

    op.drop_index('ix_workers_phone', table_name='workers')
    op.drop_index('ix_workers_city', table_name='workers')
    op.drop_table('workers')

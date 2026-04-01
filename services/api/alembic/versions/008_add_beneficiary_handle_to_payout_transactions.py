"""Add beneficiary handle to payout transactions.

Revision ID: 008_add_beneficiary_handle_to_payout_transactions
Revises: 007_fraud_clusters_idx
Create Date: 2026-04-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '008_add_beneficiary_handle_to_payout_transactions'
down_revision = '007_fraud_clusters_idx'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'payout_transactions',
        sa.Column('beneficiary_handle', sa.String(), nullable=True),
    )
    op.create_index(
        'ix_payout_transactions_beneficiary_handle',
        'payout_transactions',
        ['beneficiary_handle'],
        postgresql_using='btree',
    )
    op.create_unique_constraint(
        'uq_payout_claim_beneficiary',
        'payout_transactions',
        ['claim_id', 'beneficiary_handle'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_payout_claim_beneficiary', 'payout_transactions', type_='unique')
    op.drop_index('ix_payout_transactions_beneficiary_handle', table_name='payout_transactions')
    op.drop_column('payout_transactions', 'beneficiary_handle')
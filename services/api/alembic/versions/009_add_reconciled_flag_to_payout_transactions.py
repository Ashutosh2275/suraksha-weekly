"""Add reconciled flag to payout transactions.

Revision ID: 009_add_reconciled_flag_to_payout_transactions
Revises: 008_add_beneficiary_handle_to_payout_transactions
Create Date: 2026-04-02 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = '009_add_reconciled_flag_to_payout_transactions'
down_revision = '008_add_beneficiary_handle_to_payout_transactions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'payout_transactions',
        sa.Column('reconciled', sa.Boolean(), nullable=False, server_default=sa.text('false')),
    )
    op.create_index(
        'ix_payout_transactions_reconciled',
        'payout_transactions',
        ['reconciled'],
        postgresql_using='btree',
    )
    op.alter_column('payout_transactions', 'reconciled', server_default=None)


def downgrade() -> None:
    op.drop_index('ix_payout_transactions_reconciled', table_name='payout_transactions')
    op.drop_column('payout_transactions', 'reconciled')
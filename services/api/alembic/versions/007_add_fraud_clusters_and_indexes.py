"""Create fraud_clusters table and add performance indexes

fraud_clusters was introduced in Phase 8 (advanced fraud graph detection) but
was not included in the initial schema migration.  This migration creates the
table and adds the indexes required by:

  admin.py:   SELECT ... WHERE auto_resolved=? ORDER BY detected_at DESC
  fraud_graph_service.py: lookup by cluster_type / link_node

Revision ID: 007_fraud_clusters_idx
Revises: 006_perf_idx_payout_transactions
Create Date: 2026-03-16 00:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = '007_fraud_clusters_idx'
down_revision = '006_perf_idx_payout_transactions'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'fraud_clusters',
        sa.Column('id',                 sa.String(),           nullable=False),
        sa.Column('cluster_type',       sa.String(),           nullable=False),
        sa.Column('link_node',          sa.String(),           nullable=False),
        sa.Column('member_worker_ids',  sa.ARRAY(sa.String()), nullable=False),
        sa.Column('member_count',       sa.Integer(),          nullable=False),
        sa.Column('risk_level',         sa.String(),           nullable=False),
        sa.Column('flagged_for_kyc',    sa.Boolean(),          nullable=False),
        sa.Column('auto_resolved',      sa.Boolean(),          nullable=False),
        sa.Column('notes',              sa.Text(),             nullable=True),
        sa.Column('detected_at',        sa.DateTime(),         nullable=False),
        sa.Column('created_at',         sa.DateTime(),         nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )

    # Columns with index=True in the ORM model (from Phase 8)
    op.create_index('ix_fraud_clusters_cluster_type', 'fraud_clusters', ['cluster_type'])
    op.create_index('ix_fraud_clusters_link_node',    'fraud_clusters', ['link_node'])
    op.create_index('ix_fraud_clusters_detected_at',  'fraud_clusters', ['detected_at'])

    # auto_resolved: used in the admin list-clusters WHERE clause
    op.create_index('ix_fraud_clusters_auto_resolved', 'fraud_clusters', ['auto_resolved'])

    # Unique constraint on (cluster_type, link_node) prevents duplicate clusters
    # from being persisted by repeated fraud_graph_service runs (idempotency).
    op.create_unique_constraint(
        'uq_fraud_cluster_type_node',
        'fraud_clusters',
        ['cluster_type', 'link_node'],
    )


def downgrade() -> None:
    op.drop_constraint('uq_fraud_cluster_type_node', 'fraud_clusters', type_='unique')
    op.drop_index('ix_fraud_clusters_auto_resolved', table_name='fraud_clusters')
    op.drop_index('ix_fraud_clusters_detected_at',  table_name='fraud_clusters')
    op.drop_index('ix_fraud_clusters_link_node',    table_name='fraud_clusters')
    op.drop_index('ix_fraud_clusters_cluster_type', table_name='fraud_clusters')
    op.drop_table('fraud_clusters')

"""
SQLAlchemy ORM models for Suraksha Weekly.
"""

# ============================================================================
# SCHEMA CHANGE RULE (PRD Section 40.5) — READ BEFORE MODIFYING ANY MODEL
# ============================================================================
# Never remove a column that is still referenced by a live API version.
#
# Follow the expand-contract pattern:
#   1. ADD   — Add the new column (nullable or with a default). Deploy.
#   2. WRITE — Update application code to write to both old and new columns.
#   3. READ  — Migrate reads to the new column. Backfill old rows if needed.
#   4. REMOVE— Drop the old column ONLY after the API version that references
#              it has been sunset (minimum 60-day notice per PRD §40.6).
#
# Alembic migrations that call op.drop_column() MUST include:
#   • A PR link in the migration docstring, e.g.:
#       """Drop legacy_field — PR: https://github.com/.../pull/42"""
#   • A confirmation that the column is NOT referenced by any live router:
#       """Sunset confirmation: /api/v1 sunset date 2026-12-01 has passed."""
#
# The CI pipeline (Stage 4, .github/workflows/ci.yml) automatically blocks
# any migration that drops a column still found in an active router file.
# ============================================================================

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
    JSON,
    Text,
    ARRAY,
    UniqueConstraint,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, synonym
import uuid

Base = declarative_base()


class Worker(Base):
    """
    Gig delivery partner profile.
    """

    __tablename__ = "workers"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    phone = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    city = Column(String, nullable=False, index=True)
    service_zones = Column(ARRAY(String), nullable=False, default=[])
    platform_type = Column(String, nullable=False)  # Zomato, Swiggy
    avg_daily_hours = Column(Float, nullable=False, default=8.0)
    avg_weekly_earnings = Column(Float, nullable=False, default=5000.0)
    device_fingerprint = Column(String, nullable=True)
    trust_score = Column(Float, nullable=False, default=100.0)
    trust_tier = Column(String, nullable=False, default="standard")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    policies = relationship("Policy", back_populates="worker", cascade="all, delete-orphan")
    risk_profiles = relationship("RiskProfile", back_populates="worker", cascade="all, delete-orphan")
    claims = relationship("Claim", back_populates="worker", cascade="all, delete-orphan")
    payouts = relationship("PayoutTransaction", back_populates="worker", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", foreign_keys="AuditLog.actor_id", back_populates="actor_rel")


class Policy(Base):
    """
    Weekly insurance policy for a worker.
    """

    __tablename__ = "policies"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String, ForeignKey("workers.id"), nullable=False, index=True)
    plan_variant = Column(String, nullable=False)  # e.g., "basic", "premium"
    status = Column(String, nullable=False, default="active")  # active, expired, cancelled
    weekly_premium = Column(Float, nullable=False)
    coverage_cap = Column(Float, nullable=False)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)
    renewal_count = Column(Integer, nullable=False, default=0)
    waiting_period_until = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    worker = relationship("Worker", back_populates="policies")
    claims = relationship("Claim", back_populates="policy", cascade="all, delete-orphan")


class RiskProfile(Base):
    """
    Computed risk assessment for a worker.
    """

    __tablename__ = "risk_profiles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String, ForeignKey("workers.id"), nullable=False, index=True)
    location_risk_index = Column(Float, nullable=False, default=0.5)
    disruption_frequency_score = Column(Float, nullable=False, default=0.5)
    hour_exposure_score = Column(Float, nullable=False, default=0.5)
    platform_segment_factor = Column(Float, nullable=False, default=1.0)
    computed_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    worker = relationship("Worker", back_populates="risk_profiles")


class TriggerEvent(Base):
    """
    Parametric disruption trigger (weather, pollution, curfew, etc.).
    """

    __tablename__ = "trigger_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    type = Column(String, nullable=False, index=True)  # HeavyRain, ExtremeHeat, SeverePollution, LocalRestriction, PlatformOutage
    zone = Column(String, nullable=False, index=True)
    value = Column(Float, nullable=False)
    threshold = Column(Float, nullable=False)
    confidence_score = Column(Float, nullable=False)
    sources = Column(ARRAY(String), nullable=False, default=[])
    status = Column(String, nullable=False, default="confirmed")  # confirmed, pending, rejected
    triggered_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    audit_snapshot = Column(JSON, nullable=False, default={})
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    claims = relationship("Claim", back_populates="trigger_event")


class Claim(Base):
    """
    Insurance claim initiated by trigger event.
    """

    __tablename__ = "claims"
    __table_args__ = (
        UniqueConstraint('worker_id', 'policy_id', 'trigger_event_id', name='uq_claim_worker_policy_trigger'),
    )

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    worker_id = Column(String, ForeignKey("workers.id"), nullable=False, index=True)
    policy_id = Column(String, ForeignKey("policies.id"), nullable=False, index=True)
    trigger_event_id = Column(String, ForeignKey("trigger_events.id"), nullable=False, index=True)
    status = Column(String, nullable=False, default="initiated")  # initiated, in_review, approved, rejected, blocked, paid
    fraud_score = Column(Float, nullable=False, default=0.0)
    fraud_reason_tags = Column(ARRAY(String), nullable=False, default=[])
    payout_amount = Column(Float, nullable=False, default=0.0)
    idempotency_key = Column(String, nullable=False, unique=True, index=True)
    initiated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    worker = relationship("Worker", back_populates="claims")
    policy = relationship("Policy", back_populates="claims")
    trigger_event = relationship("TriggerEvent", back_populates="claims")
    fraud_assessment = relationship("FraudAssessment", back_populates="claim", uselist=False, cascade="all, delete-orphan")
    payout = relationship("PayoutTransaction", back_populates="claim", uselist=False, cascade="all, delete-orphan")


class FraudAssessment(Base):
    """
    Fraud assessment result for a claim.
    """

    __tablename__ = "fraud_assessments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    claim_id = Column(String, ForeignKey("claims.id"), nullable=False, unique=True, index=True)
    score = Column(Float, nullable=False)
    decision = Column(String, nullable=False)  # auto_approve, hold, manual_review, auto_block
    reason_codes = Column(ARRAY(String), nullable=False, default=[])
    reviewed_by = Column(String, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    claim = relationship("Claim", back_populates="fraud_assessment")


class PayoutTransaction(Base):
    """
    Payout transaction record.
    """

    __tablename__ = "payout_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    claim_id = Column(String, ForeignKey("claims.id"), nullable=False, unique=True, index=True)
    worker_id = Column(String, ForeignKey("workers.id"), nullable=False, index=True)
    beneficiary_handle = Column(String, nullable=True, index=True)
    amount = Column(Float, nullable=False)
    gateway = Column(String, nullable=False)  # razorpay, stripe
    gateway_ref = Column(String, nullable=True, index=True)
    status = Column(String, nullable=False, default="pending")  # pending, processing, completed, failed
    idempotency_key = Column(String, nullable=False, unique=True, index=True)
    reconciled = Column(Boolean, nullable=False, default=False, index=True)
    initiated_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    confirmed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    claim = relationship("Claim", back_populates="payout")
    worker = relationship("Worker", back_populates="payouts")

    __table_args__ = (
        UniqueConstraint('claim_id', 'beneficiary_handle', name='uq_payout_claim_beneficiary'),
    )


class AuditLog(Base):
    """
    Immutable audit log for all state changes.
    """

    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    entity_type = Column(String, nullable=False, index=True)  # Claim, Policy, Worker, etc.
    entity_id = Column(String, nullable=False, index=True)
    action = Column(String, nullable=False)  # created, updated, approved, rejected, paid
    actor_role = Column(String, nullable=True)
    actor = synonym("actor_role")
    actor_id = Column(String, ForeignKey("workers.id"), nullable=True)
    previous_state = Column(JSON, nullable=True)
    new_state = Column(JSON, nullable=True)
    metadata_ = Column("metadata", JSON, nullable=False, default={})
    payload = synonym("metadata_")
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    timestamp = synonym("created_at")

    # Relationships
    actor_rel = relationship("Worker", foreign_keys=[actor_id], back_populates="audit_logs")


class FraudCluster(Base):
    """
    Graph-detected fraud cluster: a group of workers sharing a suspicious
    node (device fingerprint, payout account, or IP prefix).

    Created by fraud_graph_service.py when ≥3 workers share the same node.
    Persisted for KYC escalation and manual review tracking.
    """

    __tablename__ = "fraud_clusters"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    cluster_type = Column(String, nullable=False, index=True)
    # "device_share" | "payout_account_share" | "ip_share"
    link_node = Column(String, nullable=False, index=True)
    # The shared value (hashed device FP / partial account / IP prefix)
    member_worker_ids = Column(ARRAY(String), nullable=False, default=[])
    member_count = Column(Integer, nullable=False, default=0)
    risk_level = Column(String, nullable=False, default="high")  # "high" | "critical"
    flagged_for_kyc = Column(Boolean, nullable=False, default=True)
    auto_resolved = Column(Boolean, nullable=False, default=False)
    notes = Column(Text, nullable=True)
    detected_at = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

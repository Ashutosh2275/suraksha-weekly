"""Pydantic schemas for API request/response models."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, Field


# ============================================================================
# Worker Schemas
# ============================================================================

class WorkerBase(BaseModel):
    """Base worker schema."""

    name: str = Field(..., min_length=1, max_length=255)
    city: str = Field(..., min_length=1, max_length=100)
    service_zones: list[str] = Field(default=[], min_items=0)
    platform_type: str = Field(..., pattern="^(Zomato|Swiggy)$")
    avg_daily_hours: float = Field(default=8.0, ge=0.0, le=24.0)
    avg_weekly_earnings: float = Field(default=5000.0, ge=0.0)


class WorkerCreate(WorkerBase):
    """Schema for creating a worker."""

    phone: str = Field(..., pattern=r"^\+91[6-9]\d{9}$")


class WorkerUpdate(BaseModel):
    """Schema for updating a worker."""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    city: Optional[str] = Field(None, min_length=1, max_length=100)
    service_zones: Optional[list[str]] = Field(None, min_items=0)
    avg_daily_hours: Optional[float] = Field(None, ge=0.0, le=24.0)
    avg_weekly_earnings: Optional[float] = Field(None, ge=0.0)


class WorkerRead(WorkerBase):
    """Schema for reading a worker."""

    id: str
    phone: str
    device_fingerprint: Optional[str] = None
    trust_score: float = Field(ge=0.0, le=100.0)
    trust_tier: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Policy Schemas
# ============================================================================

class PolicyBase(BaseModel):
    """Base policy schema."""

    plan_variant: str = Field(..., pattern="^(basic|standard|pro)$")
    weekly_premium: float = Field(..., ge=0.0)
    coverage_cap: float = Field(..., ge=0.0)


class PolicyCreate(PolicyBase):
    """Schema for creating a policy."""

    start_date: datetime
    end_date: datetime


class PolicyRead(PolicyBase):
    """Schema for reading a policy."""

    id: str
    worker_id: str
    status: str
    renewal_count: int
    waiting_period_until: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PolicyStatusUpdate(BaseModel):
    """Schema for updating policy status."""

    status: str = Field(..., pattern="^(active|expired|cancelled)$")


class PolicyPurchaseRequest(BaseModel):
    """Request body for purchasing a new weekly policy (worker JWT required)."""

    plan_variant: str = Field(..., pattern="^(basic|standard|pro)$")


class PolicyUpgradeRequest(BaseModel):
    """Request body for an immediate plan upgrade (0-day cooldown)."""

    target_plan: str = Field(..., pattern="^(standard|pro)$")


class PolicyDowngradeRequest(BaseModel):
    """Request body for scheduling a downgrade — takes effect at next renewal."""

    target_plan: str = Field(..., pattern="^(basic|standard)$")


class PolicyDetailRead(PolicyRead):
    """Extended policy view including plan metadata and pending downgrade."""

    pending_downgrade_to: Optional[str] = None
    plan_triggers: list[str] = []
    coverage_cap_max: float = 0.0
    priority_fraud_review: bool = False
    trust_premium_multiplier: float = 1.00
    payout_priority: str = "standard"


class TrustScoreRead(BaseModel):
    """Trust score breakdown for a worker."""

    worker_id: str
    trust_score: float
    trust_tier: str
    premium_multiplier: float
    payout_priority: str
    components: dict
    fraud_flags_count: int


# ============================================================================
# Risk Profile Schemas
# ============================================================================

class RiskProfileRead(BaseModel):
    """Schema for reading a risk profile."""

    id: str
    worker_id: str
    location_risk_index: float
    disruption_frequency_score: float
    hour_exposure_score: float
    platform_segment_factor: float
    computed_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Trigger Event Schemas
# ============================================================================

class TriggerEventRead(BaseModel):
    """Schema for reading a trigger event."""

    id: str
    type: str
    zone: str
    value: float
    threshold: float
    confidence_score: float
    sources: list[str]
    status: str
    triggered_at: datetime
    audit_snapshot: dict
    created_at: datetime

    class Config:
        from_attributes = True


class TriggerEventCreate(BaseModel):
    """Schema for creating a trigger event."""

    type: str = Field(..., pattern="^(HeavyRain|ExtremeHeat|SeverePollution|LocalRestriction|PlatformOutage)$")
    zone: str
    value: float = Field(..., ge=0.0)
    threshold: float = Field(..., ge=0.0)
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    sources: list[str]
    audit_snapshot: dict = Field(default={})


# ============================================================================
# Claim Schemas
# ============================================================================

class ClaimRead(BaseModel):
    """Schema for reading a claim."""

    id: str
    worker_id: str
    policy_id: str
    trigger_event_id: str
    status: str
    fraud_score: float
    fraud_reason_tags: list[str]
    payout_amount: float
    initiated_at: datetime
    resolved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ClaimStatusUpdate(BaseModel):
    """Schema for updating claim status."""

    status: str = Field(..., pattern="^(initiated|in_review|approved|rejected|blocked|paid)$")
    reason_codes: Optional[list[str]] = Field(default=None)


# ============================================================================
# Fraud Assessment Schemas
# ============================================================================

class FraudAssessmentRead(BaseModel):
    """Schema for reading a fraud assessment."""

    id: str
    claim_id: str
    score: float
    decision: str
    reason_codes: list[str]
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Payout Transaction Schemas
# ============================================================================

class PayoutTransactionRead(BaseModel):
    """Schema for reading a payout transaction."""

    id: str
    claim_id: str
    worker_id: str
    amount: float
    gateway: str
    gateway_ref: Optional[str] = None
    status: str
    initiated_at: datetime
    confirmed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Audit Log Schemas
# ============================================================================

class AuditLogRead(BaseModel):
    """Schema for reading an audit log."""

    id: str
    entity_type: str
    entity_id: str
    action: str
    actor: str
    actor_id: Optional[str] = None
    payload: dict
    timestamp: datetime

    class Config:
        from_attributes = True


# ============================================================================
# API Response Schemas
# ============================================================================

T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    """
    Standard v1 response envelope (PRD §40).

    Every endpoint that adopts the wrapper returns:
        {
            "version":    "v1",
            "data":       <payload or null>,
            "timestamp":  "<UTC ISO8601>",
            "request_id": "<UUID from X-Request-ID middleware>",
            "error":      <string or null>,
            "reason_codes": [<list> or null]
        }
    """

    version: str = "v1"
    data: Optional[T] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    error: Optional[str] = None
    reason_codes: Optional[list[str]] = None


class PaginationMeta(BaseModel):
    """Pagination metadata."""

    offset: int = Field(..., ge=0)
    limit: int = Field(..., ge=1, le=100)
    total: int = Field(..., ge=0)


class PaginatedResponse(BaseModel):
    """Paginated API response."""

    data: list
    meta: PaginationMeta
    status: int

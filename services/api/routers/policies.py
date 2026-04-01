"""Policy lifecycle router for Suraksha Weekly."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Any, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import AliasChoices, BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from core.audit import audit_logged
from core.auth_dependencies import CurrentUser, get_current_user
from core.config import settings
from core.database import get_db
from core.rate_limiter import rate_limit
from core.redis import get_redis
from core.roles import Role
from models import Policy, Worker
from schemas.base import PolicyDetailRead
from services.pricing import compute_weekly_premium
from services.trust_service import get_payout_priority, get_trust_premium_multiplier

logger = logging.getLogger(__name__)
router = APIRouter()


PLAN_RULES: dict[str, dict[str, Any]] = {
    "basic": {
        "coverage_cap_max": 500.0,
        "triggers": ["HeavyRain", "SeverePollution"],
        "priority_fraud_review": False,
    },
    "standard": {
        "coverage_cap_max": 1500.0,
        "triggers": ["HeavyRain", "SeverePollution", "ExtremeHeat", "LocalRestriction"],
        "priority_fraud_review": False,
    },
    "pro": {
        "coverage_cap_max": 3000.0,
        "triggers": ["HeavyRain", "SeverePollution", "ExtremeHeat", "LocalRestriction", "PlatformOutage"],
        "priority_fraud_review": True,
    },
}

_PLAN_RANK = {"basic": 1, "standard": 2, "pro": 3}
_WAITING_PERIOD_HOURS = 24


class PremiumDriver(BaseModel):
    factor: str
    impact: str
    description: str


class PolicyQuoteRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    worker_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("worker_id", "workerId"))
    plan_variant: str = Field(
        ..., validation_alias=AliasChoices("plan_variant", "plan"), pattern="^(basic|standard|pro)$"
    )


class PolicyPurchaseRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    worker_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("worker_id", "workerId"))
    quote_id: Optional[str] = Field(default=None, validation_alias=AliasChoices("quote_id", "quoteId"))
    plan_variant: str = Field(
        ..., validation_alias=AliasChoices("plan_variant", "plan"), pattern="^(basic|standard|pro)$"
    )


class PolicyQuoteResponse(BaseModel):
    quote_id: str
    worker_id: str
    plan_variant: str
    weekly_premium: float
    coverage_cap: float
    base_rate: float
    risk_multiplier: float
    exposure_multiplier: float
    trust_adjustment: float
    top_factors: list[PremiumDriver]
    trust_tier: str
    is_estimated: bool
    expires_at: datetime
    ttl_seconds: int
    is_cached: bool = False


class PolicyLifecycleResponse(PolicyDetailRead):
    quote_id: Optional[str] = None
    quote_expires_at: Optional[datetime] = None
    quote_cached: bool = False


def _quote_cache_key(worker_id: str, plan_variant: str) -> str:
    return f"policy:quote:{worker_id}:{plan_variant}"


def _quote_expiry() -> datetime:
    return datetime.utcnow() + timedelta(seconds=settings.POLICY_QUOTE_TTL_SECONDS)


def _require_worker(current_user: CurrentUser) -> str:
    if current_user.role != Role.WORKER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Worker access required.")
    return current_user.user_id


async def _load_worker(session: AsyncSession, worker_id: str) -> Worker:
    result = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = result.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker profile not found.")
    return worker


async def _load_policy(session: AsyncSession, policy_id: str, worker_id: str) -> Policy:
    result = await session.execute(
        select(Policy)
        .options(joinedload(Policy.worker))
        .where(Policy.id == policy_id)
    )
    policy = result.scalar_one_or_none()
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")
    if policy.worker_id != worker_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your policy.")
    return policy


def _plan_rules(plan_variant: str) -> dict[str, Any]:
    return PLAN_RULES[plan_variant]


def _build_policy_detail(
    policy: Policy,
    worker: Worker,
    *,
    quote_id: str | None = None,
    quote_expires_at: datetime | None = None,
    quote_cached: bool = False,
) -> PolicyLifecycleResponse:
    rules = _plan_rules(policy.plan_variant)
    trust_tier = worker.trust_tier or "bronze"
    return PolicyLifecycleResponse(
        id=policy.id,
        worker_id=policy.worker_id,
        plan_variant=policy.plan_variant,
        status=policy.status,
        weekly_premium=policy.weekly_premium,
        coverage_cap=policy.coverage_cap,
        renewal_count=policy.renewal_count,
        waiting_period_until=policy.waiting_period_until,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
        pending_downgrade_to=None,
        plan_triggers=sorted(rules["triggers"]),
        coverage_cap_max=rules["coverage_cap_max"],
        priority_fraud_review=rules["priority_fraud_review"],
        trust_premium_multiplier=get_trust_premium_multiplier(trust_tier),
        payout_priority=get_payout_priority(trust_tier),
        quote_id=quote_id,
        quote_expires_at=quote_expires_at,
        quote_cached=quote_cached,
    )


async def _read_cached_quote(
    redis: aioredis.Redis,
    worker_id: str,
    plan_variant: str,
) -> PolicyQuoteResponse | None:
    raw = await redis.get(_quote_cache_key(worker_id, plan_variant))
    if not raw:
        return None
    try:
        quote = PolicyQuoteResponse.model_validate_json(raw)
    except Exception:
        logger.warning("[policies] Failed to parse cached quote for %s/%s", worker_id, plan_variant)
        return None
    if quote.expires_at <= datetime.utcnow():
        return None
    return quote


async def _write_quote_cache(redis: aioredis.Redis, quote: PolicyQuoteResponse) -> None:
    await redis.setex(
        _quote_cache_key(quote.worker_id, quote.plan_variant),
        settings.POLICY_QUOTE_TTL_SECONDS,
        quote.model_dump_json(),
    )


async def _delete_quote_cache(redis: aioredis.Redis, worker_id: str, plan_variant: str) -> None:
    await redis.delete(_quote_cache_key(worker_id, plan_variant))


async def _build_fresh_quote(worker: Worker, session: AsyncSession, plan_variant: str) -> PolicyQuoteResponse:
    pricing_result = await compute_weekly_premium(worker.id, session)
    selected = pricing_result["plans"][plan_variant]
    return PolicyQuoteResponse(
        quote_id=str(uuid.uuid4()),
        worker_id=worker.id,
        plan_variant=plan_variant,
        weekly_premium=float(selected["weekly_premium"]),
        coverage_cap=float(selected["coverage_cap"]),
        base_rate=float(pricing_result["base_rate"]),
        risk_multiplier=float(pricing_result["risk_multiplier"]),
        exposure_multiplier=float(pricing_result["exposure_multiplier"]),
        trust_adjustment=float(pricing_result["trust_adjustment"]),
        top_factors=[PremiumDriver(**item) for item in pricing_result.get("top_factors", [])[:3]],
        trust_tier=worker.trust_tier or "bronze",
        is_estimated=bool(pricing_result.get("is_estimated", False)),
        expires_at=_quote_expiry(),
        ttl_seconds=settings.POLICY_QUOTE_TTL_SECONDS,
        is_cached=False,
    )


@audit_logged("Policy", "purchased")
async def _create_policy(policy: Policy, *, session: AsyncSession) -> Policy:
    session.add(policy)
    await session.flush()
    return policy


@audit_logged("Policy", "renewed")
async def _renew_policy(policy: Policy, *, session: AsyncSession) -> Policy:
    policy.renewal_count += 1
    policy.end_date = policy.end_date + timedelta(days=7)
    policy.updated_at = datetime.utcnow()
    await session.flush()
    return policy


@audit_logged("Policy", "cancelled")
async def _cancel_policy(policy: Policy, *, session: AsyncSession) -> Policy:
    policy.status = "cancelled"
    policy.end_date = datetime.utcnow()
    policy.updated_at = datetime.utcnow()
    await session.flush()
    return policy


@router.post(
    "/quote",
    response_model=PolicyQuoteResponse,
    summary="Get a worker policy quote",
    dependencies=[Depends(rate_limit(per_ip=30, per_identity=20, burst=5))],
)
async def quote_policy(
    body: PolicyQuoteRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> PolicyQuoteResponse:
    worker_id = _require_worker(current_user)
    if body.worker_id and body.worker_id != worker_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="workerId does not match the authenticated worker.")

    worker = await _load_worker(session, worker_id)
    cached = await _read_cached_quote(redis, worker_id, body.plan_variant)
    if cached is not None:
        return cached.model_copy(update={"is_cached": True})

    quote = await _build_fresh_quote(worker, session, body.plan_variant)
    await _write_quote_cache(redis, quote)
    return quote


@router.post(
    "/purchase",
    response_model=PolicyLifecycleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Purchase a weekly policy",
    dependencies=[Depends(rate_limit(per_ip=10, per_identity=5, burst=1))],
)
async def purchase_policy(
    body: PolicyPurchaseRequest,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> PolicyLifecycleResponse:
    worker_id = _require_worker(current_user)
    if body.worker_id and body.worker_id != worker_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="workerId does not match the authenticated worker.")

    worker = await _load_worker(session, worker_id)
    existing = await session.execute(
        select(Policy).where(Policy.worker_id == worker_id, Policy.status == "active")
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You already have an active policy.")

    used_cached_quote = False
    cached_quote = await _read_cached_quote(redis, worker_id, body.plan_variant)
    if cached_quote is not None and body.quote_id and body.quote_id != cached_quote.quote_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Quote ID does not match the cached quote.")

    if cached_quote is None:
        cached_quote = await _build_fresh_quote(worker, session, body.plan_variant)
    else:
        used_cached_quote = True

    rules = _plan_rules(body.plan_variant)
    now = datetime.utcnow()
    policy = Policy(
        id=str(uuid.uuid4()),
        worker_id=worker_id,
        plan_variant=body.plan_variant,
        status="active",
        weekly_premium=round(cached_quote.weekly_premium, 2),
        coverage_cap=min(cached_quote.coverage_cap, rules["coverage_cap_max"]),
        start_date=now,
        end_date=now + timedelta(days=7),
        renewal_count=0,
        waiting_period_until=now + timedelta(hours=_WAITING_PERIOD_HOURS),
    )

    await _create_policy(policy, session=session)
    await session.commit()
    await _delete_quote_cache(redis, worker_id, body.plan_variant)

    await redis.publish(
        settings.POLICY_EVENTS_CHANNEL,
        json.dumps(
            {
                "event": "policy_purchased",
                "policy_id": policy.id,
                "worker_id": worker_id,
                "plan_variant": body.plan_variant,
                "weekly_premium": policy.weekly_premium,
                "coverage_cap": policy.coverage_cap,
                "quote_id": cached_quote.quote_id,
            }
        ),
    )

    await session.refresh(policy)
    return _build_policy_detail(
        policy,
        worker,
        quote_id=cached_quote.quote_id,
        quote_expires_at=cached_quote.expires_at,
        quote_cached=used_cached_quote,
    )


@router.get(
    "/{policy_id}",
    response_model=PolicyLifecycleResponse,
    summary="Get a policy by ID",
    dependencies=[Depends(rate_limit(per_ip=60, per_identity=40, burst=10))],
)
async def get_policy(
    policy_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
) -> PolicyLifecycleResponse:
    worker_id = _require_worker(current_user)
    policy = await _load_policy(session, policy_id, worker_id)
    worker = await _load_worker(session, worker_id)
    return _build_policy_detail(policy, worker)


@router.post(
    "/{policy_id}/renew",
    response_model=PolicyLifecycleResponse,
    summary="Renew an active policy",
    dependencies=[Depends(rate_limit(per_ip=10, per_identity=5, burst=2))],
)
async def renew_policy(
    policy_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> PolicyLifecycleResponse:
    worker_id = _require_worker(current_user)
    policy = await _load_policy(session, policy_id, worker_id)
    if policy.status != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Policy is '{policy.status}' and cannot be renewed.")

    worker = await _load_worker(session, worker_id)
    await _renew_policy(policy, session=session)
    await session.commit()
    await redis.publish(
        settings.POLICY_EVENTS_CHANNEL,
        json.dumps({"event": "policy_renewed", "policy_id": policy.id, "worker_id": worker_id}),
    )
    await session.refresh(policy)
    return _build_policy_detail(policy, worker)


@router.post(
    "/{policy_id}/cancel",
    response_model=PolicyLifecycleResponse,
    summary="Cancel an active policy",
    dependencies=[Depends(rate_limit(per_ip=10, per_identity=5, burst=2))],
)
async def cancel_policy(
    policy_id: str,
    current_user: Annotated[CurrentUser, Depends(get_current_user)],
    session: AsyncSession = Depends(get_db),
    redis: aioredis.Redis = Depends(get_redis),
) -> PolicyLifecycleResponse:
    worker_id = _require_worker(current_user)
    policy = await _load_policy(session, policy_id, worker_id)
    if policy.status != "active":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Policy is '{policy.status}' and cannot be cancelled.")

    worker = await _load_worker(session, worker_id)
    await _cancel_policy(policy, session=session)
    await session.commit()
    await redis.publish(
        settings.POLICY_EVENTS_CHANNEL,
        json.dumps({"event": "policy_cancelled", "policy_id": policy.id, "worker_id": worker_id}),
    )
    await session.refresh(policy)
    return _build_policy_detail(policy, worker)
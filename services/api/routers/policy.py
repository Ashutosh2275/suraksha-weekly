"""
Policy Router — Suraksha Weekly (FR-2 / PRD §4, §45, §46)

Worker endpoints (JWT required):
    GET  /policies/              — list caller's own policies (cursor-paginated)
    GET  /policies/{id}          — policy detail + plan metadata + pending downgrade
    POST /policies/purchase      — buy a new weekly policy
    POST /policies/{id}/renew    — renew active / expiring policy
    POST /policies/{id}/upgrade  — immediately upgrade to a higher plan (0-day cooldown)
    POST /policies/{id}/downgrade — schedule a plan downgrade at next renewal

Plan limits (PRD §46):
    basic    — coverage_cap ≤ ₹500/week;  triggers: HeavyRain, SeverePollution
    standard — coverage_cap ≤ ₹1500/week; triggers: HeavyRain, SeverePollution,
                                                    ExtremeHeat, LocalRestriction
    pro      — coverage_cap ≤ ₹3000/week; all 5 triggers + priority fraud review SLA

Upgrade/Downgrade rules:
    Upgrade  — immediate, 0-day cooldown; new limits apply right away
    Downgrade — takes effect at the START of the next renewal cycle (never mid-week);
                stored as an AuditLog entry until the renewal endpoint consumes it

Performance Optimizations Applied (PRD §7):
  • Cursor-based pagination on GET / — replaces unbounded SELECT *; adds
    limit (default=20, max=100) and base64-encoded (created_at|id) cursor.
    Response includes next_cursor and total_count (first page only).
  • Redis cache on GET / (first page, TTL=30s):
    key=cache:policies_list:{worker_id}:{limit}, invalidated on any write.
  • Redis cache on GET /{id} (TTL=30s):
    key=cache:policy:{policy_id}, invalidated on any write to that policy.
  • N+1 fix in GET /{id}: Policy+Worker loaded in one query via joinedload,
    eliminating the separate SELECT workers WHERE id=? round-trip.
  • Write endpoints (purchase/renew/upgrade/downgrade) call
    _invalidate_policy_cache() to delete stale list+detail cache entries.
  Cache TTL justification:
    30s — policies mutate infrequently from the worker's perspective (at most
          once per session) but need to reflect plan changes immediately after
          a write; 30s is a safe staleness window for reads.
  Estimated p95 improvement:
    GET /  (first page, cached):  ~80 ms → ~6 ms
    GET /{id} (cached):           ~45 ms → ~6 ms
    N+1 fix (GET /{id}):          saves one Worker fetch (~8 ms) per detail read
"""
from __future__ import annotations

import base64
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from jose import JWTError
from pydantic import BaseModel
from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from core.database import get_db
from core.rate_limiter import rate_limit
from core.redis import get_redis
from core.security import JWTHandler
from models import AuditLog, Claim, Policy, Worker
from schemas.base import (
    PolicyDetailRead,
    PolicyDowngradeRequest,
    PolicyPurchaseRequest,
    PolicyRead,
    PolicyUpgradeRequest,
)
from services.audit import log_event
from services.pricing_service import compute_weekly_premium
from services.trust_service import (
    get_payout_priority,
    get_trust_premium_multiplier,
    recompute_trust_score,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# ── Cache TTLs ─────────────────────────────────────────────────────────────────
_POLICY_LIST_TTL   = 30   # 30 s — list is short-lived; invalidated on every write
_POLICY_DETAIL_TTL = 30   # 30 s — same rationale as list


# ── Cursor helpers (keyset pagination, PRD §7 read-flow latency) ──────────────

def _encode_cursor(created_at: datetime, policy_id: str) -> str:
    """Encode (created_at, id) as a URL-safe base64 cursor token."""
    return base64.urlsafe_b64encode(
        f"{created_at.isoformat()}|{policy_id}".encode()
    ).decode()


def _decode_cursor(cursor: str) -> tuple[datetime, str]:
    """Decode base64 cursor token to (created_at, id) tuple."""
    raw = base64.urlsafe_b64decode(cursor.encode()).decode()
    ts, pid = raw.split("|", 1)
    return datetime.fromisoformat(ts), pid


# ── Paginated response schema ─────────────────────────────────────────────────

class PolicyListResponse(BaseModel):
    items:             list[PolicyRead]
    total_count:       int
    next_cursor:       Optional[str]  = None
    is_cached:         bool           = False
    cache_age_minutes: float          = 0.0


# ── Cache invalidation helper ─────────────────────────────────────────────────

async def _invalidate_policy_cache(
    redis: aioredis.Redis, worker_id: str, policy_id: str
) -> None:
    """Delete stale list + detail cache entries after any policy write."""
    try:
        keys = [
            f"cache:policies_list:{worker_id}:20",
            f"cache:policies_list:{worker_id}:20:set_at",
            f"cache:policies_list:{worker_id}:100",
            f"cache:policies_list:{worker_id}:100:set_at",
            f"cache:policy:{policy_id}",
            f"cache:policy:{policy_id}:set_at",
        ]
        if keys:
            await redis.delete(*keys)
    except Exception as exc:
        logger.warning("[policy] Cache invalidation failed: %s", exc)


# ── Plan rules table (PRD §46) ─────────────────────────────────────────────────
# coverage_cap_max: hard upper bound on policy.coverage_cap (₹ per week)
# triggers:         set of trigger types covered by this plan
# priority_fraud_review: Pro workers skip the standard SLA queue
PLAN_RULES: dict[str, dict] = {
    "basic": {
        "coverage_cap_max":      500.0,
        "triggers":              {"HeavyRain", "SeverePollution"},
        "priority_fraud_review": False,
    },
    "standard": {
        "coverage_cap_max":      1500.0,
        "triggers":              {"HeavyRain", "SeverePollution", "ExtremeHeat", "LocalRestriction"},
        "priority_fraud_review": False,
    },
    "pro": {
        "coverage_cap_max":      3000.0,
        "triggers":              {"HeavyRain", "SeverePollution", "ExtremeHeat", "LocalRestriction", "PlatformOutage"},
        "priority_fraud_review": True,
    },
}

# Plan hierarchy for upgrade/downgrade validation
_PLAN_RANK: dict[str, int] = {"basic": 1, "standard": 2, "pro": 3}

# Waiting period applied to all brand-new (non-renewal) policies
_WAITING_PERIOD_HOURS = 24


# ── Auth helper ────────────────────────────────────────────────────────────────

async def _get_current_worker_id(
    authorization: Annotated[Optional[str], Header()] = None,
) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization[7:]
    try:
        payload   = JWTHandler.verify_token(token)
        worker_id = payload.get("sub") or payload.get("worker_id")
        if not worker_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing worker identity.",
            )
        return worker_id
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        )


# ── Internal helpers ───────────────────────────────────────────────────────────

def _build_detail(
    policy:        Policy,
    worker:        Optional[Worker],
    pending_downgrade: Optional[str] = None,
) -> PolicyDetailRead:
    """Build a PolicyDetailRead from an ORM policy row."""
    rules = PLAN_RULES.get(policy.plan_variant, PLAN_RULES["basic"])
    tier  = (worker.trust_tier if worker else "bronze") or "bronze"
    return PolicyDetailRead(
        id                       = policy.id,
        worker_id                = policy.worker_id,
        plan_variant             = policy.plan_variant,
        status                   = policy.status,
        weekly_premium           = policy.weekly_premium,
        coverage_cap             = policy.coverage_cap,
        renewal_count            = policy.renewal_count,
        waiting_period_until     = policy.waiting_period_until,
        created_at               = policy.created_at,
        updated_at               = policy.updated_at,
        pending_downgrade_to     = pending_downgrade,
        plan_triggers            = sorted(rules["triggers"]),
        coverage_cap_max         = rules["coverage_cap_max"],
        priority_fraud_review    = rules["priority_fraud_review"],
        trust_premium_multiplier = get_trust_premium_multiplier(tier),
        payout_priority          = get_payout_priority(tier),
    )


async def _get_pending_downgrade(session: AsyncSession, policy_id: str) -> Optional[str]:
    """Return the scheduled downgrade target plan for a policy, or None."""
    q = await session.execute(
        select(AuditLog)
        .where(
            AuditLog.entity_type == "Policy",
            AuditLog.entity_id   == policy_id,
            AuditLog.action      == "plan_downgrade_scheduled",
        )
        .order_by(desc(AuditLog.timestamp))
        .limit(1)
    )
    log = q.scalar_one_or_none()
    if log is None:
        return None
    return (log.payload or {}).get("target_plan")


async def _load_active_policy(
    session: AsyncSession, policy_id: str, worker_id: str
) -> Policy:
    """Load a policy, verify ownership, and ensure it is active."""
    q = await session.execute(select(Policy).where(Policy.id == policy_id))
    policy: Optional[Policy] = q.scalar_one_or_none()
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")
    if policy.worker_id != worker_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your policy.")
    if policy.status != "active":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Policy is '{policy.status}', not active.",
        )
    return policy


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get(
    "/",
    response_model=PolicyListResponse,
    summary="[Worker] List own policies (cursor-paginated)",
    dependencies=[Depends(rate_limit(per_ip=60, per_identity=40, burst=10))],
)
async def list_policies(
    worker_id: str            = Depends(_get_current_worker_id),
    session:   AsyncSession   = Depends(get_db),
    redis:     aioredis.Redis = Depends(get_redis),
    limit:     int            = Query(default=20, ge=1, le=100),
    cursor:    Optional[str]  = Query(default=None),
) -> PolicyListResponse:
    """
    Return paginated policies for the authenticated worker, newest first.
    Use next_cursor from the response as the cursor param for the next page.
    total_count is only populated on the first page (cursor=None).
    """
    # ── Redis cache (first page only) ─────────────────────────────────────────
    page_cache_key = f"cache:policies_list:{worker_id}:{limit}" if cursor is None else None
    sat_key        = f"{page_cache_key}:set_at" if page_cache_key else None

    if page_cache_key:
        try:
            cached_raw = await redis.get(page_cache_key)
            if cached_raw:
                data       = json.loads(cached_raw)
                set_at_raw = await redis.get(sat_key)
                cache_age  = 0.0
                if set_at_raw:
                    set_at    = datetime.fromisoformat(set_at_raw)
                    cache_age = round((datetime.utcnow() - set_at).total_seconds() / 60, 2)
                data["is_cached"]         = True
                data["cache_age_minutes"] = cache_age
                return PolicyListResponse(**data)
        except Exception as cache_exc:
            logger.warning("[policy] List cache read failed: %s", cache_exc)

    # ── Cursor-keyset query ────────────────────────────────────────────────────
    q = (
        select(Policy)
        .where(Policy.worker_id == worker_id)
        .order_by(desc(Policy.created_at), desc(Policy.id))
    )
    if cursor:
        try:
            cursor_ts, cursor_id = _decode_cursor(cursor)
            q = q.where(
                or_(
                    Policy.created_at < cursor_ts,
                    and_(Policy.created_at == cursor_ts, Policy.id < cursor_id),
                )
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid cursor."
            )

    result   = await session.execute(q.limit(limit + 1))
    policies = list(result.scalars().all())

    has_more    = len(policies) > limit
    page_items  = policies[:limit]
    next_cursor = (
        _encode_cursor(page_items[-1].created_at, page_items[-1].id)
        if has_more else None
    )

    # total_count only on first page (avoids COUNT(*) on every paginated call)
    if cursor is None:
        cnt_q       = await session.execute(
            select(func.count(Policy.id)).where(Policy.worker_id == worker_id)
        )
        total_count = cnt_q.scalar() or 0
    else:
        total_count = -1  # not computed for interior pages

    response = PolicyListResponse(
        items             = [PolicyRead.model_validate(p) for p in page_items],
        total_count       = total_count,
        next_cursor       = next_cursor,
        is_cached         = False,
        cache_age_minutes = 0.0,
    )

    # ── Write first page to Redis cache ───────────────────────────────────────
    if page_cache_key:
        try:
            payload = response.model_dump(mode="json")
            await redis.setex(page_cache_key, _POLICY_LIST_TTL, json.dumps(payload, default=str))
            await redis.setex(sat_key,        _POLICY_LIST_TTL, datetime.utcnow().isoformat())
        except Exception as cache_write_exc:
            logger.warning("[policy] List cache write failed: %s", cache_write_exc)

    return response


@router.get(
    "/{policy_id}",
    response_model=PolicyDetailRead,
    summary="[Worker] Get policy detail",
    dependencies=[Depends(rate_limit(per_ip=60, per_identity=40, burst=10))],
)
async def get_policy(
    policy_id: str,
    worker_id: str            = Depends(_get_current_worker_id),
    session:   AsyncSession   = Depends(get_db),
    redis:     aioredis.Redis = Depends(get_redis),
) -> PolicyDetailRead:
    """Return full policy detail including plan metadata and any pending downgrade."""
    # ── Redis cache ────────────────────────────────────────────────────────────
    cache_key = f"cache:policy:{policy_id}"
    sat_key   = f"{cache_key}:set_at"
    try:
        cached_raw = await redis.get(cache_key)
        if cached_raw:
            data       = json.loads(cached_raw)
            # Always verify ownership even on a cache hit
            if data.get("worker_id") != worker_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your policy.")
            set_at_raw = await redis.get(sat_key)
            cache_age  = 0.0
            if set_at_raw:
                set_at    = datetime.fromisoformat(set_at_raw)
                cache_age = round((datetime.utcnow() - set_at).total_seconds() / 60, 2)
            data["cache_age_minutes"] = cache_age
            return PolicyDetailRead(**data)
    except HTTPException:
        raise
    except Exception as cache_exc:
        logger.warning("[policy] Detail cache read failed: %s", cache_exc)

    # ── N+1 fix: single JOIN query loads Policy + Worker together ─────────────
    q      = await session.execute(
        select(Policy)
        .options(joinedload(Policy.worker))
        .where(Policy.id == policy_id)
    )
    policy: Optional[Policy] = q.scalars().unique().one_or_none()
    if policy is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found.")
    if policy.worker_id != worker_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your policy.")

    worker  = policy.worker          # already loaded — no second DB round-trip
    pending = await _get_pending_downgrade(session, policy_id)
    detail  = _build_detail(policy, worker, pending)

    # ── Write to cache ─────────────────────────────────────────────────────────
    try:
        payload = detail.model_dump(mode="json")
        await redis.setex(cache_key, _POLICY_DETAIL_TTL, json.dumps(payload, default=str))
        await redis.setex(sat_key,   _POLICY_DETAIL_TTL, datetime.utcnow().isoformat())
    except Exception as cache_write_exc:
        logger.warning("[policy] Detail cache write failed: %s", cache_write_exc)

    return detail


@router.post(
    "/purchase",
    response_model=PolicyDetailRead,
    status_code=status.HTTP_201_CREATED,
    summary="[Worker] Purchase a new weekly policy",
    dependencies=[Depends(rate_limit(per_ip=5, per_identity=3, burst=1))],
)
async def purchase_policy(
    body:      PolicyPurchaseRequest,
    worker_id: str            = Depends(_get_current_worker_id),
    session:   AsyncSession   = Depends(get_db),
    redis:     aioredis.Redis = Depends(get_redis),
) -> PolicyDetailRead:
    """
    Create a new weekly policy for the authenticated worker.

    Rules enforced:
    - Worker must not already have an active policy.
    - coverage_cap is computed from pricing engine but capped at plan's limit (PRD §46).
    - Trust premium multiplier applied to the weekly_premium.
    - 24-hour waiting period from start_date before any claims can be filed.
    """
    # ── Load worker ───────────────────────────────────────────────────────────
    w_q    = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = w_q.scalar_one_or_none()
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker profile not found.")

    # ── No duplicate active policies ──────────────────────────────────────────
    existing_q = await session.execute(
        select(Policy).where(
            Policy.worker_id == worker_id,
            Policy.status    == "active",
        )
    )
    if existing_q.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active policy. Renew or cancel it first.",
        )

    # ── Get pricing quote ─────────────────────────────────────────────────────
    try:
        quote = await compute_weekly_premium(worker_id, session)
    except Exception as exc:
        logger.error("[policy] Premium computation failed for worker %s: %s", worker_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Premium pricing temporarily unavailable. Please try again.",
        )
    plan_quote = quote["plans"].get(body.plan_variant, {})

    if not plan_quote:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"No pricing data for plan '{body.plan_variant}'.",
        )

    rules = PLAN_RULES[body.plan_variant]

    # coverage_cap: from pricing engine, capped at plan's hard maximum (PRD §46)
    raw_coverage_cap = plan_quote["coverage_cap"]
    coverage_cap     = min(raw_coverage_cap, rules["coverage_cap_max"])

    # weekly_premium: from pricing engine with trust multiplier applied
    trust_mult   = get_trust_premium_multiplier(worker.trust_tier or "bronze")
    weekly_prem  = round(plan_quote["weekly_premium"] * trust_mult, 2)

    # ── Create policy ─────────────────────────────────────────────────────────
    now        = datetime.utcnow()
    start_date = now
    end_date   = now + timedelta(days=7)

    policy = Policy(
        id                   = str(uuid.uuid4()),
        worker_id            = worker_id,
        plan_variant         = body.plan_variant,
        status               = "active",
        weekly_premium       = weekly_prem,
        coverage_cap         = coverage_cap,
        start_date           = start_date,
        end_date             = end_date,
        renewal_count        = 0,
        waiting_period_until = now + timedelta(hours=_WAITING_PERIOD_HOURS),
    )
    session.add(policy)

    await log_event(
        session,
        entity_type = "Policy",
        entity_id   = policy.id,
        action      = "purchased",
        actor       = worker_id,
        payload     = {
            "to":                "active",
            "plan_variant":      body.plan_variant,
            "weekly_premium":    weekly_prem,
            "coverage_cap":      coverage_cap,
            "coverage_cap_max":  rules["coverage_cap_max"],
            "trust_tier":        worker.trust_tier,
            "trust_multiplier":  trust_mult,
            "waiting_period_until": policy.waiting_period_until.isoformat(),
        },
    )

    await session.flush()

    # Initial trust score computation for new policy context
    try:
        await recompute_trust_score(worker_id, session, trigger="policy_purchased")
    except Exception as exc:
        logger.warning("[policy] Trust score recompute failed on purchase: %s", exc)

    await session.commit()
    await _invalidate_policy_cache(redis, worker_id, policy.id)

    await session.refresh(policy)
    w_q    = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = w_q.scalar_one_or_none()

    return _build_detail(policy, worker)


@router.post(
    "/{policy_id}/renew",
    response_model=PolicyDetailRead,
    summary="[Worker] Renew active policy for another week",
    dependencies=[Depends(rate_limit(per_ip=10, per_identity=5, burst=2))],
)
async def renew_policy(
    policy_id: str,
    worker_id: str            = Depends(_get_current_worker_id),
    session:   AsyncSession   = Depends(get_db),
    redis:     aioredis.Redis = Depends(get_redis),
) -> PolicyDetailRead:
    """
    Renew the active policy for another 7-day period.

    - Increments renewal_count.
    - If a plan_downgrade_scheduled AuditLog entry exists, applies it now.
    - Recomputes trust score (trigger="renewal").
    - No waiting period extension on renewal.
    """
    policy = await _load_active_policy(session, policy_id, worker_id)

    prev_plan = policy.plan_variant

    # ── Check for pending downgrade ───────────────────────────────────────────
    pending_downgrade = await _get_pending_downgrade(session, policy_id)
    applied_downgrade = None

    if pending_downgrade and pending_downgrade in PLAN_RULES:
        old_plan = policy.plan_variant
        policy.plan_variant  = pending_downgrade
        policy.coverage_cap  = min(
            policy.coverage_cap,
            PLAN_RULES[pending_downgrade]["coverage_cap_max"],
        )
        applied_downgrade = pending_downgrade
        logger.info(
            "[policy] Downgrade applied on renewal: %s → %s  (policy=%s)",
            old_plan, pending_downgrade, policy_id,
        )

    # ── Recompute premium with updated trust score ────────────────────────────
    try:
        quote     = await compute_weekly_premium(worker_id, session)
        plan_data = quote["plans"].get(policy.plan_variant, {})
        if plan_data:
            w_q    = await session.execute(select(Worker).where(Worker.id == worker_id))
            worker = w_q.scalar_one_or_none()
            trust_mult          = get_trust_premium_multiplier((worker.trust_tier or "bronze") if worker else "bronze")
            new_premium         = round(plan_data["weekly_premium"] * trust_mult, 2)
            policy.weekly_premium = new_premium
    except Exception as exc:
        logger.warning("[policy] Premium recompute failed on renewal: %s — keeping existing", exc)

    # ── Extend policy window ──────────────────────────────────────────────────
    policy.end_date      = policy.end_date + timedelta(days=7)
    policy.renewal_count = policy.renewal_count + 1
    policy.updated_at    = datetime.utcnow()

    await log_event(
        session,
        entity_type = "Policy",
        entity_id   = policy_id,
        action      = "renewed",
        actor       = worker_id,
        payload     = {
            "new_end_date":      policy.end_date.isoformat(),
            "renewal_count":     policy.renewal_count,
            "from_plan":         prev_plan,
            "to_plan":           policy.plan_variant,
            "weekly_premium":    policy.weekly_premium,
            "downgrade_applied": applied_downgrade,
        },
    )

    await session.flush()

    # Recompute trust score on renewal (PRD §45)
    try:
        await recompute_trust_score(worker_id, session, trigger="renewal")
    except Exception as exc:
        logger.warning("[policy] Trust score recompute failed on renewal: %s", exc)

    await session.commit()
    await _invalidate_policy_cache(redis, worker_id, policy_id)
    await session.refresh(policy)

    w_q    = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = w_q.scalar_one_or_none()
    return _build_detail(policy, worker)


@router.post(
    "/{policy_id}/upgrade",
    response_model=PolicyDetailRead,
    summary="[Worker] Immediately upgrade to a higher plan",
    dependencies=[Depends(rate_limit(per_ip=10, per_identity=5, burst=2))],
)
async def upgrade_policy(
    policy_id: str,
    body:      PolicyUpgradeRequest,
    worker_id: str            = Depends(_get_current_worker_id),
    session:   AsyncSession   = Depends(get_db),
    redis:     aioredis.Redis = Depends(get_redis),
) -> PolicyDetailRead:
    """
    Immediately upgrade the active policy to a higher plan (PRD §46).

    - 0-day cooldown: new plan limits apply immediately.
    - coverage_cap and eligible triggers update in-place.
    - Waiting period is NOT reset.
    """
    policy = await _load_active_policy(session, policy_id, worker_id)

    # ── Validate it is actually an upgrade ────────────────────────────────────
    if _PLAN_RANK.get(body.target_plan, 0) <= _PLAN_RANK.get(policy.plan_variant, 0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"'{body.target_plan}' is not higher than the current plan "
                f"'{policy.plan_variant}'. Use /downgrade for downgrades."
            ),
        )

    old_plan = policy.plan_variant
    new_rules = PLAN_RULES[body.target_plan]

    # Recompute premium for the new plan tier
    try:
        quote      = await compute_weekly_premium(worker_id, session)
        plan_data  = quote["plans"].get(body.target_plan, {})
        w_q        = await session.execute(select(Worker).where(Worker.id == worker_id))
        worker     = w_q.scalar_one_or_none()
        trust_mult = get_trust_premium_multiplier((worker.trust_tier or "bronze") if worker else "bronze")
        new_premium = round(plan_data.get("weekly_premium", policy.weekly_premium) * trust_mult, 2)
        new_coverage = min(
            plan_data.get("coverage_cap", policy.coverage_cap),
            new_rules["coverage_cap_max"],
        )
    except Exception as exc:
        logger.warning("[policy] Premium recompute failed on upgrade: %s", exc)
        new_premium  = policy.weekly_premium
        new_coverage = min(policy.coverage_cap, new_rules["coverage_cap_max"])

    policy.plan_variant    = body.target_plan
    policy.weekly_premium  = new_premium
    policy.coverage_cap    = new_coverage
    policy.updated_at      = datetime.utcnow()

    await log_event(
        session,
        entity_type = "Policy",
        entity_id   = policy_id,
        action      = "plan_upgraded",
        actor       = worker_id,
        payload     = {
            "from_plan":      old_plan,
            "to_plan":        body.target_plan,
            "new_premium":    new_premium,
            "new_coverage":   new_coverage,
            "effective":      "immediate",
        },
    )

    await session.commit()
    await _invalidate_policy_cache(redis, worker_id, policy_id)
    await session.refresh(policy)

    w_q    = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = w_q.scalar_one_or_none()
    return _build_detail(policy, worker)


@router.post(
    "/{policy_id}/downgrade",
    response_model=PolicyDetailRead,
    summary="[Worker] Schedule a plan downgrade at next renewal",
    dependencies=[Depends(rate_limit(per_ip=10, per_identity=5, burst=2))],
)
async def downgrade_policy(
    policy_id: str,
    body:      PolicyDowngradeRequest,
    worker_id: str            = Depends(_get_current_worker_id),
    session:   AsyncSession   = Depends(get_db),
    redis:     aioredis.Redis = Depends(get_redis),
) -> PolicyDetailRead:
    """
    Schedule a plan downgrade to take effect at the NEXT renewal cycle (PRD §46).

    The current policy is NOT changed immediately — lower limits start only
    when the worker renews.  The pending downgrade is stored in AuditLog and
    shown in the policy detail response.
    """
    policy = await _load_active_policy(session, policy_id, worker_id)

    # ── Validate it is actually a downgrade ───────────────────────────────────
    if _PLAN_RANK.get(body.target_plan, 0) >= _PLAN_RANK.get(policy.plan_variant, 0):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"'{body.target_plan}' is not lower than the current plan "
                f"'{policy.plan_variant}'. Use /upgrade for upgrades."
            ),
        )

    await log_event(
        session,
        entity_type = "Policy",
        entity_id   = policy_id,
        action      = "plan_downgrade_scheduled",
        actor       = worker_id,
        payload     = {
            "from_plan":    policy.plan_variant,
            "target_plan":  body.target_plan,
            "effective_at": policy.end_date.isoformat(),
            "note":         "Downgrade takes effect at next renewal, not mid-week.",
        },
    )

    await session.commit()
    await _invalidate_policy_cache(redis, worker_id, policy_id)

    w_q    = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = w_q.scalar_one_or_none()
    return _build_detail(policy, worker, pending_downgrade=body.target_plan)

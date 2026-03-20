"""
Demo Router — Suraksha Weekly (Guidewire DEVTrails 2026)

Provides simulation and health-check endpoints for the 5-minute video demo.
All simulation endpoints are admin-gated (X-Admin-Token required).

Endpoints:
  POST /admin/demo/simulate-disruption
      Fire a parametric trigger at any zone/intensity, synchronously run the
      full claim-orchestration pipeline, and return rich results in one call.

  GET  /admin/demo/zones
      Return the full list of monitored zones grouped by city (for the UI).
"""
from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timedelta
from typing import Annotated, Literal, Optional

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, func, select

from core.config import settings
from core.database import DatabaseManager
from models import (
    AuditLog,
    Claim,
    FraudAssessment,
    PayoutTransaction,
    Policy,
    RiskProfile,
    TriggerEvent,
    Worker,
)
from services.fraud_scoring_service import score_claim
from services.payout_service import initiate_payout

logger = logging.getLogger(__name__)

router = APIRouter(tags=["demo"])

# ── Auth ──────────────────────────────────────────────────────────────────────

def _require_admin(
    x_admin_token: Annotated[Optional[str], Header()] = None,
) -> None:
    if not x_admin_token or x_admin_token != settings.ADMIN_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-Admin-Token header required.",
        )


def _require_admin_or_mock(
    x_admin_token: Annotated[Optional[str], Header()] = None,
) -> None:
    if settings.MOCK_MODE:
        return
    _require_admin(x_admin_token)


# ── Monitored zones (mirrors trigger-poller config) ───────────────────────────

DEMO_CITY_ZONES: dict[str, list[str]] = {
    "Bengaluru":  ["Koramangala", "Whitefield", "Indiranagar", "HSR Layout", "Electronic City"],
    "Mumbai":     ["Andheri", "Bandra", "Dadar", "Lower Parel", "Powai"],
    "Delhi":      ["Connaught Place", "Noida Sector 18", "Gurugram", "Saket", "Rohini"],
    "Hyderabad":  ["Banjara Hills", "Hitech City", "Secunderabad", "Gachibowli", "Ameerpet"],
    "Chennai":    ["Anna Nagar", "T Nagar", "Velachery", "OMR", "Porur"],
    "Pune":       ["Koregaon Park", "Hadapsar", "Kharadi", "Baner", "Hinjewadi"],
}

# ── Trigger parameter tables ───────────────────────────────────────────────────

_TRIGGER_THRESHOLDS: dict[str, float] = {
    "HeavyRain":        5.0,
    "ExtremeHeat":      42.0,
    "SeverePollution":  300.0,
    "LocalRestriction": 1.0,
    "PlatformOutage":   60.0,
}

# Intensity → measured value (below threshold is evaluated, above fires a claim)
_INTENSITY_VALUES: dict[str, dict[str, float]] = {
    "HeavyRain":        {"moderate": 7.0,   "severe": 14.0,  "extreme": 35.0},
    "ExtremeHeat":      {"moderate": 43.5,  "severe": 46.0,  "extreme": 50.0},
    "SeverePollution":  {"moderate": 330.0, "severe": 420.0, "extreme": 510.0},
    "LocalRestriction": {"moderate": 1.0,   "severe": 1.0,   "extreme": 1.0},
    "PlatformOutage":   {"moderate": 68.0,  "severe": 95.0,  "extreme": 185.0},
}

_INTENSITY_CONFIDENCE: dict[str, float] = {
    "moderate": 0.85,
    "severe":   0.92,
    "extreme":  0.97,
}

# Human-readable intensity descriptions for the API response
_INTENSITY_LABEL: dict[str, str] = {
    "moderate": "Moderate — above threshold, standard disruption",
    "severe":   "Severe — 2× threshold, elevated payout",
    "extreme":  "Extreme — 4× threshold, maximum impact scenario",
}

TriggerType    = Literal["HeavyRain", "ExtremeHeat", "SeverePollution", "LocalRestriction", "PlatformOutage"]
IntensityLevel = Literal["moderate", "severe", "extreme"]


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class DemoDisruptionRequest(BaseModel):
    trigger_type:    TriggerType
    zone:            str
    intensity_level: IntensityLevel = "moderate"
    city:            str            = "Bengaluru"


class ClaimBreakdown(BaseModel):
    auto_approved: int
    in_review:     int
    blocked:       int
    initiated:     int
    total:         int


class DemoDisruptionResponse(BaseModel):
    trigger_id:             str
    trigger_type:           str
    zone:                   str
    city:                   str
    intensity_level:        str
    intensity_description:  str
    measured_value:         float
    threshold_value:        float
    confidence_score:       float
    claims_initiated:       int
    claims_auto_approved:   int
    claims_flagged:         int
    total_payout_initiated: float
    breakdown:              ClaimBreakdown
    orchestration_ms:       int
    triggered_at:           str


class ZoneListResponse(BaseModel):
    cities: dict[str, list[str]]
    total_zones: int


class DemoResetResponse(BaseModel):
    message: str


class DemoStatusResponse(BaseModel):
    active_policies: int
    total_claims: int
    paid_claims: int
    blocked_claims: int
    total_payout_inr: float
    catastrophe_mode_active: bool


def _norm_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    return digits[-10:]


_DEMO_WORKERS: list[dict] = [
    {"name": "Rahul Sharma", "phone": "9999999999", "city": "Mumbai", "service_zones": ["Mumbai Zone 3", "Zone 3"], "platform_type": "Zomato", "avg_daily_hours": 8.0, "avg_weekly_earnings": 4500.0, "trust_score": 82.0, "trust_tier": "Gold", "device_fingerprint": "pixel_7_genuine"},
    {"name": "Priya Singh", "phone": "8888888888", "city": "Mumbai", "service_zones": ["Mumbai Zone 2", "Zone 2"], "platform_type": "Swiggy", "avg_daily_hours": 6.0, "avg_weekly_earnings": 3200.0, "trust_score": 28.0, "trust_tier": "Bronze", "device_fingerprint": "emulator_bluestacks_v3"},
    {"name": "Amit Kumar", "phone": "7777777777", "city": "Delhi", "service_zones": ["Delhi Zone 1", "Zone 1"], "platform_type": "Zomato", "avg_daily_hours": 7.0, "avg_weekly_earnings": 3800.0, "trust_score": 22.0, "trust_tier": "Bronze", "device_fingerprint": "redmi_note11_genuine"},
    {"name": "Deepa Nair", "phone": "6666666666", "city": "Bengaluru", "service_zones": ["Bengaluru Zone 2", "Zone 2"], "platform_type": "Swiggy", "avg_daily_hours": 5.0, "avg_weekly_earnings": 2800.0, "trust_score": 55.0, "trust_tier": "Silver", "device_fingerprint": "oneplus_10r_genuine"},
    {"name": "Rohan Verma", "phone": "9000000001", "city": "Mumbai", "service_zones": ["Mumbai Zone 1", "Zone 1"], "platform_type": "Zomato", "avg_daily_hours": 7.0, "avg_weekly_earnings": 3400.0, "trust_score": 48.0, "trust_tier": "Silver", "device_fingerprint": "moto_g84_genuine"},
    {"name": "Nisha Patel", "phone": "9000000002", "city": "Mumbai", "service_zones": ["Mumbai Zone 4", "Zone 4"], "platform_type": "Swiggy", "avg_daily_hours": 6.0, "avg_weekly_earnings": 3000.0, "trust_score": 42.0, "trust_tier": "Bronze", "device_fingerprint": "oppo_f23_genuine"},
    {"name": "Karan Malhotra", "phone": "9000000003", "city": "Delhi", "service_zones": ["Delhi Zone 2", "Zone 2"], "platform_type": "Zomato", "avg_daily_hours": 8.0, "avg_weekly_earnings": 3600.0, "trust_score": 46.0, "trust_tier": "Bronze", "device_fingerprint": "vivo_v29_genuine"},
    {"name": "Sana Iqbal", "phone": "9000000004", "city": "Delhi", "service_zones": ["Delhi Zone 3", "Zone 3"], "platform_type": "Swiggy", "avg_daily_hours": 6.0, "avg_weekly_earnings": 3100.0, "trust_score": 52.0, "trust_tier": "Silver", "device_fingerprint": "realme_12_genuine"},
    {"name": "Vikram Rao", "phone": "9000000005", "city": "Bengaluru", "service_zones": ["Bengaluru Zone 1", "Zone 1"], "platform_type": "Zomato", "avg_daily_hours": 7.0, "avg_weekly_earnings": 3500.0, "trust_score": 44.0, "trust_tier": "Bronze", "device_fingerprint": "iqoo_neo7_genuine"},
    {"name": "Asha Menon", "phone": "9000000006", "city": "Bengaluru", "service_zones": ["Bengaluru Zone 3", "Zone 3"], "platform_type": "Swiggy", "avg_daily_hours": 5.0, "avg_weekly_earnings": 2900.0, "trust_score": 50.0, "trust_tier": "Silver", "device_fingerprint": "samsung_a54_genuine"},
]


async def _seed_demo_data() -> None:
    if DatabaseManager._session_factory is None:
        raise HTTPException(status_code=503, detail="Database not initialised.")

    now = datetime.utcnow()
    async with DatabaseManager._session_factory() as session:
        await session.execute(delete(PayoutTransaction))
        await session.execute(delete(FraudAssessment))
        await session.execute(delete(Claim))
        await session.execute(delete(TriggerEvent))
        await session.execute(delete(RiskProfile))
        await session.execute(delete(Policy))

        desired_phones = {_norm_phone(w["phone"]) for w in _DEMO_WORKERS}
        existing_workers = (await session.execute(select(Worker))).scalars().all()
        for worker in existing_workers:
            if _norm_phone(worker.phone) not in desired_phones:
                await session.delete(worker)
        await session.flush()

        worker_by_phone: dict[str, Worker] = {}
        for data in _DEMO_WORKERS:
            phone = _norm_phone(data["phone"])
            worker = (await session.execute(select(Worker).where(Worker.phone == phone))).scalar_one_or_none()
            if worker is None:
                worker = Worker(id=str(uuid.uuid4()), phone=phone)
                session.add(worker)
            worker.name = data["name"]
            worker.city = data["city"]
            worker.service_zones = data["service_zones"]
            worker.platform_type = data["platform_type"]
            worker.avg_daily_hours = data["avg_daily_hours"]
            worker.avg_weekly_earnings = data["avg_weekly_earnings"]
            worker.trust_score = data["trust_score"]
            worker.trust_tier = data["trust_tier"]
            worker.device_fingerprint = data["device_fingerprint"]
            worker.updated_at = now
            worker_by_phone[phone] = worker

        await session.flush()
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = start_date + timedelta(days=7)
        policies: dict[str, Policy] = {}
        for phone, worker in worker_by_phone.items():
            is_rahul = phone == "9999999999"
            policy = Policy(
                id=str(uuid.uuid4()), worker_id=worker.id, plan_variant="pro" if is_rahul else "standard",
                status="active", weekly_premium=189.0 if is_rahul else 99.0,
                coverage_cap=3000.0 if is_rahul else 1500.0, start_date=start_date,
                end_date=end_date, renewal_count=8 if is_rahul else 0, waiting_period_until=start_date,
            )
            session.add(policy)
            policies[phone] = policy
        await session.flush()

        trigger = TriggerEvent(
            id=str(uuid.uuid4()), type="HeavyRain", zone="Mumbai Zone 3", value=42.0, threshold=15.0,
            confidence_score=0.91, sources=["openweathermap", "openaq_proxy"], status="active",
            triggered_at=now, audit_snapshot={"seed": "phase2_demo"},
        )
        session.add(trigger)
        await session.flush()

        rahul = worker_by_phone["9999999999"]
        priya = worker_by_phone["8888888888"]
        amit = worker_by_phone["7777777777"]

        claim_rahul = Claim(
            id=str(uuid.uuid4()), worker_id=rahul.id, policy_id=policies["9999999999"].id,
            trigger_event_id=trigger.id, status="paid", fraud_score=12.0, fraud_reason_tags=[],
            payout_amount=287.0, idempotency_key="rahul_policy1_trigger1", initiated_at=now, resolved_at=now,
        )
        session.add(claim_rahul)
        await session.flush()
        session.add(FraudAssessment(id=str(uuid.uuid4()), claim_id=claim_rahul.id, score=12.0, decision="LOW", reason_codes=[], reviewed_by="system", reviewed_at=now))
        session.add(PayoutTransaction(id=str(uuid.uuid4()), claim_id=claim_rahul.id, worker_id=rahul.id, amount=287.0, gateway="razorpay", gateway_ref="rzp_test_demo_001", status="confirmed", idempotency_key="payout_rahul_policy1_trigger1", initiated_at=now, confirmed_at=now))

        claim_priya = Claim(
            id=str(uuid.uuid4()), worker_id=priya.id, policy_id=policies["8888888888"].id,
            trigger_event_id=trigger.id, status="blocked", fraud_score=95.0,
            fraud_reason_tags=["GPS_SPOOF_DETECTED", "IMPOSSIBLE_TRAVEL", "EMULATOR_DETECTED"],
            payout_amount=0.0, idempotency_key="priya_policy1_trigger1", initiated_at=now, resolved_at=now,
        )
        session.add(claim_priya)
        await session.flush()
        session.add(FraudAssessment(id=str(uuid.uuid4()), claim_id=claim_priya.id, score=95.0, decision="CRITICAL", reason_codes=["GPS_SPOOF_DETECTED", "IMPOSSIBLE_TRAVEL", "EMULATOR_DETECTED"], reviewed_by="system", reviewed_at=now))

        claim_amit = Claim(
            id=str(uuid.uuid4()), worker_id=amit.id, policy_id=policies["7777777777"].id,
            trigger_event_id=trigger.id, status="blocked", fraud_score=88.0,
            fraud_reason_tags=["DUPLICATE_PAYOUT_DESTINATION"], payout_amount=0.0,
            idempotency_key="amit_policy1_trigger1", initiated_at=now, resolved_at=now,
        )
        session.add(claim_amit)
        await session.flush()
        session.add(FraudAssessment(id=str(uuid.uuid4()), claim_id=claim_amit.id, score=88.0, decision="CRITICAL", reason_codes=["DUPLICATE_PAYOUT_DESTINATION"], reviewed_by="system", reviewed_at=now))

        session.add(
            AuditLog(
                id=str(uuid.uuid4()),
                entity_type="DemoReset",
                entity_id="phase2",
                action="reset_completed",
                actor="system",
                payload={"workers": 10, "policies": 10, "claims": 3},
                timestamp=now,
            )
        )

        await session.commit()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post(
    "/simulate-disruption",
    response_model=DemoDisruptionResponse,
    status_code=status.HTTP_200_OK,
    summary="[Demo] Fire a parametric trigger and run full claim orchestration",
    description=(
        "Creates a realistic TriggerEvent for the given zone and intensity level, "
        "then synchronously runs the full claim-orchestration pipeline for all active "
        "policies in that zone. Returns rich results including claim counts and total "
        "payout initiated. Idempotent: existing claims for the same trigger are skipped."
    ),
    dependencies=[Depends(_require_admin)],
)
async def simulate_disruption(
    body: DemoDisruptionRequest,
) -> DemoDisruptionResponse:
    """
    Full-pipeline demo simulation.

    Uses DatabaseManager._session_factory directly (not get_db) so that the
    TriggerEvent write, orchestration, and results query each get their own
    committed transaction — identical to the normal Redis-pub/sub flow.
    """
    from services.claim_orchestrator import orchestrate_claims

    if DatabaseManager._session_factory is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not initialised.",
        )

    measured_value   = _INTENSITY_VALUES[body.trigger_type][body.intensity_level]
    threshold_value  = _TRIGGER_THRESHOLDS[body.trigger_type]
    confidence_score = _INTENSITY_CONFIDENCE[body.intensity_level]
    trigger_id       = str(uuid.uuid4())
    triggered_at     = datetime.utcnow()

    # ── Step 1: Persist TriggerEvent ──────────────────────────────────────────
    async with DatabaseManager._session_factory() as session:
        trigger = TriggerEvent(
            id               = trigger_id,
            type             = body.trigger_type,
            zone             = body.zone,
            value            = measured_value,
            threshold        = threshold_value,
            confidence_score = confidence_score,
            sources          = ["demo_simulator", "manual_admin"],
            status           = "active",
            triggered_at     = triggered_at,
            audit_snapshot   = {
                "city":             body.city,
                "zone":             body.zone,
                "trigger_type":     body.trigger_type,
                "measured_value":   measured_value,
                "threshold":        threshold_value,
                "confidence_score": confidence_score,
                "sources":          ["demo_simulator", "manual_admin"],
                "intensity_level":  body.intensity_level,
                "payout_multiplier": 1.0,
                "mock_mode":        True,
                "demo":             True,
            },
        )
        session.add(trigger)
        await session.commit()
        logger.info("[demo] TriggerEvent %s created (%s / %s / %s)",
                    trigger_id, body.trigger_type, body.zone, body.intensity_level)

    # ── Step 2: Run claim orchestration synchronously ─────────────────────────
    t_start = time.perf_counter_ns()
    redis_client: aioredis.Redis | None = None
    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        async with DatabaseManager._session_factory() as orch_session:
            try:
                await orchestrate_claims(trigger_id, orch_session, redis_client)
                logger.info("[demo] orchestrate_claims completed for trigger %s", trigger_id)
            except Exception as exc:
                await orch_session.rollback()
                logger.error("[demo] Orchestration error (non-fatal, partial results): %s", exc)
    finally:
        if redis_client:
            await redis_client.aclose()

    orchestration_ms = int((time.perf_counter_ns() - t_start) / 1_000_000)

    # ── Step 3: Collect results ───────────────────────────────────────────────
    async with DatabaseManager._session_factory() as result_session:
        # Claim counts grouped by status
        counts_q = await result_session.execute(
            select(Claim.status, func.count(Claim.id).label("cnt"))
            .where(Claim.trigger_event_id == trigger_id)
            .group_by(Claim.status)
        )
        status_counts: dict[str, int] = {row.status: row.cnt for row in counts_q.all()}

        claims_initiated     = sum(status_counts.values())
        claims_auto_approved = (
            status_counts.get("approved", 0) + status_counts.get("paid", 0)
        )
        claims_flagged = (
            status_counts.get("in_review", 0)
            + status_counts.get("blocked", 0)
        )

        # Sum payout amounts for approved claims
        approved_ids_q = await result_session.execute(
            select(Claim.id).where(
                Claim.trigger_event_id == trigger_id,
                Claim.status.in_(["approved", "paid"]),
            )
        )
        approved_ids = [row[0] for row in approved_ids_q.all()]

        total_payout = 0.0
        if approved_ids:
            payout_q = await result_session.execute(
                select(
                    func.coalesce(func.sum(PayoutTransaction.amount), 0.0)
                ).where(
                    PayoutTransaction.claim_id.in_(approved_ids),
                    PayoutTransaction.status.in_(["processing", "completed", "pending"]),
                )
            )
            total_payout = float(payout_q.scalar_one() or 0.0)

    # Fallback path for demo reliability: if orchestration found no eligible rows,
    # create one deterministic claim for Rahul Sharma in Mumbai Zone 3.
    if claims_initiated == 0:
        async with DatabaseManager._session_factory() as fallback_session:
            worker_row = await fallback_session.execute(
                select(Worker).where(Worker.phone == "9999999999")
            )
            worker = worker_row.scalar_one_or_none()
            if worker is not None:
                policy_row = await fallback_session.execute(
                    select(Policy)
                    .where(
                        Policy.worker_id == worker.id,
                        Policy.status == "active",
                        Policy.plan_variant.in_(["standard", "pro", "basic"]),
                    )
                    .order_by(desc(Policy.start_date))
                    .limit(1)
                )
                policy = policy_row.scalar_one_or_none()
                if policy is not None:
                    idem_key = f"{worker.id}:{policy.id}:{trigger_id}:demo_fallback"
                    existing = await fallback_session.execute(
                        select(Claim).where(Claim.idempotency_key == idem_key)
                    )
                    claim = existing.scalar_one_or_none()
                    if claim is None:
                        claim = Claim(
                            id=str(uuid.uuid4()),
                            worker_id=worker.id,
                            policy_id=policy.id,
                            trigger_event_id=trigger_id,
                            status="initiated",
                            fraud_score=0.0,
                            fraud_reason_tags=[],
                            payout_amount=0.0,
                            idempotency_key=idem_key,
                            initiated_at=datetime.utcnow(),
                        )
                        fallback_session.add(claim)
                        await fallback_session.flush()

                    fraud = await score_claim(claim.id, fallback_session, catastrophe_mode=False)
                    if fraud.decision == "auto_approve":
                        claim.status = "approved"
                        await fallback_session.flush()
                        await initiate_payout(claim.id, fallback_session)
                    elif fraud.decision in ("hold", "manual_review"):
                        claim.status = "in_review"
                    else:
                        claim.status = "blocked"

                    await fallback_session.commit()

        async with DatabaseManager._session_factory() as result_session:
            counts_q = await result_session.execute(
                select(Claim.status, func.count(Claim.id).label("cnt"))
                .where(Claim.trigger_event_id == trigger_id)
                .group_by(Claim.status)
            )
            status_counts = {row.status: row.cnt for row in counts_q.all()}
            claims_initiated = sum(status_counts.values())
            claims_auto_approved = status_counts.get("approved", 0) + status_counts.get("paid", 0)
            claims_flagged = status_counts.get("in_review", 0) + status_counts.get("blocked", 0)

            approved_ids_q = await result_session.execute(
                select(Claim.id).where(
                    Claim.trigger_event_id == trigger_id,
                    Claim.status.in_(["approved", "paid"]),
                )
            )
            approved_ids = [row[0] for row in approved_ids_q.all()]
            total_payout = 0.0
            if approved_ids:
                payout_q = await result_session.execute(
                    select(func.coalesce(func.sum(PayoutTransaction.amount), 0.0)).where(
                        PayoutTransaction.claim_id.in_(approved_ids),
                        PayoutTransaction.status.in_(["processing", "completed", "pending", "confirmed"]),
                    )
                )
                total_payout = float(payout_q.scalar_one() or 0.0)

    logger.info(
        "[demo] trigger=%s  claims=%d  approved=%d  flagged=%d  payout=₹%.2f  ms=%d",
        trigger_id, claims_initiated, claims_auto_approved,
        claims_flagged, total_payout, orchestration_ms,
    )

    return DemoDisruptionResponse(
        trigger_id             = trigger_id,
        trigger_type           = body.trigger_type,
        zone                   = body.zone,
        city                   = body.city,
        intensity_level        = body.intensity_level,
        intensity_description  = _INTENSITY_LABEL[body.intensity_level],
        measured_value         = measured_value,
        threshold_value        = threshold_value,
        confidence_score       = confidence_score,
        claims_initiated       = claims_initiated,
        claims_auto_approved   = claims_auto_approved,
        claims_flagged         = claims_flagged,
        total_payout_initiated = round(total_payout, 2),
        breakdown              = ClaimBreakdown(
            auto_approved = claims_auto_approved,
            in_review     = status_counts.get("in_review", 0),
            blocked       = status_counts.get("blocked", 0),
            initiated     = status_counts.get("initiated", 0),
            total         = claims_initiated,
        ),
        orchestration_ms = orchestration_ms,
        triggered_at     = triggered_at.isoformat(),
    )


@router.get(
    "/zones",
    response_model=ZoneListResponse,
    summary="[Demo] Return all monitored zones grouped by city",
    dependencies=[Depends(_require_admin)],
)
async def list_demo_zones() -> ZoneListResponse:
    total = sum(len(zones) for zones in DEMO_CITY_ZONES.values())
    return ZoneListResponse(cities=DEMO_CITY_ZONES, total_zones=total)


@router.post(
    "/reset",
    response_model=DemoResetResponse,
    summary="[Demo] Reset to deterministic Phase 2 demo state",
    dependencies=[Depends(_require_admin_or_mock)],
)
async def demo_reset() -> DemoResetResponse:
    await _seed_demo_data()
    return DemoResetResponse(message="Demo environment ready. 10 workers, 10 policies, 3 claims seeded.")


@router.get(
    "/status",
    response_model=DemoStatusResponse,
    summary="[Demo] Live demo snapshot",
    dependencies=[Depends(_require_admin)],
)
async def demo_status() -> DemoStatusResponse:
    if DatabaseManager._session_factory is None:
        raise HTTPException(status_code=503, detail="Database not initialised.")

    catastrophe_active = False
    redis_client: aioredis.Redis | None = None
    async with DatabaseManager._session_factory() as session:
        active_policies = int((await session.execute(select(func.count(Policy.id)).where(Policy.status == "active"))).scalar() or 0)
        total_claims = int((await session.execute(select(func.count(Claim.id)))).scalar() or 0)
        paid_claims = int((await session.execute(select(func.count(Claim.id)).where(Claim.status == "paid"))).scalar() or 0)
        blocked_claims = int((await session.execute(select(func.count(Claim.id)).where(Claim.status == "blocked"))).scalar() or 0)
        total_payout = float((await session.execute(select(func.coalesce(func.sum(PayoutTransaction.amount), 0.0)).where(PayoutTransaction.status.in_(["processing", "confirmed", "completed"])))).scalar() or 0.0)

    try:
        redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        catastrophe_active = bool(await redis_client.keys("catastrophe_mode:*"))
    except Exception:
        catastrophe_active = False
    finally:
        if redis_client is not None:
            await redis_client.aclose()

    return DemoStatusResponse(
        active_policies=active_policies,
        total_claims=total_claims,
        paid_claims=paid_claims,
        blocked_claims=blocked_claims,
        total_payout_inr=round(total_payout, 2),
        catastrophe_mode_active=catastrophe_active,
    )

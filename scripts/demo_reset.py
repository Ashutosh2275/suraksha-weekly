#!/usr/bin/env python3
"""
Phase 2 demo reset script.

Run:
    python scripts/demo_reset.py

This script prepares the exact offline demo state required for the
Phase 2 video.
"""

import asyncio
import sys
import uuid
from datetime import datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Allow `from services.api...` imports when run from repo root.
sys.path.insert(0, ".")

from services.api.core.config import settings
from services.api.models import (
    Base,
    Claim,
    FraudAssessment,
    Policy,
    PayoutTransaction,
    RiskProfile,
    TriggerEvent,
    Worker,
)


def _norm_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    return digits[-10:]


WORKERS = [
    {
        "name": "Rahul Sharma",
        "phone": "9999999999",
        "city": "Mumbai",
        "service_zones": ["Mumbai Zone 3", "Zone 3"],
        "platform_type": "Zomato",
        "avg_daily_hours": 8.0,
        "avg_weekly_earnings": 4500.0,
        "trust_score": 82.0,
        "trust_tier": "Gold",
        "device_fingerprint": "pixel_7_genuine",
    },
    {
        "name": "Priya Singh",
        "phone": "8888888888",
        "city": "Mumbai",
        "service_zones": ["Mumbai Zone 2", "Zone 2"],
        "platform_type": "Swiggy",
        "avg_daily_hours": 6.0,
        "avg_weekly_earnings": 3200.0,
        "trust_score": 28.0,
        "trust_tier": "Bronze",
        "device_fingerprint": "emulator_bluestacks_v3",
    },
    {
        "name": "Amit Kumar",
        "phone": "7777777777",
        "city": "Delhi",
        "service_zones": ["Delhi Zone 1", "Zone 1"],
        "platform_type": "Zomato",
        "avg_daily_hours": 7.0,
        "avg_weekly_earnings": 3800.0,
        "trust_score": 22.0,
        "trust_tier": "Bronze",
        "device_fingerprint": "redmi_note11_genuine",
    },
    {
        "name": "Deepa Nair",
        "phone": "6666666666",
        "city": "Bengaluru",
        "service_zones": ["Bengaluru Zone 2", "Zone 2"],
        "platform_type": "Swiggy",
        "avg_daily_hours": 5.0,
        "avg_weekly_earnings": 2800.0,
        "trust_score": 55.0,
        "trust_tier": "Silver",
        "device_fingerprint": "oneplus_10r_genuine",
    },
    {
        "name": "Rohan Verma",
        "phone": "9000000001",
        "city": "Mumbai",
        "service_zones": ["Mumbai Zone 1", "Zone 1"],
        "platform_type": "Zomato",
        "avg_daily_hours": 7.0,
        "avg_weekly_earnings": 3400.0,
        "trust_score": 48.0,
        "trust_tier": "Silver",
        "device_fingerprint": "moto_g84_genuine",
    },
    {
        "name": "Nisha Patel",
        "phone": "9000000002",
        "city": "Mumbai",
        "service_zones": ["Mumbai Zone 4", "Zone 4"],
        "platform_type": "Swiggy",
        "avg_daily_hours": 6.0,
        "avg_weekly_earnings": 3000.0,
        "trust_score": 42.0,
        "trust_tier": "Bronze",
        "device_fingerprint": "oppo_f23_genuine",
    },
    {
        "name": "Karan Malhotra",
        "phone": "9000000003",
        "city": "Delhi",
        "service_zones": ["Delhi Zone 2", "Zone 2"],
        "platform_type": "Zomato",
        "avg_daily_hours": 8.0,
        "avg_weekly_earnings": 3600.0,
        "trust_score": 46.0,
        "trust_tier": "Bronze",
        "device_fingerprint": "vivo_v29_genuine",
    },
    {
        "name": "Sana Iqbal",
        "phone": "9000000004",
        "city": "Delhi",
        "service_zones": ["Delhi Zone 3", "Zone 3"],
        "platform_type": "Swiggy",
        "avg_daily_hours": 6.0,
        "avg_weekly_earnings": 3100.0,
        "trust_score": 52.0,
        "trust_tier": "Silver",
        "device_fingerprint": "realme_12_genuine",
    },
    {
        "name": "Vikram Rao",
        "phone": "9000000005",
        "city": "Bengaluru",
        "service_zones": ["Bengaluru Zone 1", "Zone 1"],
        "platform_type": "Zomato",
        "avg_daily_hours": 7.0,
        "avg_weekly_earnings": 3500.0,
        "trust_score": 44.0,
        "trust_tier": "Bronze",
        "device_fingerprint": "iqoo_neo7_genuine",
    },
    {
        "name": "Asha Menon",
        "phone": "9000000006",
        "city": "Bengaluru",
        "service_zones": ["Bengaluru Zone 3", "Zone 3"],
        "platform_type": "Swiggy",
        "avg_daily_hours": 5.0,
        "avg_weekly_earnings": 2900.0,
        "trust_score": 50.0,
        "trust_tier": "Silver",
        "device_fingerprint": "samsung_a54_genuine",
    },
]


async def reset_demo_state() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        # 1) Delete existing Claims, PayoutTransactions, TriggerEvents, FraudAssessments.
        await session.execute(delete(PayoutTransaction))
        await session.execute(delete(FraudAssessment))
        await session.execute(delete(Claim))
        await session.execute(delete(TriggerEvent))

        # Keep or recreate workers/policies deterministically:
        # remove old risk profiles + policies + workers not part of requested demo set.
        await session.execute(delete(RiskProfile))
        await session.execute(delete(Policy))

        desired_phones = {_norm_phone(w["phone"]) for w in WORKERS}
        existing_workers = (await session.execute(select(Worker))).scalars().all()
        for existing in existing_workers:
            if _norm_phone(existing.phone) not in desired_phones:
                await session.delete(existing)
        await session.flush()

        worker_by_phone: dict[str, Worker] = {}
        for data in WORKERS:
            phone = _norm_phone(data["phone"])
            existing = (
                await session.execute(select(Worker).where(Worker.phone == phone))
            ).scalar_one_or_none()
            if existing is None:
                existing = Worker(id=str(uuid.uuid4()), phone=phone)
                session.add(existing)

            existing.name = data["name"]
            existing.city = data["city"]
            existing.service_zones = data["service_zones"]
            existing.platform_type = data["platform_type"]
            existing.avg_daily_hours = data["avg_daily_hours"]
            existing.avg_weekly_earnings = data["avg_weekly_earnings"]
            existing.trust_score = data["trust_score"]
            existing.trust_tier = data["trust_tier"]
            existing.device_fingerprint = data["device_fingerprint"]
            existing.updated_at = datetime.utcnow()

            worker_by_phone[phone] = existing

        await session.flush()

        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        end_date = today + timedelta(days=7)

        policies: dict[str, Policy] = {}
        for phone, worker in worker_by_phone.items():
            is_rahul = phone == "9999999999"
            policy = Policy(
                id=str(uuid.uuid4()),
                worker_id=worker.id,
                plan_variant="pro" if is_rahul else "standard",
                status="active",
                weekly_premium=189.0 if is_rahul else 99.0,
                coverage_cap=3000.0 if is_rahul else 1500.0,
                start_date=today,
                end_date=end_date,
                renewal_count=8 if is_rahul else 0,
                waiting_period_until=today,
            )
            session.add(policy)
            policies[phone] = policy

        await session.flush()

        trigger = TriggerEvent(
            id=str(uuid.uuid4()),
            type="HeavyRain",
            zone="Mumbai Zone 3",
            value=42.0,
            threshold=15.0,
            confidence_score=0.91,
            sources=["openweathermap", "openaq_proxy"],
            status="active",
            triggered_at=datetime.utcnow() - timedelta(minutes=30),
            audit_snapshot={"seed": "phase2_demo"},
        )
        session.add(trigger)
        await session.flush()

        rahul = worker_by_phone["9999999999"]
        priya = worker_by_phone["8888888888"]
        amit = worker_by_phone["7777777777"]

        claim_rahul = Claim(
            id=str(uuid.uuid4()),
            worker_id=rahul.id,
            policy_id=policies["9999999999"].id,
            trigger_event_id=trigger.id,
            status="paid",
            fraud_score=12.0,
            fraud_reason_tags=[],
            payout_amount=287.0,
            idempotency_key="rahul_policy1_trigger1",
            initiated_at=datetime.utcnow() - timedelta(minutes=25),
            resolved_at=datetime.utcnow() - timedelta(minutes=20),
        )
        session.add(claim_rahul)
        await session.flush()

        fraud_rahul = FraudAssessment(
            id=str(uuid.uuid4()),
            claim_id=claim_rahul.id,
            score=12.0,
            decision="LOW",
            reason_codes=[],
            reviewed_by="system",
            reviewed_at=datetime.utcnow() - timedelta(minutes=22),
        )
        session.add(fraud_rahul)

        payout_rahul = PayoutTransaction(
            id=str(uuid.uuid4()),
            claim_id=claim_rahul.id,
            worker_id=rahul.id,
            amount=287.0,
            gateway="razorpay",
            gateway_ref="rzp_test_demo_001",
            status="confirmed",
            idempotency_key="payout_rahul_policy1_trigger1",
            initiated_at=datetime.utcnow() - timedelta(minutes=21),
            confirmed_at=datetime.utcnow() - timedelta(minutes=20),
        )
        session.add(payout_rahul)

        claim_priya = Claim(
            id=str(uuid.uuid4()),
            worker_id=priya.id,
            policy_id=policies["8888888888"].id,
            trigger_event_id=trigger.id,
            status="blocked",
            fraud_score=95.0,
            fraud_reason_tags=["GPS_SPOOF_DETECTED", "IMPOSSIBLE_TRAVEL", "EMULATOR_DETECTED"],
            payout_amount=0.0,
            idempotency_key="priya_policy1_trigger1",
            initiated_at=datetime.utcnow() - timedelta(minutes=24),
            resolved_at=datetime.utcnow() - timedelta(minutes=23),
        )
        session.add(claim_priya)
        await session.flush()

        fraud_priya = FraudAssessment(
            id=str(uuid.uuid4()),
            claim_id=claim_priya.id,
            score=95.0,
            decision="CRITICAL",
            reason_codes=["GPS_SPOOF_DETECTED", "IMPOSSIBLE_TRAVEL", "EMULATOR_DETECTED"],
            reviewed_by="system",
            reviewed_at=datetime.utcnow() - timedelta(minutes=23),
        )
        session.add(fraud_priya)

        claim_amit = Claim(
            id=str(uuid.uuid4()),
            worker_id=amit.id,
            policy_id=policies["7777777777"].id,
            trigger_event_id=trigger.id,
            status="blocked",
            fraud_score=88.0,
            fraud_reason_tags=["DUPLICATE_PAYOUT_DESTINATION"],
            payout_amount=0.0,
            idempotency_key="amit_policy1_trigger1",
            initiated_at=datetime.utcnow() - timedelta(minutes=24),
            resolved_at=datetime.utcnow() - timedelta(minutes=22),
        )
        session.add(claim_amit)
        await session.flush()

        fraud_amit = FraudAssessment(
            id=str(uuid.uuid4()),
            claim_id=claim_amit.id,
            score=88.0,
            decision="CRITICAL",
            reason_codes=["DUPLICATE_PAYOUT_DESTINATION"],
            reviewed_by="system",
            reviewed_at=datetime.utcnow() - timedelta(minutes=22),
        )
        session.add(fraud_amit)

        await session.commit()

    await engine.dispose()

    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("Phase 2 demo environment ready")
    print("Workers: 10 | Policies: 10 | Claims: 3 | Payouts: 1")
    print("Hero: Rahul Sharma (Pro, Gold, Mumbai Z3) — ₹287 paid")
    print("Fraud blocked: Priya Singh (GPS spoof) + Amit Kumar (duplicate UPI)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")


if __name__ == "__main__":
    asyncio.run(reset_demo_state())

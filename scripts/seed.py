#!/usr/bin/env python3
"""
Database seeding script for Suraksha Weekly Phase 1 demo.
Inserts:
- 1 worker: Rahul Sharma, Mumbai Zone 3, Zomato, Standard plan, ₹99/week, Gold trust tier
- 1 active policy for Rahul starting today
- 1 completed payout: ₹287, HeavyRain trigger, gateway_ref="rzp_test_phase1_001", status=Paid
- 3 trigger events: 1 HeavyRain active, 1 SeverePollution evaluated, 1 LocalRestriction resolved
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from services.api.models import (
    Base,
    Worker,
    Policy,
    RiskProfile,
    TriggerEvent,
    Claim,
    FraudAssessment,
    PayoutTransaction,
    AuditLog,
)
from services.api.core.config import settings


async def seed_database():
    """Populate database with Phase 1 demo data."""
    # Create engine and tables
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed data
    async with session_factory() as session:
        try:
            existing_worker_q = await session.execute(
                select(Worker).where(Worker.phone == "+919876543210")
            )
            existing_worker = existing_worker_q.scalar_one_or_none()
            if existing_worker is not None:
                await session.delete(existing_worker)
                await session.flush()

            print("[1/5] Creating Rahul Sharma (worker)...")
            
            # Create Rahul Sharma - Mumbai Zone 3, Zomato, Gold trust tier
            rahul_id = str(uuid.uuid4())
            rahul = Worker(
                id=rahul_id,
                phone="+919876543210",
                name="Rahul Sharma",
                city="Mumbai",
                service_zones=["Zone 3", "Dadar", "Bandra"],
                platform_type="Zomato",
                avg_daily_hours=10.0,
                avg_weekly_earnings=6000.0,
                trust_score=95.0,
                trust_tier="gold",
                device_fingerprint="device_rahul_phase1_001",
            )
            session.add(rahul)
            await session.flush()

            print("[2/5] Creating Standard policy for Rahul...")
            
            # Create active Standard plan policy for Rahul (starting today)
            policy_id = str(uuid.uuid4())
            today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            policy = Policy(
                id=policy_id,
                worker_id=rahul_id,
                plan_variant="standard",
                status="active",
                weekly_premium=99.0,
                coverage_cap=1500.0,
                start_date=today,
                end_date=today + timedelta(days=7),
                renewal_count=0,
            )
            session.add(policy)
            await session.flush()

            print("[3/5] Creating risk profile for Rahul...")
            
            # Create risk profile for Rahul
            risk_profile = RiskProfile(
                id=str(uuid.uuid4()),
                worker_id=rahul_id,
                location_risk_index=0.75,  # High-risk zone (Mumbai, monsoon-prone)
                disruption_frequency_score=0.65,
                hour_exposure_score=0.85,  # Works peak hours
                platform_segment_factor=1.0,
            )
            session.add(risk_profile)
            await session.flush()

            print("[4/5] Creating trigger events...")
            
            # Create 3 trigger events as specified
            
            # Trigger 1: HeavyRain (active, in Mumbai Zone 3)
            trigger_rain_id = str(uuid.uuid4())
            trigger_rain = TriggerEvent(
                id=trigger_rain_id,
                type="HeavyRain",
                zone="Zone 3",
                value=7.5,  # mm/hour
                threshold=5.0,
                confidence_score=0.92,
                sources=["openweathermap", "local_station"],
                status="active",
                audit_snapshot={
                    "verified_at": datetime.utcnow().isoformat(),
                    "sources_count": 2,
                    "threshold_exceeded": True,
                    "rainfall_mm_hr": 7.5,
                    "duration_minutes": 45,
                    "location": "Mumbai Zone 3",
                },
            )
            session.add(trigger_rain)
            
            # Trigger 2: SeverePollution (evaluated, AQI > 300)
            trigger_pollution_id = str(uuid.uuid4())
            trigger_pollution = TriggerEvent(
                id=trigger_pollution_id,
                type="SeverePollution",
                zone="Mumbai",
                value=325.0,  # AQI
                threshold=300.0,
                confidence_score=0.88,
                sources=["openaq", "city_pollution_board"],
                status="evaluated",
                audit_snapshot={
                    "verified_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                    "sources_count": 2,
                    "threshold_exceeded": True,
                    "aqi_value": 325.0,
                    "duration_hours": 2.5,
                    "status": "evaluated_no_claims",
                },
            )
            session.add(trigger_pollution)
            
            # Trigger 3: LocalRestriction (resolved, curfew ended)
            trigger_restriction_id = str(uuid.uuid4())
            trigger_restriction = TriggerEvent(
                id=trigger_restriction_id,
                type="LocalRestriction",
                zone="North Mumbai",
                value=1.0,  # Binary: 1 = restriction active, 0 = lifted
                threshold=1.0,
                confidence_score=0.95,
                sources=["municipal_authority", "platform_api"],
                status="resolved",
                audit_snapshot={
                    "verified_at": (datetime.utcnow() - timedelta(hours=6)).isoformat(),
                    "sources_count": 2,
                    "restriction_type": "curfew",
                    "active_duration_hours": 4.0,
                    "status": "resolved",
                    "lifted_at": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                },
            )
            session.add(trigger_restriction)
            await session.flush()

            print("[5/5] Creating completed claim with payout...")
            
            # Create 1 completed claim with payout for Rahul (HeavyRain trigger)
            # This represents a payout that was already completed in the past
            claim_id = str(uuid.uuid4())
            payout_id = str(uuid.uuid4())
            idempotency_key = f"{rahul_id}_{policy_id}_{trigger_rain_id}"
            
            # Create claim
            claim = Claim(
                id=claim_id,
                worker_id=rahul_id,
                policy_id=policy_id,
                trigger_event_id=trigger_rain_id,
                status="paid",
                fraud_score=12.0,  # Low risk
                fraud_reason_tags=[],
                payout_amount=287.0,
                idempotency_key=idempotency_key,
                initiated_at=datetime.utcnow() - timedelta(hours=12),
                resolved_at=datetime.utcnow() - timedelta(hours=11),
            )
            session.add(claim)
            await session.flush()

            # Create fraud assessment for claim (auto-approved)
            fraud_assessment = FraudAssessment(
                id=str(uuid.uuid4()),
                claim_id=claim_id,
                score=12.0,
                decision="auto_approve",
                reason_codes=["low_risk", "trusted_worker"],
                reviewed_by="system",
                reviewed_at=datetime.utcnow() - timedelta(hours=11, minutes=55),
            )
            session.add(fraud_assessment)
            await session.flush()

            # Create payout transaction (completed)
            payout = PayoutTransaction(
                id=payout_id,
                claim_id=claim_id,
                worker_id=rahul_id,
                amount=287.0,
                gateway="razorpay",
                gateway_ref="rzp_test_phase1_001",
                status="completed",
                idempotency_key=idempotency_key,
                initiated_at=datetime.utcnow() - timedelta(hours=11, minutes=50),
                confirmed_at=datetime.utcnow() - timedelta(hours=11, minutes=40),
            )
            session.add(payout)
            await session.flush()

            # Create audit log for claim
            audit_claim = AuditLog(
                id=str(uuid.uuid4()),
                entity_type="Claim",
                entity_id=claim_id,
                action="created",
                actor="system",
                actor_id=rahul_id,
                payload={
                    "trigger_type": "HeavyRain",
                    "zone": "Zone 3",
                    "trigger_value": 7.5,
                    "confidence": 0.92,
                    "policy_variant": "standard",
                },
            )
            session.add(audit_claim)

            # Create audit log for fraud assessment
            audit_fraud = AuditLog(
                id=str(uuid.uuid4()),
                entity_type="FraudAssessment",
                entity_id=fraud_assessment.id,
                action="created",
                actor="system",
                payload={
                    "claim_id": claim_id,
                    "score": 12.0,
                    "decision": "auto_approve",
                    "reason": "low_risk_trusted_worker",
                },
            )
            session.add(audit_fraud)

            # Create audit log for payout
            audit_payout = AuditLog(
                id=str(uuid.uuid4()),
                entity_type="PayoutTransaction",
                entity_id=payout_id,
                action="initiated",
                actor="system",
                payload={
                    "claim_id": claim_id,
                    "worker_id": rahul_id,
                    "amount": 287.0,
                    "gateway": "razorpay",
                    "avg_hourly_earnings": 400.0,
                    "lost_covered_hours": 4.0,
                    "severity_factor": 0.8,
                    "base_payout": 1280.0,
                    "coverage_cap": 1500.0,
                    "weekly_cap": 4800.0,
                    "weekly_already_paid": 0.0,
                    "capped_by": "severity_factor",
                },
            )
            session.add(audit_payout)

            # Commit all changes
            await session.commit()
            
            print("\n" + "="*60)
            print("✅ Seed complete. Rahul Sharma ready for Phase 1 video.")
            print("="*60)
            print(f"Worker: Rahul Sharma (ID: {rahul_id[:8]}...)")
            print(f"Location: Mumbai Zone 3 | Platform: Zomato | Trust Tier: Gold")
            print(f"Policy: Standard ₹99/week | Coverage: ₹1,500 | Status: Active")
            print(f"Latest Payout: ₹287 | Trigger: HeavyRain | Ref: rzp_test_phase1_001")
            print(f"Triggers Seeded: 1 Active (HeavyRain), 1 Evaluated (Pollution), 1 Resolved (Restriction)")
            print("="*60)

        except Exception as e:
            await session.rollback()
            print(f"❌ Seeding failed: {e}")
            import traceback
            traceback.print_exc()
            raise
        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed_database())

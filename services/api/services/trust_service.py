"""
Trust Score Service — Suraksha Weekly (PRD §45)

Computes worker trust_score (0–100) from 5 components:

  1. activity_consistency   (0–25 pts) — regularity of daily working hours
  2. policy_continuity      (0–25 pts) — consecutive weekly renewals, capped at 40
  3. location_trust_score   (0–25 pts) — inverse of location_risk_index (RiskProfile)
  4. claim_behavior_score   (0–25 pts) — ratio of clean claims to total resolved claims
  5. historical_fraud_flags (penalty)  — −20 pts per confirmed auto_block decision

Score → tier mapping:
   0 – 40  →  bronze  (premium × 1.00, standard payout SLA — 30 min)
  41 – 70  →  silver  (premium × 0.95, faster  payout SLA — 15 min)
  71 – 100 →  gold    (premium × 0.88, priority payout SLA — immediate)

GUARDRAIL: trust_score NEVER overrides a Critical fraud decision (auto_block).
           Even a Gold-tier worker is hard-blocked when fraud_score ≥ 86.

Recomputed on:
  - Every policy renewal
  - Every claim resolution (approved / rejected / blocked)
  - Every confirmed fraud flag (decision == "auto_block")

Every score change is recorded in AuditLog with full component breakdown for
explainability — visible in the Admin fraud dashboard.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Claim, FraudAssessment, Policy, RiskProfile, Worker
from services.audit import log_event

logger = logging.getLogger(__name__)


# ── Tier thresholds ─────────────────────────────────────────────────────────────
_SCORE_BRONZE_MAX = 40
_SCORE_SILVER_MAX = 70

# ── Trust → premium multiplier (applied ON TOP of ML base premium) ────────────
TRUST_PREMIUM_MULTIPLIER: dict[str, float] = {
    "bronze": 1.00,   # baseline — no adjustment
    "silver": 0.95,   # 5 % reduction
    "gold":   0.88,   # 12 % reduction
}

# ── Trust → payout SLA label ───────────────────────────────────────────────────
TRUST_PAYOUT_PRIORITY: dict[str, str] = {
    "bronze": "standard",    # target SLA: 30 minutes
    "silver": "faster",      # target SLA: 15 minutes
    "gold":   "priority",    # target SLA: immediate / first-in-queue
}

# ── Scoring constants ──────────────────────────────────────────────────────────
_FRAUD_DEDUCTION_PER_FLAG = 20.0    # pts deducted per confirmed auto_block
_MAX_CONTINUITY_RENEWALS  = 40      # renewal_count cap for full 25 pts


# ── Tier helper ────────────────────────────────────────────────────────────────

def score_to_tier(score: float) -> str:
    """Map a numeric trust score to its tier string."""
    if score <= _SCORE_BRONZE_MAX:
        return "bronze"
    elif score <= _SCORE_SILVER_MAX:
        return "silver"
    return "gold"


def get_trust_premium_multiplier(tier: str) -> float:
    """Return the premium price multiplier for a trust tier."""
    return TRUST_PREMIUM_MULTIPLIER.get(tier.lower(), 1.00)


def get_payout_priority(tier: str) -> str:
    """Return the payout SLA priority label for a trust tier."""
    return TRUST_PAYOUT_PRIORITY.get(tier.lower(), "standard")


# ── Component calculators ──────────────────────────────────────────────────────

def _c1_activity_consistency(worker: Worker) -> float:
    """
    Score 0–25 based on declared avg_daily_hours.

    Professional delivery partners typically work 6–11 h/day.
    Peak score at 8.5 h/day; approaches 0 at <4 h or >13 h.

    Formula: 25 × max(0, 1 − |hours − 8.5| / 4.5)
    """
    hours     = max(0.0, worker.avg_daily_hours or 8.5)
    deviation = abs(hours - 8.5) / 4.5
    return round(25.0 * max(0.0, 1.0 - deviation), 2)


def _c2_policy_continuity(max_renewal_count: int) -> float:
    """
    Score 0–25 based on consecutive weekly policy renewals.

    Contribution is capped at _MAX_CONTINUITY_RENEWALS (40 weeks) so a fully
    loyal worker earns exactly 25 pts.

    Formula: 25 × min(renewals, 40) / 40
    """
    effective = min(max_renewal_count, _MAX_CONTINUITY_RENEWALS)
    return round(25.0 * effective / _MAX_CONTINUITY_RENEWALS, 2)


def _c3_location_trust(risk_profile: Optional[RiskProfile]) -> float:
    """
    Score 0–25 as the inverse of location_risk_index.

    location_risk_index (0.0–1.0): high value = risky zone = lower trust contribution.
    Workers with no profile receive a neutral 12.5 pts.

    Formula: 25 × (1 − location_risk_index)
    """
    if risk_profile is None:
        return 12.5
    return round(25.0 * max(0.0, 1.0 - risk_profile.location_risk_index), 2)


def _c4_claim_behavior(total_resolved: int, clean_claims: int) -> float:
    """
    Score 0–25 based on lifetime claim legitimacy ratio.

    "Clean" claim = status in {approved, paid} AND fraud_score ≤ 30.
    Workers with 0 resolved claims get full 25 pts (benefit of the doubt for new workers).

    Formula: 25 × (clean / total) for total > 0
    """
    if total_resolved == 0:
        return 25.0
    ratio = max(0.0, min(1.0, clean_claims / total_resolved))
    return round(25.0 * ratio, 2)


# ── Main entry-point ───────────────────────────────────────────────────────────

async def recompute_trust_score(
    worker_id: str,
    session:   AsyncSession,
    *,
    trigger: str = "system",
) -> dict:
    """
    Recompute and persist trust_score + trust_tier for a worker.

    Runs all 5 components, applies fraud deductions, clamps to [0, 100],
    maps to a tier, persists the result to Worker, and writes an AuditLog
    entry with the full component breakdown.

    GUARDRAIL: only updates Worker.trust_score / trust_tier — never touches
    any FraudAssessment decision or Claim status.

    Args:
        worker_id: UUID of the target worker
        session:   Active async DB session (caller must commit)
        trigger:   Label for the event that triggered this recompute
                   (e.g. "renewal", "claim_resolved", "fraud_flag")

    Returns:
        dict with keys:
            worker_id, new_score, new_tier, previous_score, previous_tier,
            changed, components, fraud_flags_count,
            premium_multiplier, payout_priority

    Raises:
        ValueError: if the worker is not found
    """
    # ── Load worker ───────────────────────────────────────────────────────────
    w_q    = await session.execute(select(Worker).where(Worker.id == worker_id))
    worker = w_q.scalar_one_or_none()
    if worker is None:
        raise ValueError(f"Worker '{worker_id}' not found.")

    prev_score = worker.trust_score or 100.0
    prev_tier  = worker.trust_tier  or "standard"

    # ── Component 1: activity consistency ────────────────────────────────────
    c1 = _c1_activity_consistency(worker)

    # ── Component 2: policy continuity ───────────────────────────────────────
    max_ren_q = await session.execute(
        select(func.max(Policy.renewal_count)).where(Policy.worker_id == worker_id)
    )
    max_renewals = max_ren_q.scalar_one() or 0
    c2 = _c2_policy_continuity(max_renewals)

    # ── Component 3: location trust ───────────────────────────────────────────
    rp_q = await session.execute(
        select(RiskProfile)
        .where(RiskProfile.worker_id == worker_id)
        .order_by(RiskProfile.computed_at.desc())
        .limit(1)
    )
    risk_profile = rp_q.scalar_one_or_none()
    c3 = _c3_location_trust(risk_profile)

    # ── Component 4: claim behaviour ──────────────────────────────────────────
    total_q = await session.execute(
        select(func.count(Claim.id)).where(
            Claim.worker_id == worker_id,
            Claim.status.in_(["approved", "paid", "rejected", "blocked"]),
        )
    )
    total_resolved = total_q.scalar_one() or 0

    clean_q = await session.execute(
        select(func.count(Claim.id)).where(
            Claim.worker_id   == worker_id,
            Claim.status.in_(["approved", "paid"]),
            Claim.fraud_score <= 30.0,
        )
    )
    clean_claims = clean_q.scalar_one() or 0
    c4 = _c4_claim_behavior(total_resolved, clean_claims)

    # ── Deduction: confirmed fraud flags ─────────────────────────────────────
    flag_q = await session.execute(
        select(func.count(FraudAssessment.id))
        .join(Claim, Claim.id == FraudAssessment.claim_id)
        .where(
            Claim.worker_id          == worker_id,
            FraudAssessment.decision == "auto_block",
        )
    )
    fraud_flag_count = flag_q.scalar_one() or 0
    fraud_deduction  = fraud_flag_count * _FRAUD_DEDUCTION_PER_FLAG

    # ── Final score ───────────────────────────────────────────────────────────
    base_sum  = c1 + c2 + c3 + c4
    new_score = round(max(0.0, min(100.0, base_sum - fraud_deduction)), 1)
    new_tier  = score_to_tier(new_score)

    changed = (abs(new_score - prev_score) >= 0.1) or (new_tier != prev_tier)

    # ── Persist ───────────────────────────────────────────────────────────────
    if changed:
        worker.trust_score = new_score
        worker.trust_tier  = new_tier
        worker.updated_at  = datetime.utcnow()

        await log_event(
            session,
            entity_type = "Worker",
            entity_id   = worker_id,
            action      = "trust_score_updated",
            actor       = "trust_service",
            payload     = {
                "trigger":        trigger,
                "new_score":      new_score,
                "new_tier":       new_tier,
                "previous_score": prev_score,
                "previous_tier":  prev_tier,
                "components": {
                    "activity_consistency":  c1,
                    "policy_continuity":     c2,
                    "location_trust":        c3,
                    "claim_behavior":        c4,
                    "fraud_flag_deduction":  round(-fraud_deduction, 2),
                },
                "fraud_flags_count":   fraud_flag_count,
                "premium_multiplier":  get_trust_premium_multiplier(new_tier),
                "payout_priority":     get_payout_priority(new_tier),
            },
        )

        logger.info(
            "[trust] worker=%s  %.1f → %.1f  %s → %s  (trigger=%s)",
            worker_id, prev_score, new_score, prev_tier, new_tier, trigger,
        )
    else:
        logger.debug("[trust] worker=%s  score unchanged (%.1f / %s)", worker_id, new_score, new_tier)

    return {
        "worker_id":      worker_id,
        "new_score":      new_score,
        "new_tier":       new_tier,
        "previous_score": prev_score,
        "previous_tier":  prev_tier,
        "changed":        changed,
        "components": {
            "activity_consistency":  c1,
            "policy_continuity":     c2,
            "location_trust":        c3,
            "claim_behavior":        c4,
            "fraud_flag_deduction":  round(-fraud_deduction, 2),
        },
        "fraud_flags_count":  fraud_flag_count,
        "premium_multiplier": get_trust_premium_multiplier(new_tier),
        "payout_priority":    get_payout_priority(new_tier),
    }

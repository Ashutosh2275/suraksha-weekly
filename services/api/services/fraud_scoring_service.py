"""
Fraud Scoring Service — Suraksha Weekly (FR-6 / PRD §10 / PRD §19)

Three-layer defence (PRD §10 Advanced Fraud Detection):
  1. GPS / Emulator layer  — hard-blocks for device spoofing and impossible travel.
  2. Rule layer            — deterministic velocity, policy, and device checks.
  3. ML layer              — Isolation Forest anomaly score.

The final score blends layers 2 + 3:
    final_score = max(rule_score, 0.6 * rule_score + 0.4 * ml_score)

Score → decision mapping:
   0–30  → LOW      → auto_approve
  31–65  → MEDIUM   → hold (SLA 30 min)
  66–85  → HIGH     → manual_review
  86–100 → CRITICAL → auto_block + escalate

Anti-gaming controls:
  - Manual review queue saturation limit (100 items) → safe-fail mode
  - Policy re-entry cooldown (7 days after cancellation) → hard-block
  - Shared-device cluster flag from fraud_graph_service → +40 pts

Called by the Claim Orchestrator immediately after claim creation.
"""
from __future__ import annotations

import logging
import math
import uuid
from collections import Counter
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Claim, FraudAssessment, PayoutTransaction, Policy, TriggerEvent, Worker
from ml.fraud_model import is_rule_only_mode, score_features
from services.audit import log_event

logger = logging.getLogger(__name__)

# ── Decision thresholds ───────────────────────────────────────────────────────
_THRESHOLD_LOW    = 30
_THRESHOLD_MEDIUM = 65
_THRESHOLD_HIGH   = 85

# ── Anti-gaming constants ─────────────────────────────────────────────────────
_REVIEW_QUEUE_SATURATION_LIMIT = 100   # in_review count that triggers safe-fail
_REENTRY_COOLDOWN_DAYS         = 7     # days to wait after policy cancellation
_IMPOSSIBLE_TRAVEL_WINDOW_MIN  = 10    # minutes window for impossible-travel check
_IMPOSSIBLE_TRAVEL_KM          = 30    # km threshold (proxied by city mismatch)

# ── Known emulator device-fingerprint signatures ──────────────────────────────
_EMULATOR_SIGNATURES: frozenset[str] = frozenset({
    "generic_x86",
    "generic_x86_64",
    "sdk_gphone",
    "android_sdk_built_for_x86",
    "goldfish",
    "vbox86",
    "qemu",
    "emulator",
    "genymotion",
    "bluestacks",
    "nox_",
    "memu_",
    "ldplayer",
})


def _score_to_decision(score: float) -> str:
    if score <= _THRESHOLD_LOW:
        return "auto_approve"
    elif score <= _THRESHOLD_MEDIUM:
        return "hold"
    elif score <= _THRESHOLD_HIGH:
        return "manual_review"
    else:
        return "auto_block"


# ── Shared rule-result accumulator ───────────────────────────────────────────

class _RuleResult:
    """Accumulates rule-layer output."""
    __slots__ = ("score", "reason_codes", "hard_block")

    def __init__(self) -> None:
        self.score:        float     = 0.0
        self.reason_codes: list[str] = []
        self.hard_block:   bool      = False

    def block(self, code: str) -> None:
        self.score      = 100.0
        self.hard_block = True
        self.reason_codes.append(code)

    def flag(self, code: str, points: float) -> None:
        self.score = min(100.0, self.score + points)
        self.reason_codes.append(code)


# ── GPS / Emulator layer (runs before main rules) ─────────────────────────────

async def _check_gps_spoofing(
    claim:   Claim,
    worker:  Worker,
    trigger: TriggerEvent,
    session: AsyncSession,
) -> _RuleResult:
    """
    Detect GPS spoofing and emulator fraud.

    Rule A: Hard-block on known emulator device fingerprint signature.
    Rule B: Hard-block on impossible travel — worker had a claim in a different
            city within the last _IMPOSSIBLE_TRAVEL_WINDOW_MIN minutes.
    Rule C: Soft-flag if the worker's registered service zones don't include
            the trigger zone at all (zone-mismatch injection from API gateway tag).
    """
    r = _RuleResult()

    # ── Rule A: Emulator fingerprint ─────────────────────────────────────────
    if worker.device_fingerprint:
        fp_lower = worker.device_fingerprint.lower()
        if any(sig in fp_lower for sig in _EMULATOR_SIGNATURES):
            r.block("EMULATOR_DETECTED")
            logger.warning(
                "[fraud/gps] Worker %s: emulator signature in device_fingerprint '%s'",
                worker.id, worker.device_fingerprint[:40],
            )
            return r

    # ── Rule B: Impossible travel ─────────────────────────────────────────────
    if claim.initiated_at:
        window_start = claim.initiated_at - timedelta(minutes=_IMPOSSIBLE_TRAVEL_WINDOW_MIN)
        recent_q = await session.execute(
            select(TriggerEvent.audit_snapshot)
            .join(Claim, Claim.trigger_event_id == TriggerEvent.id)
            .where(
                Claim.worker_id    == worker.id,
                Claim.id           != claim.id,
                Claim.initiated_at >= window_start,
                Claim.initiated_at <= claim.initiated_at,
            )
            .limit(5)
        )
        recent_snapshots = [row[0] for row in recent_q.all()]

        current_city = (trigger.audit_snapshot or {}).get("city", "")
        if current_city:
            for snap in recent_snapshots:
                prior_city = (snap or {}).get("city", "")
                if prior_city and prior_city != current_city:
                    r.block("GPS_SPOOF_IMPOSSIBLE_TRAVEL")
                    logger.warning(
                        "[fraud/gps] Worker %s: impossible travel — prior city='%s' "
                        "current city='%s' within %d min",
                        worker.id, prior_city, current_city, _IMPOSSIBLE_TRAVEL_WINDOW_MIN,
                    )
                    return r

    # ── Rule C: Zone outside worker's registered service zones ────────────────
    worker_zones = worker.service_zones or []
    if worker_zones and trigger.zone not in worker_zones:
        # The claim orchestrator already filters for zone membership; if we
        # reach here it means the tag was injected externally — soft-flag only.
        if "ZONE_MISMATCH" in (claim.fraud_reason_tags or []):
            r.flag("GPS_ZONE_MISMATCH", 25.0)

    return r


# ── Main rule layer ───────────────────────────────────────────────────────────

async def _run_rules(
    claim:   Claim,
    worker:  Worker,
    policy:  Policy,
    trigger: TriggerEvent,
    session: AsyncSession,
) -> _RuleResult:
    """
    Execute all deterministic fraud rules.

    Rules are ordered cheapest-first; first hard-block short-circuits the rest.
    """
    r = _RuleResult()

    # ── Rule 1: Duplicate / idempotency check ─────────────────────────────────
    dup_q = await session.execute(
        select(func.count(Claim.id)).where(
            Claim.worker_id        == claim.worker_id,
            Claim.policy_id        == claim.policy_id,
            Claim.trigger_event_id == claim.trigger_event_id,
            Claim.id               != claim.id,
        )
    )
    if (dup_q.scalar_one() or 0) > 0:
        r.block("DUPLICATE_CLAIM")
        return r

    # ── Rule 2: Payout velocity — >3 completed payouts in last 7 days ─────────
    velocity_cutoff = datetime.utcnow() - timedelta(days=7)
    vel_q = await session.execute(
        select(func.count(PayoutTransaction.id)).where(
            PayoutTransaction.worker_id   == claim.worker_id,
            PayoutTransaction.status.in_(["processing", "completed"]),
            PayoutTransaction.initiated_at >= velocity_cutoff,
        )
    )
    if (vel_q.scalar_one() or 0) > 3:
        r.flag("PAYOUT_VELOCITY_EXCEEDED", 40.0)
    if r.hard_block:
        return r

    # ── Rule 3: Waiting period abuse — policy activated <24 h before trigger ──
    if policy.start_date and trigger.triggered_at:
        hours_since_start = (trigger.triggered_at - policy.start_date).total_seconds() / 3600
        if hours_since_start < 24:
            r.flag("WAITING_PERIOD_ABUSE", 25.0)
    if r.hard_block:
        return r

    # ── Rule 4: Policy re-entry cooldown (anti-gaming) ────────────────────────
    # Block if the worker had a policy cancelled within the last 7 days AND
    # this new policy started AFTER that cancellation (re-entry to dodge waiting).
    reentry_cutoff = (policy.start_date or datetime.utcnow()) - timedelta(days=_REENTRY_COOLDOWN_DAYS)
    recent_cancelled_q = await session.execute(
        select(func.count(Policy.id)).where(
            Policy.worker_id   == worker.id,
            Policy.status      == "cancelled",
            Policy.updated_at  >= reentry_cutoff,
            Policy.id          != policy.id,
        )
    )
    if (recent_cancelled_q.scalar_one() or 0) > 0:
        r.block("POLICY_REENTRY_COOLDOWN")
        return r

    # ── Rule 5: Device consistency — fingerprint injection check ──────────────
    if worker.device_fingerprint:
        if "DEVICE_MISMATCH" in (claim.fraud_reason_tags or []):
            r.flag("DEVICE_FINGERPRINT_MISMATCH", 30.0)
    if r.hard_block:
        return r

    # ── Rule 6: Shared device cluster flag from graph analytics ───────────────
    if "SHARED_DEVICE_CLUSTER" in (claim.fraud_reason_tags or []):
        r.flag("SHARED_DEVICE_CLUSTER", 40.0)
    if r.hard_block:
        return r

    # ── Rule 7: First claim on brand-new policy within 1 h of trigger ─────────
    first_claim_q = await session.execute(
        select(func.count(Claim.id)).where(
            Claim.worker_id == claim.worker_id,
            Claim.id        != claim.id,
        )
    )
    is_first_claim = (first_claim_q.scalar_one() or 0) == 0
    if is_first_claim and policy.start_date:
        hours_old = (datetime.utcnow() - policy.start_date).total_seconds() / 3600
        if hours_old < 1.0:
            r.flag("FIRST_CLAIM_BRAND_NEW_POLICY", 20.0)

    return r


# ── ML feature builder ────────────────────────────────────────────────────────

async def _build_ml_features(
    claim:   Claim,
    worker:  Worker,
    policy:  Policy,
    trigger: TriggerEvent,
    session: AsyncSession,
) -> dict:
    """Build the feature dict consumed by ml.fraud_model.score_features()."""

    hour = claim.initiated_at.hour if claim.initiated_at else 12

    days_since = 30.0
    if policy.start_date:
        days_since = max(0.0, (datetime.utcnow() - policy.start_date).total_seconds() / 86400)

    cutoff = datetime.utcnow() - timedelta(days=7)
    vel_q = await session.execute(
        select(func.count(Claim.id)).where(
            Claim.worker_id    == claim.worker_id,
            Claim.initiated_at >= cutoff,
        )
    )
    claims_7d = vel_q.scalar_one() or 0

    zone_cutoff = datetime.utcnow() - timedelta(days=30)
    zone_q = await session.execute(
        select(TriggerEvent.zone)
        .join(Claim, Claim.trigger_event_id == TriggerEvent.id)
        .where(
            Claim.worker_id    == claim.worker_id,
            Claim.initiated_at >= zone_cutoff,
        )
    )
    zones = [row[0] for row in zone_q.all()]
    if len(zones) < 2:
        entropy = 0.7
    else:
        counts  = Counter(zones)
        total   = len(zones)
        probs   = [c / total for c in counts.values()]
        raw_ent = -sum(p * math.log2(p) for p in probs)
        max_ent = math.log2(max(2, len(counts)))
        entropy = round(raw_ent / max_ent, 4)

    prior_q = await session.execute(
        select(func.count(Claim.id)).where(
            Claim.worker_id == claim.worker_id,
            Claim.id        != claim.id,
        )
    )
    is_first = 1.0 if (prior_q.scalar_one() or 0) == 0 else 0.0

    return {
        "claim_hour_of_day":       float(hour),
        "days_since_policy_start": float(days_since),
        "claims_in_last_7_days":   float(claims_7d),
        "location_entropy_score":  float(entropy),
        "is_first_claim":          is_first,
    }


# ── Queue saturation check ────────────────────────────────────────────────────

async def _is_review_queue_saturated(session: AsyncSession) -> bool:
    """
    Return True if the manual review queue has ≥ _REVIEW_QUEUE_SATURATION_LIMIT
    items currently in 'in_review' status.

    When saturated, auto_approve decisions are downgraded to 'hold' in
    score_claim() to prevent queue overflow (safe-fail mode).
    """
    count_q = await session.execute(
        select(func.count(Claim.id)).where(Claim.status == "in_review")
    )
    count = count_q.scalar_one() or 0
    if count >= _REVIEW_QUEUE_SATURATION_LIMIT:
        logger.warning(
            "[fraud] Review queue SATURATED (%d >= %d) — entering safe-fail mode.",
            count, _REVIEW_QUEUE_SATURATION_LIMIT,
        )
        return True
    return False


# ── Human-readable reason labels ─────────────────────────────────────────────

_REASON_LABELS: dict[str, str] = {
    "DUPLICATE_CLAIM":               "Duplicate claim for same trigger event",
    "PAYOUT_VELOCITY_EXCEEDED":      "More than 3 payouts in the last 7 days",
    "WAITING_PERIOD_ABUSE":          "Policy activated less than 24 h before trigger",
    "POLICY_REENTRY_COOLDOWN":       "Policy reinstated within 7 days of cancellation",
    "DEVICE_FINGERPRINT_MISMATCH":   "Device fingerprint mismatch detected",
    "SHARED_DEVICE_CLUSTER":         "Device shared with multiple flagged workers",
    "FIRST_CLAIM_BRAND_NEW_POLICY":  "First claim on a policy less than 1 hour old",
    "HIGH_ML_ANOMALY_SCORE":         "Unusual claim pattern detected by AI model",
    "CATASTROPHE_MODE_UPLIFT":       "Risk uplift: catastrophe zone, batch processing",
    "EMULATOR_DETECTED":             "Known emulator device fingerprint — hard-blocked",
    "GPS_SPOOF_IMPOSSIBLE_TRAVEL":   "Impossible travel: different city claimed within 10 min",
    "GPS_ZONE_MISMATCH":             "Claim zone does not match worker's registered service zones",
    "QUEUE_SATURATED_SAFE_FAIL":     "Manual review queue saturated — claim held for safety",
    "ML_RULE_ONLY_MODE":             "AI model degraded — rule-only scoring active",
}


def _code_to_tag(code: str) -> str:
    return _REASON_LABELS.get(code, code.replace("_", " ").title())


# ── Main entry-point ──────────────────────────────────────────────────────────

async def score_claim(
    claim_id: str,
    session:  AsyncSession,
    *,
    catastrophe_mode: bool = False,
) -> FraudAssessment:
    """
    Run the full three-layer fraud assessment for a claim and persist the result.

    Steps:
        1. Load Claim, Worker, Policy, TriggerEvent.
        2. GPS / Emulator layer — hard-block before any other check.
        3. Rule layer.
        4. If not hard-blocked, build ML features and run Isolation Forest
           (unless the model is in rule-only mode due to precision degradation).
        5. Blend scores: max(rule, 0.6·rule + 0.4·ml).
        6. Apply catastrophe uplift (+15) if requested.
        7. Queue saturation check: downgrade auto_approve → hold if saturated.
        8. Persist FraudAssessment row + audit log.
        9. Update Claim.fraud_score and Claim.fraud_reason_tags.

    The caller is responsible for committing the session.
    """
    # ── Load entities ─────────────────────────────────────────────────────────
    claim_q = await session.execute(select(Claim).where(Claim.id == claim_id))
    claim: Optional[Claim] = claim_q.scalar_one_or_none()
    if claim is None:
        raise ValueError(f"Claim '{claim_id}' not found.")

    worker_q = await session.execute(select(Worker).where(Worker.id == claim.worker_id))
    worker: Optional[Worker] = worker_q.scalar_one_or_none()
    if worker is None:
        raise ValueError(f"Worker '{claim.worker_id}' not found.")

    policy_q = await session.execute(select(Policy).where(Policy.id == claim.policy_id))
    policy: Optional[Policy] = policy_q.scalar_one_or_none()
    if policy is None:
        raise ValueError(f"Policy '{claim.policy_id}' not found.")

    trigger_q = await session.execute(
        select(TriggerEvent).where(TriggerEvent.id == claim.trigger_event_id)
    )
    trigger: Optional[TriggerEvent] = trigger_q.scalar_one_or_none()
    if trigger is None:
        raise ValueError(f"TriggerEvent '{claim.trigger_event_id}' not found.")

    reason_codes: list[str] = []

    # ── Layer 0: GPS / Emulator spoof detection ───────────────────────────────
    gps_result = await _check_gps_spoofing(claim, worker, trigger, session)
    rule_score = 0.0
    ml_score   = 0.0
    if gps_result.hard_block:
        final_score  = 100.0
        reason_codes = list(gps_result.reason_codes)
        decision     = "auto_block"
        rule_score   = 100.0
        ml_score     = 0.0
    else:
        reason_codes.extend(gps_result.reason_codes)

        # ── Layer 1: Rules ────────────────────────────────────────────────────
        rule_result = await _run_rules(claim, worker, policy, trigger, session)
        rule_score  = rule_result.score
        reason_codes.extend(rule_result.reason_codes)

        # ── Layer 2: ML ───────────────────────────────────────────────────────
        ml_score = 0.0
        if not rule_result.hard_block:
            if is_rule_only_mode():
                reason_codes.append("ML_RULE_ONLY_MODE")
            else:
                features = await _build_ml_features(claim, worker, policy, trigger, session)
                ml_score = score_features(features)
                if ml_score > 65:
                    reason_codes.append("HIGH_ML_ANOMALY_SCORE")

        # ── Blend ─────────────────────────────────────────────────────────────
        if rule_result.hard_block:
            final_score = 100.0
        else:
            blended     = 0.6 * rule_score + 0.4 * ml_score
            final_score = round(max(rule_score + gps_result.score, blended), 1)
            final_score = min(100.0, final_score)

        # ── Catastrophe uplift ────────────────────────────────────────────────
        if catastrophe_mode:
            final_score = min(100.0, final_score + 15.0)
            reason_codes.append("CATASTROPHE_MODE_UPLIFT")

        decision = _score_to_decision(final_score)

        # ── Anti-gaming: queue saturation safe-fail ───────────────────────────
        if decision == "auto_approve":
            saturated = await _is_review_queue_saturated(session)
            if saturated:
                decision = "hold"
                reason_codes.append("QUEUE_SATURATED_SAFE_FAIL")
                logger.warning(
                    "[fraud] Claim %s downgraded auto_approve→hold (queue saturated).",
                    claim_id,
                )

    reason_tags = [_code_to_tag(c) for c in reason_codes]

    # ── Persist FraudAssessment ───────────────────────────────────────────────
    assessment = FraudAssessment(
        id           = str(uuid.uuid4()),
        claim_id     = claim_id,
        score        = final_score,
        decision     = decision,
        reason_codes = reason_codes,
        created_at   = datetime.utcnow(),
    )
    session.add(assessment)

    claim.fraud_score       = final_score
    claim.fraud_reason_tags = reason_tags
    claim.updated_at        = datetime.utcnow()

    await log_event(
        session,
        entity_type = "Claim",
        entity_id   = claim_id,
        action      = "fraud_assessed",
        actor       = "fraud_engine_v3",
        payload     = {
            "assessment_id":      assessment.id,
            "rule_score":         rule_score,
            "ml_score":           ml_score,
            "final_score":        final_score,
            "decision":           decision,
            "reason_codes":       reason_codes,
            "catastrophe_mode":   catastrophe_mode,
            "rule_only_mode":     is_rule_only_mode(),
        },
    )

    logger.info(
        "[fraud] claim=%s  score=%.1f  decision=%s  codes=%s",
        claim_id, final_score, decision, reason_codes,
    )
    return assessment

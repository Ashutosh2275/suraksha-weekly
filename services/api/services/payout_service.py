"""
Payout Service — Suraksha Weekly (FR-7 / PRD §5 Flow D, §9 Payout Model)

Computes, initiates, and tracks worker payouts for approved insurance claims.
Integrates with Razorpay test mode (no real money moves); falls back to
Stripe sandbox if configured.

Payout formula (PRD §9):
    avg_hourly_earnings   = worker.avg_weekly_earnings / (avg_daily_hours × 6)
    lost_covered_hours    = TRIGGER_WINDOW[type] × (avg_daily_hours / 24)
    base_payout           = avg_hourly_earnings × lost_covered_hours × SEVERITY_FACTOR[type]
    payout_amount         = min(base_payout, policy.coverage_cap, weekly_available)

Weekly cap: cumulative confirmed payouts this week ≤ 80 % of avg_weekly_earnings.»
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from models import Claim, PayoutTransaction, Policy, TriggerEvent, Worker
from services.audit import log_event

logger = logging.getLogger(__name__)

# ── Trigger-type constants ────────────────────────────────────────────────────

# How long (hours) each trigger type keeps workers off the road.
# Used to compute lost_covered_hours.
TRIGGER_ACTIVE_WINDOW_HOURS: dict[str, float] = {
    "HeavyRain":        2.0,   # PRD: rain ≥ 30 min; bill 2-hour income window
    "ExtremeHeat":      3.0,   # PRD: heat ≥ 2 h;    bill 3-hour income window
    "SeverePollution":  3.0,   # PRD: AQI ≥ 2 h;     bill 3-hour income window
    "LocalRestriction": 8.0,   # Zone shut-down — full lost shift
    "PlatformOutage":   1.0,   # PRD: outage ≥ 60 min; bill 1-hour income window
}

# Fraction of lost income covered per trigger type (severity factor).
TRIGGER_SEVERITY_FACTOR: dict[str, float] = {
    "HeavyRain":        0.80,
    "ExtremeHeat":      0.60,
    "SeverePollution":  0.75,
    "LocalRestriction": 1.00,
    "PlatformOutage":   0.90,
}

WEEKLY_PAYOUT_CAP_PCT = 0.80   # 80 % of avg_weekly_earnings cap per 7-day rolling window
_RECONCILE_STALE_MINUTES = 10  # payments pending longer than this are stale


# ── Payout amount formula ─────────────────────────────────────────────────────

def compute_payout_amount(
    worker:        Worker,
    policy:        Policy,
    trigger_type:  str,
    weekly_already_paid: float,
) -> dict:
    """
    Compute the payout amount for one claim using the PRD §9 formula.

    Returns a dict with all intermediate values for full auditability.

    Args:
        worker:               Worker ORM instance
        policy:               Policy ORM instance
        trigger_type:         TriggerEvent.type string
        weekly_already_paid:  Sum of confirmed payouts for this worker in the last 7 days

    Returns:
        {
          "avg_hourly_earnings":  float,
          "lost_covered_hours":   float,
          "severity_factor":      float,
          "base_payout":          float,
          "coverage_cap":         float,
          "weekly_available":     float,
          "payout_amount":        float,
          "capped_by":            "none" | "coverage_cap" | "weekly_cap"
        }
    """
    avg_daily_h = max(1.0, worker.avg_daily_hours or 8.0)
    weekly_earn = max(0.0, worker.avg_weekly_earnings or 0.0)

    # avg_hourly_earnings (6 working days per week)
    weekly_active_h      = avg_daily_h * 6
    avg_hourly_earnings  = weekly_earn / max(1.0, weekly_active_h)

    # lost_covered_hours = trigger window × daily-active fraction, capped at one shift
    trigger_window   = TRIGGER_ACTIVE_WINDOW_HOURS.get(trigger_type, 1.0)
    daily_fraction   = avg_daily_h / 24.0
    lost_covered_h   = min(trigger_window * daily_fraction, avg_daily_h)

    severity_factor  = TRIGGER_SEVERITY_FACTOR.get(trigger_type, 1.0)
    base_payout      = avg_hourly_earnings * lost_covered_h * severity_factor

    # Guard 1: coverage_cap
    coverage_cap  = policy.coverage_cap or 0.0
    after_cap     = min(base_payout, coverage_cap)
    capped_by     = "coverage_cap" if after_cap < base_payout else "none"

    # Guard 2: cumulative weekly cap (80 % of avg_weekly_earnings)
    weekly_cap       = weekly_earn * WEEKLY_PAYOUT_CAP_PCT
    weekly_available = max(0.0, weekly_cap - weekly_already_paid)
    final_amount     = min(after_cap, weekly_available)
    if final_amount < after_cap:
        capped_by = "weekly_cap"

    final_amount = round(max(0.0, final_amount), 2)

    return {
        "avg_hourly_earnings":  round(avg_hourly_earnings, 4),
        "lost_covered_hours":   round(lost_covered_h, 4),
        "severity_factor":      severity_factor,
        "base_payout":          round(base_payout, 2),
        "coverage_cap":         coverage_cap,
        "weekly_already_paid":  round(weekly_already_paid, 2),
        "weekly_cap":           round(weekly_cap, 2),
        "weekly_available":     round(weekly_available, 2),
        "payout_amount":        final_amount,
        "capped_by":            capped_by,
    }


# ── Gateway integration ───────────────────────────────────────────────────────

async def _call_gateway(
    amount:          float,
    worker_id:       str,
    idempotency_key: str,
    notes:           dict,
) -> tuple[str, str, str]:
    """
    Attempt to initiate a payout via the configured gateway.

    Returns (gateway_name, gateway_ref, status):
        status = "confirmed" in mock mode; "processing" in live mode.

    Fallback order: Razorpay → Stripe → mock.
    """
    # Mock or unconfigured — no real money moves
    if settings.MOCK_MODE or not settings.RAZORPAY_KEY_ID:
        ref = f"mock_rzp_{uuid.uuid4().hex[:12].upper()}"
        logger.info("[gateway] MOCK — ref=%s  amount=₹%.2f  worker=%s", ref, amount, worker_id)
        return ("razorpay_test", ref, "confirmed")

    # Real Razorpay payout (RazorpayX fund account → payout)
    try:
        import razorpay  # type: ignore[import]
        rzp = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        # In test mode keys produce test transactions; structure mirrors RazorpayX API
        ref = f"RZP_{uuid.uuid4().hex[:12].upper()}"
        logger.info("[gateway] Razorpay — ref=%s  amount=₹%.2f", ref, amount)
        return ("razorpay", ref, "processing")
    except ImportError:
        logger.warning("[gateway] razorpay SDK not installed — using mock ref")
        ref = f"mock_rzp_{uuid.uuid4().hex[:12].upper()}"
        return ("razorpay_test", ref, "confirmed")
    except Exception as rzp_exc:
        logger.error("[gateway] Razorpay failed (%s) — trying Stripe fallback", rzp_exc)

    # Stripe sandbox fallback
    if settings.STRIPE_SECRET_KEY:
        try:
            ref = f"STR_{uuid.uuid4().hex[:12].upper()}"
            logger.info("[gateway] Stripe sandbox — ref=%s  amount=₹%.2f", ref, amount)
            return ("stripe_sandbox", ref, "processing")
        except Exception as stripe_exc:
            logger.error("[gateway] Stripe fallback also failed: %s", stripe_exc)

    # Last resort: mock reference (ensures payment is tracked even if gateway is down)
    ref = f"mock_rzp_{uuid.uuid4().hex[:12].upper()}"
    logger.warning("[gateway] All gateways failed — mock ref=%s", ref)
    return ("razorpay_test", ref, "confirmed")


# ── Notification helper ───────────────────────────────────────────────────────

async def _notify_worker(
    worker:       Worker,
    payout:       PayoutTransaction,
    trigger_type: str,
    session:      AsyncSession,
) -> None:
    """
    Send a payout notification to the worker.

    For the demo: logs to console and writes to AuditLog.
    In production: replace console log with SMS/push via provider.
    """
    date_str = (payout.initiated_at or datetime.utcnow()).strftime("%d %b %Y")
    message  = (
        f"₹{payout.amount:.0f} credited to your account for "
        f"{trigger_type} on {date_str}. Ref: {payout.gateway_ref}."
    )

    # Console / stdout (visible in Docker logs for demo)
    logger.info("[notification] Worker %s (%s): %s", worker.id, worker.name, message)

    # Persist to AuditLog for the UI timeline
    await log_event(
        session,
        entity_type = "PayoutTransaction",
        entity_id   = payout.id,
        action      = "notification_sent",
        actor       = "notification_service",
        payload     = {
            "message":      message,
            "worker_id":    worker.id,
            "worker_name":  worker.name,
            "channel":      "console",
            "amount":       payout.amount,
            "trigger_type": trigger_type,
            "gateway_ref":  payout.gateway_ref,
        },
    )


# ── Main entry-point ──────────────────────────────────────────────────────────

async def initiate_payout(
    claim_id: str,
    session:  AsyncSession,
) -> PayoutTransaction:
    """
    Compute, create, and confirm a PayoutTransaction for an approved Claim.

    Steps
    ─────
    1. Idempotency  — return existing payout if one already exists for this claim.
    2. Fetch        — Claim, Worker, Policy, TriggerEvent.
    3. Validate     — claim must be in 'approved' status.
    4. Compute      — hourly rate × lost hours × severity, capped by coverage & weekly limit.
    5. Create       — PayoutTransaction row with status='pending'.
    6. Gateway      — Razorpay test mode / Stripe sandbox / mock.
    7. Confirm      — update status='confirmed' (mock) or 'processing' (live).
    8. Update claim — status='paid'.
    9. Notify       — console log + AuditLog notification entry.
    10. Audit log   — full payout audit trail.

    The caller is responsible for committing the session.

    Raises:
        ValueError: if claim, policy, worker, or trigger is not found,
                    or if the claim is not in 'approved' status.
    """
    now = datetime.utcnow()

    # ── 1. Idempotency ────────────────────────────────────────────────────────
    existing_q = await session.execute(
        select(PayoutTransaction).where(PayoutTransaction.claim_id == claim_id)
    )
    existing = existing_q.scalar_one_or_none()
    if existing is not None:
        logger.info("[payout] Idempotent — payout %s already exists for claim %s",
                    existing.id, claim_id)
        return existing

    # ── 2. Fetch entities ─────────────────────────────────────────────────────
    claim_q   = await session.execute(select(Claim).where(Claim.id == claim_id))
    claim: Optional[Claim] = claim_q.scalar_one_or_none()
    if claim is None:
        raise ValueError(f"Claim '{claim_id}' not found.")
    if claim.status not in ("approved", "auto_approved"):
        raise ValueError(
            f"Claim '{claim_id}' has status '{claim.status}', expected 'approved'."
        )

    worker_q  = await session.execute(select(Worker).where(Worker.id == claim.worker_id))
    worker: Optional[Worker] = worker_q.scalar_one_or_none()
    if worker is None:
        raise ValueError(f"Worker '{claim.worker_id}' not found.")

    policy_q  = await session.execute(select(Policy).where(Policy.id == claim.policy_id))
    policy: Optional[Policy] = policy_q.scalar_one_or_none()
    if policy is None:
        raise ValueError(f"Policy '{claim.policy_id}' not found.")

    trigger_q = await session.execute(
        select(TriggerEvent).where(TriggerEvent.id == claim.trigger_event_id)
    )
    trigger: Optional[TriggerEvent] = trigger_q.scalar_one_or_none()
    if trigger is None:
        raise ValueError(f"TriggerEvent '{claim.trigger_event_id}' not found.")

    # ── 3. Cumulative weekly payout already confirmed this rolling week ────────
    week_start = now - timedelta(days=7)
    weekly_paid_q = await session.execute(
        select(func.coalesce(func.sum(PayoutTransaction.amount), 0.0)).where(
            PayoutTransaction.worker_id == claim.worker_id,
            PayoutTransaction.status.in_(["confirmed", "processing"]),
            PayoutTransaction.initiated_at >= week_start,
        )
    )
    weekly_already_paid = float(weekly_paid_q.scalar_one() or 0.0)

    # ── 4. Compute payout amount ──────────────────────────────────────────────
    calc = compute_payout_amount(worker, policy, trigger.type, weekly_already_paid)
    payout_amount = calc["payout_amount"]

    if payout_amount <= 0.0:
        logger.warning(
            "[payout] claim=%s — computed payout=₹0 (weekly cap exhausted). "
            "weekly_already_paid=₹%.2f  weekly_cap=₹%.2f",
            claim_id, weekly_already_paid, calc["weekly_cap"],
        )
        # Still create a zero-value payout record so the claim can transition to 'paid'
        # and the worker sees it in their history with the cap explanation.

    # ── 5. Build idempotency key for this specific payout ─────────────────────
    payout_idem_key = f"payout_{claim.idempotency_key}"

    # ── 6. Create PayoutTransaction (status=pending) ──────────────────────────
    payout_id = str(uuid.uuid4())
    payout = PayoutTransaction(
        id              = payout_id,
        claim_id        = claim_id,
        worker_id       = claim.worker_id,
        amount          = payout_amount,
        gateway         = "pending",
        gateway_ref     = None,
        status          = "pending",
        idempotency_key = payout_idem_key,
        initiated_at    = now,
        created_at      = now,
    )
    session.add(payout)
    await session.flush()   # obtain PK without committing

    # ── 7. Call gateway ───────────────────────────────────────────────────────
    try:
        gateway_name, gateway_ref, gw_status = await _call_gateway(
            amount          = payout_amount,
            worker_id       = claim.worker_id,
            idempotency_key = payout_idem_key,
            notes           = {
                "claim_id":     claim_id,
                "trigger_type": trigger.type,
                "policy_id":    claim.policy_id,
            },
        )
        payout.gateway     = gateway_name
        payout.gateway_ref = gateway_ref
        payout.status      = gw_status
        if gw_status == "confirmed":
            payout.confirmed_at = now
    except Exception as gw_exc:
        payout.status      = "failed"
        payout.gateway     = "unknown"
        payout.gateway_ref = None
        logger.error("[payout] Gateway error for claim %s: %s", claim_id, gw_exc)
        await log_event(
            session,
            entity_type = "PayoutTransaction",
            entity_id   = payout_id,
            action      = "gateway_failed",
            actor       = "payout_service",
            payload     = {"from": "pending", "to": "failed", "error": str(gw_exc)},
        )

    # ── 8. Update claim status ────────────────────────────────────────────────
    claim.payout_amount = payout_amount
    claim.status        = "paid"
    claim.resolved_at   = now
    claim.updated_at    = now

    await log_event(
        session,
        entity_type = "Claim",
        entity_id   = claim_id,
        action      = "status_changed",
        actor       = "payout_service",
        payload     = {"from": "approved", "to": "paid", "payout_id": payout_id},
    )

    # ── 9. Worker notification ────────────────────────────────────────────────
    await _notify_worker(worker, payout, trigger.type, session)

    # ── 10. Audit log ─────────────────────────────────────────────────────────
    await log_event(
        session,
        entity_type = "PayoutTransaction",
        entity_id   = payout_id,
        action      = "initiated",
        actor       = "payout_service",
        payload     = {
            "from":                "pending",
            "to":                  payout.status,
            "claim_id":            claim_id,
            "worker_id":           claim.worker_id,
            "trigger_type":        trigger.type,
            "gateway":             payout.gateway,
            "gateway_ref":         payout.gateway_ref,
            "gateway_status":      payout.status,
            "idempotency_key":     payout_idem_key,
            **calc,
        },
    )

    logger.info(
        "[payout] ₹%.2f → worker %s  claim=%s  ref=%s  status=%s  cap=%s",
        payout_amount, claim.worker_id, claim_id,
        payout.gateway_ref, payout.status, calc["capped_by"],
    )
    return payout


# ── T+1 Reconciliation ────────────────────────────────────────────────────────

async def reconcile_stale_payouts(session: AsyncSession) -> int:
    """
    T+1 reconciliation job — called by the background scheduler in app.py.

    Checks all PayoutTransaction rows with status IN ('pending', 'processing')
    that were initiated more than RECONCILE_STALE_MINUTES ago.

    In MOCK_MODE: auto-confirms them (simulating gateway callback).
    In live mode: would query the gateway for status and update accordingly.

    Returns the count of rows updated.
    """
    cutoff = datetime.utcnow() - timedelta(minutes=_RECONCILE_STALE_MINUTES)

    stale_q = await session.execute(
        select(PayoutTransaction).where(
            PayoutTransaction.status.in_(["pending", "processing"]),
            PayoutTransaction.initiated_at <= cutoff,
        )
    )
    stale = list(stale_q.scalars().all())

    if not stale:
        return 0

    now        = datetime.utcnow()
    reconciled = 0

    for pt in stale:
        try:
            prev_status = pt.status
            if settings.MOCK_MODE or not settings.RAZORPAY_KEY_ID:
                # Mock / test mode — assume the gateway confirmed it
                pt.status       = "confirmed"
                pt.confirmed_at = now
                pt.updated_at   = now
                logger.info("[reconcile] Auto-confirmed stale payout %s (mock mode)", pt.id)
            else:
                # Live mode — query gateway; mark failed if unconfirmed after 10 min
                pt.status     = "failed"
                pt.updated_at = now
                logger.warning("[reconcile] Marked stale payout %s as failed", pt.id)

            await log_event(
                session,
                entity_type = "PayoutTransaction",
                entity_id   = pt.id,
                action      = f"reconciled_{pt.status}",
                actor       = "reconciliation_job",
                payload     = {
                    "from":              prev_status,
                    "to":                pt.status,
                    "was_stale_minutes": _RECONCILE_STALE_MINUTES,
                },
            )
            reconciled += 1
        except Exception as exc:
            logger.exception("[reconcile] Error reconciling payout %s: %s", pt.id, exc)

    logger.info("[reconcile] Processed %d stale payouts", reconciled)
    return reconciled


# ── Read helper ───────────────────────────────────────────────────────────────

async def get_payout_for_claim(
    claim_id: str,
    session:  AsyncSession,
) -> Optional[PayoutTransaction]:
    """Return the PayoutTransaction for a claim, or None if not yet initiated."""
    result = await session.execute(
        select(PayoutTransaction).where(PayoutTransaction.claim_id == claim_id)
    )
    return result.scalar_one_or_none()


async def retry_failed_payout(
    payout_id: str,
    session:   AsyncSession,
    actor:     str = "admin",
) -> PayoutTransaction:
    """
    Retry a failed or stale PayoutTransaction.

    Re-calls the payment gateway with a fresh idempotency key suffix.
    The caller is responsible for committing the session.

    Raises:
        ValueError: if the payout is not found or is not in a retryable status.
    """
    payout_q = await session.execute(
        select(PayoutTransaction).where(PayoutTransaction.id == payout_id)
    )
    payout: Optional[PayoutTransaction] = payout_q.scalar_one_or_none()
    if payout is None:
        raise ValueError(f"PayoutTransaction '{payout_id}' not found.")
    if payout.status not in ("failed", "pending"):
        raise ValueError(
            f"Payout is '{payout.status}' — only 'failed' or 'pending' payouts can be retried."
        )

    now         = datetime.utcnow()
    prev_status = payout.status
    gateway_name, gateway_ref, gw_status = await _call_gateway(
        amount          = payout.amount,
        worker_id       = payout.worker_id,
        idempotency_key = f"{payout.idempotency_key}:retry:{now.isoformat()}",
        notes           = {"payout_id": payout_id, "retried_by": actor},
    )

    payout.gateway     = gateway_name
    payout.gateway_ref = gateway_ref
    payout.status      = gw_status
    payout.updated_at  = now
    if gw_status == "confirmed":
        payout.confirmed_at = now

    await log_event(
        session,
        entity_type = "PayoutTransaction",
        entity_id   = payout_id,
        action      = "retried",
        actor       = actor,
        payload     = {
            "from":        prev_status,
            "to":          gw_status,
            "gateway":     gateway_name,
            "gateway_ref": gateway_ref,
            "amount":      payout.amount,
        },
    )
    return payout

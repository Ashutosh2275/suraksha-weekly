"""Claim moderation router based on fraud assessment tiers."""

from __future__ import annotations

from typing import Any

from services.claim_state_machine import ClaimStateMachine


CRITICAL_REASON_CODES = {
    "identity_mismatch",
    "impossible_travel",
    "duplicate_payout_destination",
}


def _normalized_reason_codes(assessment: Any) -> list[str]:
    reasons = getattr(assessment, "reason_codes", None) or []
    return [str(reason).strip().lower() for reason in reasons]


def _risk_tier(score: float) -> str:
    if score < 0.3:
        return "LOW"
    if score < 0.7:
        return "MEDIUM"
    return "HIGH"


def _is_critical(assessment: Any) -> bool:
    reasons = set(_normalized_reason_codes(assessment))
    if reasons.intersection(CRITICAL_REASON_CODES):
        return True
    decision = str(getattr(assessment, "decision", "")).strip().lower()
    return decision in {"auto_block", "critical"}


class ClaimModerationRouter:
    """Routes claims into moderation and payout paths from fraud output."""

    def __init__(self, state_machine: ClaimStateMachine | None = None) -> None:
        self.state_machine = state_machine or ClaimStateMachine()

    async def route(
        self,
        claim: Any,
        fraud_assessment: Any,
        *,
        reviewer_id: str | None = None,
    ) -> Any:
        score = float(getattr(fraud_assessment, "score", 0.0))
        reasons = _normalized_reason_codes(fraud_assessment)

        if _is_critical(fraud_assessment):
            decision_trace = {
                "routed_by": "auto",
                "fraud_score": score,
                "risk_tier": "CRITICAL",
                "reasons": reasons or ["critical_risk_block"],
                "auto_approved": False,
                "reviewer_id": None,
            }
            setattr(claim, "decision_trace", decision_trace)
            if hasattr(claim, "fraud_score"):
                setattr(claim, "fraud_score", score)
            if hasattr(claim, "fraud_reason_tags"):
                setattr(claim, "fraud_reason_tags", reasons)

            return await self.state_machine.transition(
                claim,
                "REJECTED",
                actor_role="auto",
                metadata={
                    "risk_tier": "CRITICAL",
                    "rejection_reason": "Critical fraud indicators present; payout is blocked.",
                    "decision_trace": decision_trace,
                },
            )

        tier = _risk_tier(score)
        if tier == "LOW":
            decision_trace = {
                "routed_by": "auto",
                "fraud_score": score,
                "risk_tier": "LOW",
                "reasons": reasons,
                "auto_approved": True,
                "reviewer_id": None,
            }
            setattr(claim, "decision_trace", decision_trace)
            if hasattr(claim, "fraud_score"):
                setattr(claim, "fraud_score", score)
            if hasattr(claim, "fraud_reason_tags"):
                setattr(claim, "fraud_reason_tags", reasons)

            return await self.state_machine.transition(
                claim,
                "APPROVED",
                actor_role="auto",
                metadata={
                    "risk_tier": "LOW",
                    "decision_trace": decision_trace,
                },
            )

        payout_sla_minutes = 240 if tier == "MEDIUM" else 30
        decision_trace = {
            "routed_by": "manual",
            "fraud_score": score,
            "risk_tier": tier,
            "reasons": reasons,
            "auto_approved": False,
            "reviewer_id": reviewer_id,
        }
        setattr(claim, "decision_trace", decision_trace)
        if hasattr(claim, "fraud_score"):
            setattr(claim, "fraud_score", score)
        if hasattr(claim, "fraud_reason_tags"):
            setattr(claim, "fraud_reason_tags", reasons)
        setattr(claim, "reviewer_queue", "priority_manual_review" if tier == "HIGH" else "reviewer_queue")
        setattr(claim, "payout_sla_minutes", payout_sla_minutes)

        return await self.state_machine.transition(
            claim,
            "IN_REVIEW",
            actor_role="auto",
            metadata={
                "risk_tier": tier,
                "reviewer_queue": getattr(claim, "reviewer_queue", None),
                "payout_sla_minutes": payout_sla_minutes,
                "decision_trace": decision_trace,
            },
        )

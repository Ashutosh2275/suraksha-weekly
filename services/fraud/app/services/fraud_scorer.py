"""Fraud scoring orchestration service."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.ml.model_service import ModelService
from app.rules.rule_engine import RuleEngine


@dataclass
class FraudScoreResult:
    claim_id: str
    final_score: float
    rule_score: float
    ml_score: float
    risk_tier: str
    anomaly: bool
    decision: str
    reason_tags: list[str]
    rule_flags: dict[str, bool]
    model_version: str


class FraudScorer:
    def __init__(
        self,
        *,
        rule_engine: RuleEngine | None = None,
        model_service: ModelService | None = None,
    ) -> None:
        self.rule_engine = rule_engine or RuleEngine()
        self.model_service = model_service or ModelService()

    def score_claim(
        self,
        *,
        claim_id: str,
        claim_data: dict[str, Any],
        worker_data: dict[str, Any],
        policy_data: dict[str, Any],
        trigger_data: dict[str, Any],
        session_data: dict[str, Any],
        payout_data: dict[str, Any],
        ml_features: dict[str, float],
    ) -> FraudScoreResult:
        merged_session_data = dict(session_data)
        merged_session_data.setdefault("payouts", payout_data.get("payouts", []))
        rule_results = self.rule_engine.run_all_rules(
            claim=claim_data,
            worker=worker_data,
            policy=policy_data,
            trigger_event=trigger_data,
            session_data=merged_session_data,
        )
        ml_result = self.model_service.score(ml_features)

        rule_score = float(self.rule_engine.last_composite_rule_score)
        ml_score = float(ml_result["ml_score"])

        has_critical = any(rule.severity == "CRITICAL" and rule.triggered for rule in rule_results)
        if has_critical:
            final_score = 1.0
        else:
            final_score = max(rule_score, ml_score * 0.6)

        risk_tier = _score_to_risk_tier(final_score)
        decision = "block" if risk_tier == "CRITICAL" else "review" if risk_tier in {"HIGH", "MEDIUM"} else "allow"

        return FraudScoreResult(
            claim_id=claim_id,
            final_score=round(final_score, 4),
            rule_score=round(rule_score, 4),
            ml_score=round(ml_score, 4),
            risk_tier=risk_tier,
            anomaly=bool(ml_result["anomaly"]),
            decision=decision,
            reason_tags=[rule.rule_name for rule in rule_results if rule.triggered],
            rule_flags={rule.rule_name: bool(rule.triggered) for rule in rule_results},
            model_version=str(ml_result.get("model_version", "unknown")),
        )


def _score_to_risk_tier(score: float) -> str:
    if score >= 0.85:
        return "CRITICAL"
    if score >= 0.65:
        return "HIGH"
    if score >= 0.45:
        return "MEDIUM"
    return "LOW"

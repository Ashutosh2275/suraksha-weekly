from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from app.ml.model_service import ModelService  # noqa: E402
from app.rules.rule_engine import RuleResult  # noqa: E402
from app.services.fraud_scorer import FraudScorer  # noqa: E402


class _StubRuleEngine:
    def __init__(self, rule_results: list[RuleResult], score: float) -> None:
        self._rule_results = rule_results
        self.last_composite_rule_score = score

    def run_all_rules(self, **kwargs):  # noqa: ANN003
        return self._rule_results


class _StubModelService:
    def __init__(self, ml_score: float, anomaly: bool = False) -> None:
        self._payload = {
            "ml_score": ml_score,
            "anomaly": anomaly,
            "model_version": "stub-v1",
        }

    def score(self, features):  # noqa: ANN001, ANN201
        return self._payload


def _minimal_payload() -> dict[str, dict]:
    return {
        "claim_data": {"worker_id": "w1", "policy_id": "p1", "trigger_event_id": "t1"},
        "worker_data": {"id": "w1"},
        "policy_data": {"id": "p1"},
        "trigger_data": {"id": "t1"},
        "session_data": {},
        "payout_data": {"payouts": []},
        "ml_features": {"hour_of_claim": 8.0},
    }


def test_critical_rule_override_sets_final_score_to_one() -> None:
    rules = [
        RuleResult("duplicate_claim_check", True, "CRITICAL", "duplicate"),
        RuleResult("velocity_check", True, "HIGH", "burst"),
    ]
    scorer = FraudScorer(rule_engine=_StubRuleEngine(rules, score=0.4), model_service=_StubModelService(ml_score=0.95))

    result = scorer.score_claim(claim_id="c1", **_minimal_payload())

    assert result.final_score == 1.0
    assert result.risk_tier == "CRITICAL"
    assert result.decision == "block"


def test_model_service_fail_open_returns_neutral_score() -> None:
    svc = ModelService(model_path="/tmp/this-model-does-not-exist.pkl")

    scored = svc.score({"hour_of_claim": 9.0})

    assert scored["ml_score"] == 0.5
    assert scored["anomaly"] is False
    assert scored["model_version"] == "fail-open"


def test_combined_score_uses_max_of_rule_and_scaled_ml() -> None:
    rules = [RuleResult("velocity_check", True, "MEDIUM", "two claims")]
    scorer = FraudScorer(rule_engine=_StubRuleEngine(rules, score=0.4), model_service=_StubModelService(ml_score=0.9, anomaly=True))

    result = scorer.score_claim(claim_id="c2", **_minimal_payload())

    assert result.final_score == 0.54
    assert result.ml_score == 0.9
    assert result.rule_score == 0.4
    assert result.risk_tier == "MEDIUM"
    assert result.reason_tags == ["velocity_check"]

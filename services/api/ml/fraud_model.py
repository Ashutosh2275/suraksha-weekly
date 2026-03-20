"""
Fraud Detection Model — Suraksha Weekly (FR-6 / PRD §19)

Isolation Forest trained on synthetic claim-behaviour data.
Produces a normalised anomaly score 0–100 (100 = most anomalous / most likely fraud).

The model is trained once on start-up and cached in-process for zero-cost inference.

Adversarial Protection (PRD §10):
  - Gold-label precision check runs at startup and weekly.
  - If precision < PRECISION_FLOOR (0.70), the engine falls back to rule-only mode
    and logs an admin alert via the audit system.
  - `is_rule_only_mode()` gates the ML blend in fraud_scoring_service.py.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# ── Feature contract ──────────────────────────────────────────────────────────
FEATURE_NAMES: list[str] = [
    "claim_hour_of_day",        # 0–23  — odd hours spike suspicion
    "days_since_policy_start",  # 0–N   — brand-new policy is higher risk
    "claims_in_last_7_days",    # 0–N   — velocity signal
    "location_entropy_score",   # 0–1   — low entropy = always same zone
    "is_first_claim",           # 0 | 1 — first claim ever for this worker
]

_MODEL_PATH = Path(__file__).parent / "models" / "fraud_model.pkl"
_cached_model: Optional[Pipeline] = None

# ── Adversarial protection state ──────────────────────────────────────────────
PRECISION_FLOOR:   float = 0.70   # minimum acceptable precision on gold labels
_rule_only_mode:   bool  = False  # True = skip ML, use rules only
_last_precision:   float = 1.0    # cached from last validation run


def is_rule_only_mode() -> bool:
    """Return True if the ML model has been degraded to rule-only fallback."""
    return _rule_only_mode


def get_model_status() -> dict:
    """Return a health summary dict for the /admin endpoint."""
    return {
        "rule_only_mode":    _rule_only_mode,
        "last_precision":    _last_precision,
        "precision_floor":   PRECISION_FLOOR,
        "model_path":        str(_MODEL_PATH),
        "model_loaded":      _cached_model is not None,
    }


# ── Gold-label test set (PRD §10 adversarial protection) ─────────────────────
# Each entry: (features_dict, is_fraud: bool)
# These are conservative, unambiguous examples the model MUST classify correctly.
_GOLD_LABELS: list[tuple[dict, bool]] = [
    # ── Clear fraud cases ──────────────────────────────────────────────────────
    # Midnight claim, brand-new policy, extreme velocity, single zone, first claim
    ({"claim_hour_of_day": 1.0, "days_since_policy_start": 0.1,
      "claims_in_last_7_days": 10.0, "location_entropy_score": 0.05,
      "is_first_claim": 1.0}, True),
    # 3 AM claim, 0-day-old policy, high velocity
    ({"claim_hour_of_day": 3.0, "days_since_policy_start": 0.0,
      "claims_in_last_7_days": 12.0, "location_entropy_score": 0.08,
      "is_first_claim": 1.0}, True),
    # Extreme velocity burst (14 claims in last 7 days)
    ({"claim_hour_of_day": 2.0, "days_since_policy_start": 0.5,
      "claims_in_last_7_days": 14.0, "location_entropy_score": 0.0,
      "is_first_claim": 0.0}, True),
    # Brand-new policy, first claim, zero location entropy
    ({"claim_hour_of_day": 0.0, "days_since_policy_start": 0.3,
      "claims_in_last_7_days": 6.0, "location_entropy_score": 0.02,
      "is_first_claim": 1.0}, True),
    # ── Clear normal cases ─────────────────────────────────────────────────────
    # Daytime seasoned worker with typical pattern
    ({"claim_hour_of_day": 14.0, "days_since_policy_start": 45.0,
      "claims_in_last_7_days": 1.0, "location_entropy_score": 0.80,
      "is_first_claim": 0.0}, False),
    # Morning claim, established policy, varied zones
    ({"claim_hour_of_day": 9.0, "days_since_policy_start": 60.0,
      "claims_in_last_7_days": 0.0, "location_entropy_score": 0.75,
      "is_first_claim": 0.0}, False),
    # Afternoon, renewal-policy worker
    ({"claim_hour_of_day": 15.0, "days_since_policy_start": 90.0,
      "claims_in_last_7_days": 2.0, "location_entropy_score": 0.85,
      "is_first_claim": 0.0}, False),
    # First legitimate claim on a week-old policy
    ({"claim_hour_of_day": 11.0, "days_since_policy_start": 7.0,
      "claims_in_last_7_days": 1.0, "location_entropy_score": 0.65,
      "is_first_claim": 1.0}, False),
]


def validate_model_precision(threshold: float = PRECISION_FLOOR) -> tuple[bool, float]:
    """
    Evaluate the model against the gold-label test set.

    Returns:
        (passes: bool, precision: float)
        passes = True if precision >= threshold.

    Side effects:
        - Updates module-level `_last_precision`.
        - Activates `_rule_only_mode` and logs an alert if precision < threshold.
    """
    global _rule_only_mode, _last_precision

    model = load_or_train_model()
    tp = fp = 0

    for features, is_fraud in _GOLD_LABELS:
        score = score_features(features)
        # Classify as fraud if score > 50 (maps to hold or worse)
        predicted_fraud = score > 50
        if predicted_fraud and is_fraud:
            tp += 1
        elif predicted_fraud and not is_fraud:
            fp += 1

    total_predicted_fraud = tp + fp
    precision = round(tp / total_predicted_fraud, 4) if total_predicted_fraud > 0 else 1.0
    _last_precision = precision

    passes = precision >= threshold

    if not passes:
        _rule_only_mode = True
        logger.error(
            "[fraud_model] Precision %.2f < floor %.2f — switching to RULE-ONLY mode. "
            "Admin alert required.",
            precision, threshold,
        )
    else:
        _rule_only_mode = False
        logger.info(
            "[fraud_model] Precision validation passed: %.2f >= %.2f",
            precision, threshold,
        )

    return passes, precision


# ── Synthetic training data ───────────────────────────────────────────────────

def _generate_synthetic_data(n: int = 500, seed: int = 7) -> np.ndarray:
    """
    Generate n rows of synthetic claim-behaviour data with a 20 % anomaly rate.

    Normal rows  (80 %): daytime claims, seasoned policy, low velocity, varied zones.
    Anomalous rows (20 %): odd-hour bursts, brand-new policy, high velocity, single zone.
    """
    rng = np.random.default_rng(seed)
    n_normal = int(n * 0.80)
    n_fraud  = n - n_normal

    normal = np.column_stack([
        rng.integers(7, 22, size=n_normal).astype(float),          # hours 7-21
        rng.integers(7, 90, size=n_normal).astype(float),          # 7+ days old
        rng.integers(0, 3,  size=n_normal).astype(float),          # 0-2 this week
        rng.beta(4.0, 2.0,  size=n_normal),                        # moderate entropy
        rng.choice([0, 1],  size=n_normal, p=[0.60, 0.40]).astype(float),
    ])

    fraud = np.column_stack([
        rng.choice([0, 1, 2, 3, 22, 23], size=n_fraud).astype(float),  # odd hours
        rng.integers(0, 2, size=n_fraud).astype(float),                 # 0-1 day old
        rng.integers(5, 15, size=n_fraud).astype(float),                # 5-14 this week
        rng.beta(1.0, 3.0,  size=n_fraud),                             # low entropy
        np.ones(n_fraud, dtype=float),                                  # always first
    ])

    return np.vstack([normal, fraud])


# ── Model init ────────────────────────────────────────────────────────────────

def _train_and_save(model_path: Path) -> Pipeline:
    """Train a fresh Isolation Forest and persist it to disk."""
    X = _generate_synthetic_data()

    pipeline = Pipeline([
        ("scaler",    StandardScaler()),
        ("isoforest", IsolationForest(
            n_estimators=200,
            contamination=0.20,   # mirrors synthetic data anomaly ratio
            random_state=42,
        )),
    ])
    pipeline.fit(X)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)
    logger.info("Fraud model trained and saved → %s", model_path)
    return pipeline


def load_or_train_model() -> Pipeline:
    """
    Return the fraud-detection pipeline, loading from disk or training fresh.

    The result is cached in module-level `_cached_model` so the first warm-up
    call pays the cost; all subsequent calls are O(1).
    """
    global _cached_model
    if _cached_model is not None:
        return _cached_model

    if _MODEL_PATH.exists():
        try:
            _cached_model = joblib.load(_MODEL_PATH)
            logger.info("Fraud model loaded from %s", _MODEL_PATH)
        except Exception as exc:
            logger.warning("Failed to load fraud model (%s); retraining.", exc)
            _cached_model = _train_and_save(_MODEL_PATH)
    else:
        _cached_model = _train_and_save(_MODEL_PATH)

    return _cached_model


# ── Scoring entry-point ───────────────────────────────────────────────────────

def score_features(features: dict) -> float:
    """
    Score a claim feature dict through the Isolation Forest.

    If the model is in rule-only mode (precision degraded), returns 0.0 so the
    rule layer governs entirely — the blending in fraud_scoring_service.py will
    pick rule_score as the sole signal.

    The Isolation Forest `decision_function` outputs positive values for
    inliers and negative values for outliers; the typical range is roughly
    [–0.5, +0.5].  We invert and scale to a 0–100 fraud risk score:

        raw clamped to [–0.5, +0.5]
        score = (0.5 − raw) × 100
        → raw = –0.5 (max outlier) → score = 100
        → raw = +0.5 (deep inlier) → score =   0

    Returns:
        float in [0.0, 100.0].  On inference error defaults to 30.0 (neutral).
    """
    if _rule_only_mode:
        return 0.0  # rule layer governs; ML contribution neutralised

    model = load_or_train_model()
    X = np.array([[
        features.get("claim_hour_of_day",       12.0),
        features.get("days_since_policy_start", 30.0),
        features.get("claims_in_last_7_days",    0.0),
        features.get("location_entropy_score",  0.70),
        features.get("is_first_claim",           0.0),
    ]])

    try:
        raw   = float(model.decision_function(X)[0])
        raw   = max(-0.5, min(0.5, raw))
        score = round((0.5 - raw) * 100, 1)
    except Exception as exc:
        logger.warning("Fraud model inference failed (%s); defaulting to 30.", exc)
        score = 30.0

    return score

"""
Dynamic Premium Pricing Model — Suraksha Weekly (FR-3 / PRD §9)

A scikit-learn GradientBoostingRegressor pipeline trained on 500 rows of
realistic synthetic data.  Falls back to the analytic formula when the
serialised model file is unavailable.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from core.config import settings

logger = logging.getLogger(__name__)

# ── Feature contract (column order must match training matrix) ────────────────
FEATURE_NAMES: list[str] = [
    "location_risk_index",       # 0.0–1.0
    "disruption_frequency_score",# 0.0–1.0
    "hour_exposure_score",       # 0.0–1.0
    "platform_segment_factor",   # 0.85–1.15
    "trust_tier_encoded",        # 0 standard | 1 verified | 2 premium
]

# Trust-tier text → integer encoding
TRUST_TIER_ENCODING: dict[str, int] = {
    "standard":  0,
    "verified":  1,
    "premium":   2,
    "suspended": 0,  # suspended workers pay standard-tier rate
}

# Per-tier premium adjustment factor
_TRUST_ADJ: dict[int, float] = {0: 1.12, 1: 1.00, 2: 0.90}


# ── Synthetic training data ───────────────────────────────────────────────────

def _generate_synthetic_data(n: int = 500, seed: int = 42) -> tuple[np.ndarray, np.ndarray]:
    """
    Generate n rows of realistic synthetic (features, premium) training data.

    Distributions are shaped after real gig-worker patterns observed in Indian
    tier-1 metros. The analytic formula is used as the ground-truth labelling
    function, with Gaussian noise to prevent perfect fit.
    """
    rng = np.random.default_rng(seed)

    location_risk   = rng.beta(3.5, 3.0, n)          # centre ~0.54, right-skewed
    disruption_freq = rng.beta(2.5, 4.0, n)           # centre ~0.38, lower-skewed
    hour_exposure   = rng.beta(4.0, 3.0, n)           # centre ~0.57, moderate bell
    platform_factor = rng.choice(
        [0.88, 0.95, 1.00, 1.05, 1.12],
        size=n, p=[0.08, 0.20, 0.40, 0.22, 0.10],
    )
    trust_tier = rng.choice([0, 1, 2], size=n, p=[0.55, 0.30, 0.15])

    X = np.column_stack([
        location_risk, disruption_freq, hour_exposure,
        platform_factor, trust_tier.astype(float),
    ])

    # Analytic formula (same as fallback) used to compute ground-truth labels
    trust_adj = np.vectorize(_TRUST_ADJ.get)(trust_tier, 1.0)
    risk_mult = 1.0 + 0.65 * location_risk + 0.45 * disruption_freq
    exposure_mult = 1.0 + 0.35 * hour_exposure

    y = settings.PREMIUM_BASE_RATE * risk_mult * exposure_mult * platform_factor * trust_adj
    y += rng.normal(0, 7.0, n)                        # realistic noise ±₹7
    y = np.clip(y, settings.PREMIUM_FLOOR, settings.PREMIUM_CEILING)

    return X, y


# ── Model loading / training ──────────────────────────────────────────────────

_cached_model: Optional[Pipeline] = None


def _train_and_save(model_path: Path) -> Pipeline:
    """Train a fresh GBR pipeline on synthetic data and persist it to disk."""
    logger.info("Training premium model on synthetic data …")
    X, y = _generate_synthetic_data(n=500)

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("gbr", GradientBoostingRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.06,
            min_samples_leaf=4,
            subsample=0.85,
            random_state=42,
        )),
    ])
    pipeline.fit(X, y)

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipeline, model_path)
    logger.info("Premium model saved → %s", model_path)
    return pipeline


def load_or_train_model() -> Pipeline:
    """
    Return the premium-pricing pipeline, loading from disk or training fresh.

    The result is cached in-process so subsequent calls are free.
    """
    global _cached_model
    if _cached_model is not None:
        return _cached_model

    model_path = Path(settings.PREMIUM_MODEL_PATH)

    if model_path.exists():
        try:
            _cached_model = joblib.load(model_path)
            logger.info("Premium model loaded ← %s", model_path)
            return _cached_model
        except Exception as exc:
            logger.warning("Failed to load premium model (%s). Retraining.", exc)

    _cached_model = _train_and_save(model_path)
    return _cached_model


# ── Prediction ────────────────────────────────────────────────────────────────

def _formula_premium(features: dict) -> float:
    """Pure-formula fallback (identical to the synthetic labelling function)."""
    tier = int(features["trust_tier_encoded"])
    trust_adj = _TRUST_ADJ.get(tier, 1.0)
    risk_mult = 1.0 + 0.65 * features["location_risk_index"] + 0.45 * features["disruption_frequency_score"]
    exposure_mult = 1.0 + 0.35 * features["hour_exposure_score"]
    premium = (
        settings.PREMIUM_BASE_RATE
        * risk_mult
        * exposure_mult
        * features["platform_segment_factor"]
        * trust_adj
    )
    return float(np.clip(premium, settings.PREMIUM_FLOOR, settings.PREMIUM_CEILING))


def predict_premium(features: dict) -> float:
    """
    Predict the weekly base premium (standard plan) from a feature dict.

    Args:
        features: mapping of FEATURE_NAMES → float values

    Returns:
        Weekly premium in ₹ clamped to [PREMIUM_FLOOR, PREMIUM_CEILING].
    """
    try:
        model = load_or_train_model()
        X = np.array([[features[f] for f in FEATURE_NAMES]])
        raw = float(model.predict(X)[0])
        return round(float(np.clip(raw, settings.PREMIUM_FLOOR, settings.PREMIUM_CEILING)), 2)
    except Exception as exc:
        logger.warning("Model prediction failed (%s). Using formula fallback.", exc)
        return round(_formula_premium(features), 2)


# ── Per-prediction explainability ─────────────────────────────────────────────

def get_top_factors(features: dict, base_premium: float) -> list[dict]:
    """
    Return the top-3 human-readable factors driving this worker's premium.

    Uses multiplicative decomposition of the analytic formula as an explanation
    proxy — interpretable, auditable, and requires no SHAP dependency.

    Args:
        features:      dict with FEATURE_NAMES keys
        base_premium:  the computed standard-plan premium in ₹

    Returns:
        List[dict] with keys: label, impact_pct (int), score (float), direction (str)
    """
    loc   = features["location_risk_index"]
    disrt = features["disruption_frequency_score"]
    expo  = features["hour_exposure_score"]
    tier  = int(features["trust_tier_encoded"])

    factors: list[dict] = []

    # Location risk contribution: 0.65 × loc
    loc_pct = round(0.65 * loc * 100)
    loc_label = (
        "High-risk delivery zone (frequent disruptions)"   if loc >= 0.70 else
        "Moderate-risk delivery zone"                       if loc >= 0.50 else
        "Low-risk delivery zone — good for your wallet"
    )
    factors.append({"label": loc_label, "impact_pct": loc_pct, "score": round(loc, 2), "direction": "increases"})

    # Disruption frequency contribution: 0.45 × disrt
    disrt_pct = round(0.45 * disrt * 100)
    disrt_label = (
        "High disruption frequency in your area (+%d%%)" % disrt_pct if disrt >= 0.60 else
        "Moderate disruption history in your zone   (+%d%%)" % disrt_pct if disrt >= 0.35 else
        "Low disruption history — low claim pressure"
    )
    factors.append({"label": disrt_label, "impact_pct": disrt_pct, "score": round(disrt, 2), "direction": "increases"})

    # Exposure hours contribution: 0.35 × expo
    expo_pct = round(0.35 * expo * 100)
    expo_label = (
        "Extended peak-hour delivery schedule (+%d%%)" % expo_pct if expo >= 0.70 else
        "Moderate daily online hours (+%d%%)" % expo_pct           if expo >= 0.45 else
        "Short delivery hours — lower exposure"
    )
    factors.append({
        "label": expo_label,
        "impact_pct": expo_pct,
        "score": round(expo, 2),
        "direction": "increases" if expo >= 0.5 else "neutral",
    })

    # Trust tier — adds/removes flat % from premium
    if tier == 0:
        factors.append({
            "label": "New worker — building trust history (+12%)",
            "impact_pct": 12,
            "score": 0.0,
            "direction": "increases",
        })
    elif tier == 2:
        factors.append({
            "label": "Premium trust tier — loyalty discount (−10%)",
            "impact_pct": -10,
            "score": 1.0,
            "direction": "decreases",
        })

    # Sort by absolute impact, return top 3
    factors.sort(key=lambda x: abs(x["impact_pct"]), reverse=True)
    return factors[:3]

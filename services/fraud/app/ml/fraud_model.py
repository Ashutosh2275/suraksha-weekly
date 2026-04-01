"""Isolation Forest fraud model training utilities."""

from __future__ import annotations

from pathlib import Path
from typing import Any

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest


FEATURE_ORDER = [
    "hour_of_claim",
    "days_since_policy_purchased",
    "worker_claim_count_30d",
    "zone_claim_density_1h",
    "policy_activation_to_trigger_hours",
    "worker_earnings_vs_zone_avg_ratio",
    "device_change_flag",
    "beneficiary_reuse_count",
]


def generate_synthetic_claim_data(
    n_samples: int = 10_000,
    *,
    random_state: int = 42,
) -> tuple[np.ndarray, np.ndarray]:
    """Generate synthetic claim-time features with 5% anomaly labels."""

    rng = np.random.default_rng(random_state)

    hour_of_claim = rng.integers(0, 24, size=n_samples)
    days_since_policy_purchased = np.clip(rng.gamma(shape=2.4, scale=38.0, size=n_samples), 0.2, 720.0)
    worker_claim_count_30d = rng.poisson(lam=0.75, size=n_samples)
    zone_claim_density_1h = rng.poisson(lam=1.4, size=n_samples)
    policy_activation_to_trigger_hours = np.clip(rng.normal(loc=220.0, scale=110.0, size=n_samples), 0.2, 1400.0)
    worker_earnings_vs_zone_avg_ratio = np.clip(rng.normal(loc=1.0, scale=0.18, size=n_samples), 0.35, 2.2)
    device_change_flag = rng.binomial(1, 0.08, size=n_samples)
    beneficiary_reuse_count = np.clip(rng.poisson(lam=1.2, size=n_samples), 0, 20)

    features = np.column_stack(
        [
            hour_of_claim,
            days_since_policy_purchased,
            worker_claim_count_30d,
            zone_claim_density_1h,
            policy_activation_to_trigger_hours,
            worker_earnings_vs_zone_avg_ratio,
            device_change_flag,
            beneficiary_reuse_count,
        ]
    ).astype(float)

    labels = np.zeros(n_samples, dtype=int)
    anomaly_count = int(0.05 * n_samples)
    anomaly_idx = rng.choice(n_samples, size=anomaly_count, replace=False)
    labels[anomaly_idx] = 1

    # Fraud pattern 1: velocity abuse
    block_1 = anomaly_idx[: anomaly_count // 3]
    features[block_1, 2] = rng.integers(4, 12, size=len(block_1))
    features[block_1, 3] = rng.integers(6, 20, size=len(block_1))

    # Fraud pattern 2: device switching + beneficiary reuse
    block_2 = anomaly_idx[anomaly_count // 3 : (2 * anomaly_count) // 3]
    features[block_2, 6] = 1
    features[block_2, 7] = rng.integers(5, 18, size=len(block_2))

    # Fraud pattern 3: boundary timing around trigger/policy activation
    block_3 = anomaly_idx[(2 * anomaly_count) // 3 :]
    features[block_3, 1] = np.clip(rng.normal(loc=0.9, scale=0.35, size=len(block_3)), 0.05, 2.5)
    features[block_3, 4] = np.clip(rng.normal(loc=1.2, scale=0.5, size=len(block_3)), 0.05, 3.0)
    features[block_3, 0] = rng.choice([0, 1, 2, 3, 4, 23], size=len(block_3))

    return features, labels


def train_isolation_forest(
    *,
    n_samples: int = 10_000,
    random_state: int = 42,
) -> IsolationForest:
    """Train Isolation Forest on synthetic claim-time features."""

    X, _ = generate_synthetic_claim_data(n_samples=n_samples, random_state=random_state)
    model = IsolationForest(
        n_estimators=300,
        contamination=0.05,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X)
    return model


def save_model(model: IsolationForest, path: str | Path) -> None:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    payload: dict[str, Any] = {
        "model": model,
        "feature_order": FEATURE_ORDER,
    }
    joblib.dump(payload, target)


def load_model(path: str | Path) -> dict[str, Any]:
    return joblib.load(Path(path))


if __name__ == "__main__":
    model = train_isolation_forest(n_samples=10_000, random_state=42)
    save_model(model, "/models/fraud_model.pkl")

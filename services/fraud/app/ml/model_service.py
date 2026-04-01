"""Model runtime scoring wrapper with fail-open behavior."""

from __future__ import annotations

import logging
import math
from pathlib import Path
from typing import Any

import numpy as np

from app.ml.fraud_model import FEATURE_ORDER, load_model

logger = logging.getLogger(__name__)


class ModelService:
    def __init__(self, *, model_path: str = "/models/fraud_model.pkl") -> None:
        self.model_path = model_path
        self._model_bundle: dict[str, Any] | None = None
        self._load_error: bool = False

    def load_model(self) -> dict[str, Any] | None:
        if self._model_bundle is not None:
            return self._model_bundle
        if self._load_error:
            return None

        try:
            if not Path(self.model_path).exists():
                raise FileNotFoundError(f"Model file not found at {self.model_path}")
            self._model_bundle = load_model(self.model_path)
            return self._model_bundle
        except Exception as exc:  # pragma: no cover - defensive branch
            self._load_error = True
            logger.warning("ML model load failed, falling back to neutral score: %s", exc)
            return None

    def score(self, features: dict[str, float]) -> dict[str, Any]:
        bundle = self.load_model()
        if not bundle:
            return {
                "ml_score": 0.5,
                "anomaly": False,
                "model_version": "fail-open",
            }

        model = bundle["model"]
        feature_order = bundle.get("feature_order", FEATURE_ORDER)
        vector = np.array([[float(features.get(name, 0.0)) for name in feature_order]], dtype=float)

        decision = float(model.decision_function(vector)[0])
        predicted = int(model.predict(vector)[0])

        # Convert decision function to a bounded anomaly-oriented score.
        ml_score = 1.0 / (1.0 + math.exp(3.0 * decision))
        return {
            "ml_score": max(0.0, min(1.0, ml_score)),
            "anomaly": predicted == -1,
            "model_version": "iforest-v1",
        }

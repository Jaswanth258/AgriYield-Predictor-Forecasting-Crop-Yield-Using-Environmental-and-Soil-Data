"""
Prediction service — loads trained model and runs inference.
"""
import json
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

MODELS_DIR = Path(__file__).parent.parent / "models"
_pipeline = None
_meta = None


def _load():
    global _pipeline, _meta
    model_path = MODELS_DIR / "best_model.pkl"
    meta_path = MODELS_DIR / "meta.json"

    if not model_path.exists():
        raise FileNotFoundError(
            "Model not found. Run `python -m app.train` first."
        )

    _pipeline = joblib.load(model_path)
    with open(meta_path) as f:
        _meta = json.load(f)


def get_meta():
    if _meta is None:
        _load()
    return _meta


def predict(
    N: float,
    P: float,
    K: float,
    temperature: float,
    humidity: float,
    ph: float,
    rainfall: float,
    soil_type: str,
    label: str,
) -> dict:
    if _pipeline is None:
        _load()

    row = pd.DataFrame([{
        "N": N, "P": P, "K": K,
        "temperature": temperature,
        "humidity": humidity,
        "ph": ph,
        "rainfall": rainfall,
        "soil_type": soil_type,
        "label": label,
    }])

    prediction = float(_pipeline.predict(row)[0])
    prediction = max(0.0, round(prediction, 3))

    # Confidence interval via bootstrap (RF) or ±10% heuristic
    model = _pipeline.named_steps["model"]
    ci_lower, ci_upper = None, None
    try:
        if hasattr(model, "estimators_"):
            X_trans = _pipeline.named_steps["preprocessor"].transform(row)
            preds = np.array([est.predict(X_trans)[0] for est in model.estimators_])
            ci_lower = round(float(np.percentile(preds, 5)), 3)
            ci_upper = round(float(np.percentile(preds, 95)), 3)
    except Exception:
        ci_lower = round(prediction * 0.90, 3)
        ci_upper = round(prediction * 1.10, 3)

    return {
        "yield_t_ha": prediction,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "model_used": _meta.get("best_model", "unknown"),
    }


def batch_predict(records: list[dict]) -> list[dict]:
    """Predict for a list of input dicts."""
    return [predict(**r) for r in records]

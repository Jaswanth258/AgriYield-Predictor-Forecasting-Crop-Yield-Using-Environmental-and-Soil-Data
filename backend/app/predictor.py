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
_state_defaults = None
_crop_recommender = None

def _load():
    global _pipeline, _meta, _crop_recommender
    model_path = MODELS_DIR / "best_model.pkl"
    meta_path = MODELS_DIR / "meta.json"
    recommender_path = MODELS_DIR / "crop_recommender.pkl"

    if not model_path.exists():
        raise FileNotFoundError(
            "Model not found. Run `python -m app.train` first."
        )

    _pipeline = joblib.load(model_path)
    with open(meta_path) as f:
        _meta = json.load(f)
    if recommender_path.exists():
        _crop_recommender = joblib.load(recommender_path)


def _load_state_defaults():
    global _state_defaults
    soil = pd.read_csv(MODELS_DIR.parent / "data" / "state_soil.csv")
    weather = pd.read_csv(MODELS_DIR.parent / "data" / "state_weather.csv")
    
    # average weather per state
    weather = weather.groupby("state").mean(numeric_only=True).reset_index()
    
    # merge
    merged = pd.merge(soil, weather, on="state")
    
    _state_defaults = {}
    for _, row in merged.iterrows():
        _state_defaults[row["state"]] = {
            "N": row["N"],
            "P": row["P"],
            "K": row["K"],
            "ph": row["pH"],
            "temperature": row["avg_temp_c"],
            "rainfall": row["total_rainfall_mm"],
            "humidity": row["avg_humidity_percent"],
        }


def get_state_defaults(state: str) -> dict:
    if _state_defaults is None:
        _load_state_defaults()
    return _state_defaults.get(state, {})


def get_meta():
    if _meta is None:
        _load()
    return _meta


def predict(
    state: str,
    district: str,
    area_ha: float,
    label: str,
    N: Optional[float] = None,
    P: Optional[float] = None,
    K: Optional[float] = None,
    temperature: Optional[float] = None,
    humidity: Optional[float] = None,
    ph: Optional[float] = None,
    rainfall: Optional[float] = None,
    soil_type: Optional[str] = None,
    mode: str = "manual",
) -> dict:
    if _pipeline is None:
        _load()

    defaults = get_state_defaults(state)
    
    _N = N if N is not None else defaults.get("N", 0)
    _P = P if P is not None else defaults.get("P", 0)
    _K = K if K is not None else defaults.get("K", 0)
    _temperature = temperature if temperature is not None else defaults.get("temperature", 0)
    _humidity = humidity if humidity is not None else defaults.get("humidity", 0)
    _ph = ph if ph is not None else defaults.get("ph", 6.5)
    _rainfall = rainfall if rainfall is not None else defaults.get("rainfall", 0)
    
    if soil_type is None:
        from app.dataset import _ph_to_soil_type
        _soil_type = _ph_to_soil_type(_ph)
    else:
        _soil_type = soil_type

    row = pd.DataFrame([{
        "state": state,
        "district": district,
        "N": _N, "P": _P, "K": _K,
        "temperature": _temperature,
        "humidity": _humidity,
        "ph": _ph,
        "rainfall": _rainfall,
        "soil_type": _soil_type,
        "label": label,
    }], columns=["state", "district", "N", "P", "K", "temperature", "humidity", "ph", "rainfall", "soil_type", "label"])

    model_used = _meta.get("best_model", "unknown")
    crop_benchmarks = _meta.get("crop_benchmarks", {})

    ci_lower, ci_upper = None, None

    if mode == "auto" and label in crop_benchmarks:
        prediction = float(crop_benchmarks[label]["median_yield"])
        model_used = "Historical Average (FAO Baseline)"
        ci_lower = round(prediction * 0.90, 3)
        ci_upper = round(prediction * 1.10, 3)
    else:
        prediction = float(_pipeline.predict(row)[0])
        prediction = round(prediction, 3)
        
        if prediction <= 0.0:
            if label in crop_benchmarks:
                prediction = float(crop_benchmarks[label]["median_yield"])
                model_used = f"{model_used} (Fallback to Avg)"
                ci_lower = round(prediction * 0.90, 3)
                ci_upper = round(prediction * 1.10, 3)
            else:
                prediction = 0.0
                ci_lower = 0.0
                ci_upper = 0.0
        else:
            # Confidence interval via bootstrap (RF) or ±10% heuristic
            model = _pipeline.named_steps["model"]
            try:
                if hasattr(model, "estimators_"):
                    X_trans = _pipeline.named_steps["preprocessor"].transform(row)
                    preds = np.array([est.predict(X_trans)[0] for est in model.estimators_])
                    ci_lower = round(float(np.percentile(preds, 5)), 3)
                    ci_upper = round(float(np.percentile(preds, 95)), 3)
                else:
                    ci_lower = round(prediction * 0.90, 3)
                    ci_upper = round(prediction * 1.10, 3)
            except Exception:
                ci_lower = round(prediction * 0.90, 3)
                ci_upper = round(prediction * 1.10, 3)

    total_yield = round(prediction * area_ha, 3)

    # ------------------
    # Yield Enhancement
    # ------------------
    enhancement = None
    if label in crop_benchmarks:
        benchmark = crop_benchmarks[label]
        
        needs_enhancement = False
        if prediction < benchmark["median_yield"]:
            needs_enhancement = True
        elif mode == "manual":
            # Check if their manual inputs are significantly below optimal
            if (_N < benchmark["optimal_N"] * 0.85) or (_P < benchmark["optimal_P"] * 0.85) or (_K < benchmark["optimal_K"] * 0.85):
                needs_enhancement = True

        if needs_enhancement:
            # If yield fell back to median but needs enhancement due to manual NPK, adjust the baseline slightly down visually if desired, 
            # but user just wants the suggestion. 
            display_yield = prediction if prediction < benchmark["median_yield"] else round(prediction * 0.9, 3)
            
            enhancement = {
                "is_poor": True,
                "recommended_N": benchmark["optimal_N"],
                "recommended_P": benchmark["optimal_P"],
                "recommended_K": benchmark["optimal_K"],
                "message": f"Your inputs indicate a potential yield of ({display_yield} t/ha). To ensure the typical average ({benchmark['median_yield']} t/ha) for {label}, consider adjusting NPK towards these optimal values."
            }

    return {
        "yield_t_ha": prediction,
        "total_yield_tonnes": total_yield,
        "ci_lower": ci_lower,
        "ci_upper": ci_upper,
        "model_used": model_used,
        "enhancement": enhancement
    }

def recommend_crop(
    N: float, P: float, K: float,
    temperature: float, humidity: float,
    ph: float, rainfall: float
) -> list[str]:
    """Returns top 3 recommended crops based on environmental features."""
    if _crop_recommender is None:
        _load()
    if _crop_recommender is None:
        return []

    row = pd.DataFrame([{
        "N": N, "P": P, "K": K,
        "temperature": temperature,
        "humidity": humidity,
        "ph": ph,
        "rainfall": rainfall
    }], columns=["N", "P", "K", "temperature", "humidity", "ph", "rainfall"])
    
    probs = _crop_recommender.predict_proba(row)[0]
    classes = _crop_recommender.classes_
    top_indices = np.argsort(probs)[::-1][:3]
    return [classes[i] for i in top_indices]


def batch_predict(records: list[dict]) -> list[dict]:
    """Predict for a list of input dicts."""
    return [predict(**r) for r in records]

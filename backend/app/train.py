"""
Model training pipeline for AgriYield Predictor.
Trains Random Forest, XGBoost, LightGBM, and Linear Regression.
Saves best model + preprocessor via joblib.
"""
import json
import os
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import LabelEncoder, OneHotEncoder, StandardScaler

try:
    import xgboost as xgb
    HAS_XGB = True
except ImportError:
    HAS_XGB = False

try:
    import lightgbm as lgb
    HAS_LGB = True
except ImportError:
    HAS_LGB = False

from app.dataset import get_dataset

warnings.filterwarnings("ignore")

MODELS_DIR = Path("models")
MODELS_DIR.mkdir(exist_ok=True)


def build_preprocessor(categorical_cols, numeric_cols):
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols),
        ]
    )


def evaluate(name, y_true, y_pred):
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    print(f"  {name:<20} RMSE={rmse:.4f}  MAE={mae:.4f}  R²={r2:.4f}")
    return {"rmse": round(rmse, 4), "mae": round(mae, 4), "r2": round(r2, 4)}


def train():
    print("Loading real dataset...")
    df = get_dataset()

    feature_cols = ["state", "district", "N", "P", "K", "temperature", "humidity", "ph", "rainfall", "soil_type", "label"]
    target_col = "yield_t_ha"

    X = df[feature_cols].copy()
    y = df[target_col].values

    numeric_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    categorical_cols = ["state", "district", "soil_type", "label"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    preprocessor = build_preprocessor(categorical_cols, numeric_cols)

    candidates = {
        "RandomForest": RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
        "Ridge":        Ridge(alpha=1.0),
    }
    if HAS_XGB:
        candidates["XGBoost"] = xgb.XGBRegressor(
            n_estimators=300, learning_rate=0.05, max_depth=6,
            random_state=42, tree_method="hist", verbosity=0
        )
    if HAS_LGB:
        candidates["LightGBM"] = lgb.LGBMRegressor(
            n_estimators=300, learning_rate=0.05, num_leaves=63,
            random_state=42, verbose=-1
        )

    best_name, best_r2, best_pipeline = None, -np.inf, None
    all_metrics = {}

    print("\nModel evaluation on test set:")
    for name, model in candidates.items():
        pipe = Pipeline([("preprocessor", preprocessor), ("model", model)])
        pipe.fit(X_train, y_train)
        y_pred = pipe.predict(X_test)
        metrics = evaluate(name, y_test, y_pred)
        all_metrics[name] = metrics
        if metrics["r2"] > best_r2:
            best_r2 = metrics["r2"]
            best_name = name
            best_pipeline = pipe

    print(f"\nBest model: {best_name} (R²={best_r2:.4f})")

    # Save best pipeline
    joblib.dump(best_pipeline, MODELS_DIR / "best_model.pkl")
    print(f"Saved best model → models/best_model.pkl")

    # Compute top crops per state
    top_crops_per_state = {}
    for state in df["state"].unique():
        state_df = df[df["state"] == state]
        top_crops = state_df["label"].value_counts().head(5).index.tolist()
        top_crops_per_state[state] = top_crops

    # ---------------------------------------------------------
    # 1. Train Crop Recommender (Classification)
    # ---------------------------------------------------------
    print("\nTraining Crop Recommender (Random Forest Classifier)...")
    from sklearn.ensemble import RandomForestClassifier
    
    rc_features = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    X_rc = df[rc_features]
    y_rc = df["label"]
    
    rc_pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", RandomForestClassifier(n_estimators=100, random_state=42, n_jobs=-1, max_depth=10))
    ])
    rc_pipeline.fit(X_rc, y_rc)
    
    joblib.dump(rc_pipeline, MODELS_DIR / "crop_recommender.pkl")
    print("Saved crop recommender → models/crop_recommender.pkl")
    
    # ---------------------------------------------------------
    # 2. Compute Crop Benchmarks (Yield Enhancement)
    # ---------------------------------------------------------
    print("\nComputing Crop Benchmarks...")
    crop_benchmarks = {}
    for crop in df["label"].unique():
        crop_df = df[df["label"] == crop]
        median_yield = float(crop_df["yield_t_ha"].median())
        
        # Optimal N, P, K from top 20% yielding samples
        crop_data = df[df["label"] == crop]
        if len(crop_data) > 0:
            top_quarter = crop_data[crop_data["yield_t_ha"] >= crop_data["yield_t_ha"].quantile(0.75)]
            if len(top_quarter) == 0:
                top_quarter = crop_data
                
            crop_benchmarks[crop] = {
                "median_yield": round(crop_data["yield_t_ha"].median(), 3),
                "top_yield": round(top_quarter["yield_t_ha"].median(), 3),
                "optimal_N": round(top_quarter["N"].median(), 1),
                "optimal_P": round(top_quarter["P"].median(), 1),
                "optimal_K": round(top_quarter["K"].median(), 1),
                "optimal_temp": round(top_quarter["temperature"].median(), 1),
                "optimal_humidity": round(top_quarter["humidity"].median(), 1),
                "optimal_ph": round(top_quarter["ph"].median(), 2),
                "optimal_rainfall": round(top_quarter["rainfall"].median(), 0),
            }

    # Save feature column info
    meta = {
        "feature_cols": feature_cols,
        "numeric_cols": numeric_cols,
        "categorical_cols": categorical_cols,
        "target_col": target_col,
        "best_model": best_name,
        "metrics": all_metrics,
        "crop_list": sorted(df["label"].unique().tolist()),
        "soil_types": sorted(df["soil_type"].unique().tolist()),
        "state_list": sorted(df["state"].unique().tolist()),
        "region_hierarchy": {state: sorted(df[df.state == state]["district"].unique().tolist()) for state in df["state"].unique()},
        "top_crops": top_crops_per_state,
        "crop_benchmarks": crop_benchmarks,
    }
    with open(MODELS_DIR / "meta.json", "w") as f:
        json.dump(meta, f, indent=2)
    print("Saved model metadata → models/meta.json")

    # Compute and save SHAP feature importances (RF or tree-based)
    try:
        import shap
        print("\nComputing SHAP values (sample of 200)...")
        X_transformed = best_pipeline.named_steps["preprocessor"].transform(X_test[:200])
        inner_model = best_pipeline.named_steps["model"]

        if hasattr(inner_model, "feature_importances_"):
            explainer = shap.TreeExplainer(inner_model)
            shap_values = explainer.shap_values(X_transformed)
            feature_names = (
                numeric_cols
                + best_pipeline.named_steps["preprocessor"]
                .named_transformers_["cat"]
                .get_feature_names_out(categorical_cols)
                .tolist()
            )
            importance_df = pd.DataFrame({
                "feature": feature_names,
                "importance": np.abs(shap_values).mean(axis=0)
            }).sort_values("importance", ascending=False).head(15)
            importance_df.to_csv(MODELS_DIR / "shap_importance.csv", index=False)
            print("Saved SHAP importances → models/shap_importance.csv")
    except Exception as e:
        print(f"SHAP skipped: {e}")

    return best_pipeline, meta


if __name__ == "__main__":
    train()

"""
EDA utilities — generate chart data for the React frontend.
"""
import json
from pathlib import Path

import numpy as np
import pandas as pd

from app.dataset import get_dataset

_df = None


def get_df() -> pd.DataFrame:
    global _df
    if _df is None:
        _df = get_dataset()
    return _df


def yield_by_crop() -> list[dict]:
    df = get_df()
    stats = (
        df.groupby("label")["yield_t_ha"]
        .agg(["mean", "std", "min", "max"])
        .reset_index()
        .rename(columns={"mean": "avg_yield", "std": "std_yield",
                         "min": "min_yield", "max": "max_yield"})
        .sort_values("avg_yield", ascending=False)
    )
    return stats.round(3).to_dict(orient="records")


def correlation_matrix() -> dict:
    df = get_df()
    numeric = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "yield_t_ha"]
    corr = df[numeric].corr().round(3)
    return {
        "columns": numeric,
        "matrix": corr.values.tolist(),
    }


def feature_distributions() -> dict:
    df = get_df()
    numeric = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall", "yield_t_ha"]
    result = {}
    for col in numeric:
        counts, bins = np.histogram(df[col].dropna(), bins=20)
        result[col] = {
            "bins": [round(b, 2) for b in bins.tolist()],
            "counts": counts.tolist(),
            "mean": round(float(df[col].mean()), 3),
            "std": round(float(df[col].std()), 3),
        }
    return result


def scatter_yield_vs_feature(feature: str) -> list[dict]:
    df = get_df()
    if feature not in df.columns:
        return []
    sample = df[[feature, "yield_t_ha", "label"]].dropna().sample(
        n=min(500, len(df)), random_state=1
    )
    return sample.rename(columns={feature: "x", "yield_t_ha": "y"}).to_dict(orient="records")


def shap_importances() -> list[dict]:
    path = Path(__file__).parent.parent / "models" / "shap_importance.csv"
    if not path.exists():
        return []
    df = pd.read_csv(path)
    return df.head(12).to_dict(orient="records")

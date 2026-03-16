"""
Real-data loader and merger for AgriYield Predictor.

Sources:
  - crop_yield.csv       : Historical crop yield + NPK + basic weather per district/year
                           (50 k rows, 1966–2017, crops: rice/maize/chickpea/cotton)
  - state_soil.csv       : State-level N, P, K, pH baselines (30 Indian states)
  - state_weather.csv    : State-level annual avg temp, rainfall, humidity (1997–2020)
  - faostat.csv          : FAO India yield data (supplementary reference)

Merge strategy:
  1. Base: crop_yield.csv — already has N/P/K, temp, humidity, pH, rainfall per row.
  2. Enrich with state_weather.csv on (state, year) — replaces temperature/rainfall/humidity
     with actual observed values where available (1997–2020).
  3. Fallback soil N/P/K/pH from state_soil.csv where values are zero/missing.
  4. Convert yield kg/ha → t/ha.
  5. Derive soil_type label from pH.
  6. Cap extreme outliers at 99th percentile per crop.
"""

from pathlib import Path
import numpy as np
import pandas as pd

DATA_DIR = Path(__file__).parent.parent / "data"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _ph_to_soil_type(ph: float) -> str:
    if ph < 5.5:
        return "peaty"
    elif ph < 6.0:
        return "sandy"
    elif ph < 6.8:
        return "loamy"
    elif ph < 7.5:
        return "silty"
    elif ph < 8.0:
        return "chalky"
    else:
        return "clay"


# ---------------------------------------------------------------------------
# Individual loaders
# ---------------------------------------------------------------------------

def _load_crop_yield() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "crop_yield.csv")
    df.columns = df.columns.str.strip()
    df = df.rename(columns={
        "State Name":      "state",
        "Dist Name":       "district",
        "Crop":            "label",
        "Area_ha":         "area_ha",
        "Yield_kg_per_ha": "yield_kg_ha",
        "N_req_kg_per_ha": "N",
        "P_req_kg_per_ha": "P",
        "K_req_kg_per_ha": "K",
        "Temperature_C":   "temperature",
        "Humidity_%":      "humidity",
        "pH":              "ph",
        "Rainfall_mm":     "rainfall",
        "Year":            "year",
    })
    df["label"] = df["label"].str.strip().str.lower()
    df["state"] = df["state"].str.strip()
    return df


def _load_state_weather() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "state_weather.csv")
    df.columns = df.columns.str.strip()
    df = df.rename(columns={
        "avg_temp_c":           "wx_temp",
        "total_rainfall_mm":    "wx_rainfall",
        "avg_humidity_percent": "wx_humidity",
    })
    df["state"] = df["state"].str.strip()
    return df


def _load_state_soil() -> pd.DataFrame:
    df = pd.read_csv(DATA_DIR / "state_soil.csv")
    df.columns = df.columns.str.lstrip("\ufeff").str.strip()
    df = df.rename(columns={"N": "soil_N", "P": "soil_P", "K": "soil_K", "pH": "soil_ph"})
    df["state"] = df["state"].str.strip()
    return df


# ---------------------------------------------------------------------------
# Main merge & clean pipeline
# ---------------------------------------------------------------------------

def build_dataset() -> pd.DataFrame:
    df   = _load_crop_yield()
    wx   = _load_state_weather()
    soil = _load_state_soil()

    # 1. Merge actual observed weather (1997–2020) where available
    df = df.merge(wx, on=["state", "year"], how="left")
    # Cast to float before assignment to avoid pandas dtype incompatibility
    for base, wx_col in [("temperature", "wx_temp"), ("rainfall", "wx_rainfall"), ("humidity", "wx_humidity")]:
        df[base] = df[base].astype(float)
        has = df[wx_col].notna()
        df.loc[has, base] = df.loc[has, wx_col].values
    df.drop(columns=["wx_temp", "wx_rainfall", "wx_humidity"], inplace=True)

    # 2. Merge state soil baselines as fallback
    df = df.merge(soil, on="state", how="left")
    for col, scol in [("N", "soil_N"), ("P", "soil_P"), ("K", "soil_K"), ("ph", "soil_ph")]:
        df[col] = df[col].astype(float)
        mask = df[col].isna() | (df[col] == 0)
        df.loc[mask, col] = df.loc[mask, scol].values
    df.drop(columns=["soil_N", "soil_P", "soil_K", "soil_ph"], inplace=True)

    # 3. Convert yield kg/ha → t/ha
    df["yield_t_ha"] = (df["yield_kg_ha"] / 1000).round(4)

    # 4. Derive soil_type from pH
    df["soil_type"] = df["ph"].apply(_ph_to_soil_type)

    # 5. Drop rows with NaN in required columns
    required = ["N", "P", "K", "temperature", "humidity", "ph",
                "rainfall", "soil_type", "label", "yield_t_ha"]
    df = df.dropna(subset=required)

    # 6. Remove extreme outliers per crop (cap at 99th percentile, floor at 10 kg/ha)
    uppers = df.groupby("label")["yield_t_ha"].transform("quantile", 0.99)
    df = df[(df["yield_t_ha"] >= 0.01) & (df["yield_t_ha"] <= uppers)].reset_index(drop=True)

    # 7. Keep only useful columns
    keep = ["year", "state", "district", "label", "area_ha",
            "N", "P", "K", "temperature", "humidity", "ph",
            "rainfall", "soil_type", "yield_t_ha"]
    df = df[[c for c in keep if c in df.columns]].copy()

    return df.reset_index(drop=True)


def get_dataset() -> pd.DataFrame:
    """Process-level cache — builds once."""
    if not hasattr(get_dataset, "_cache"):
        get_dataset._cache = build_dataset()
    return get_dataset._cache


if __name__ == "__main__":
    df = build_dataset()
    print(f"Final dataset — shape: {df.shape}")
    print("Crops :", sorted(df["label"].unique()))
    print("States:", sorted(df["state"].unique()))
    print(df["yield_t_ha"].describe().round(3))
    print(df.head(3).to_string())

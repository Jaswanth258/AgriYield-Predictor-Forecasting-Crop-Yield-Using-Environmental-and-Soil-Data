"""
AgriYield Predictor — FastAPI Backend
"""
import os
import io
import csv
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app import predictor, eda

app = FastAPI(
    title="AgriYield Predictor API",
    description="Predicts crop yield from environmental and soil parameters.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_model_ready = False


@app.on_event("startup")
async def startup_event():
    global _model_ready
    models_path = Path("models/best_model.pkl")
    if not models_path.exists():
        print("Training model on startup (first run)...")
        try:
            from app.train import train
            train()
            _model_ready = True
        except Exception as e:
            print(f"Training failed: {e}")
    else:
        _model_ready = True


# ─── Schema ─────────────────────────────────────────────────────────────────

class PredictRequest(BaseModel):
    N: float = Field(..., ge=0, le=300, description="Nitrogen content (kg/ha)")
    P: float = Field(..., ge=0, le=150, description="Phosphorus content (kg/ha)")
    K: float = Field(..., ge=0, le=200, description="Potassium content (kg/ha)")
    temperature: float = Field(..., ge=-10, le=55, description="Temperature (°C)")
    humidity: float = Field(..., ge=0, le=100, description="Humidity (%)")
    ph: float = Field(..., ge=0, le=14, description="Soil pH")
    rainfall: float = Field(..., ge=0, le=4000, description="Rainfall (mm)")
    soil_type: str = Field(..., description="Soil type")
    label: str = Field(..., description="Crop type")


class PredictResponse(BaseModel):
    yield_t_ha: float
    ci_lower: Optional[float]
    ci_upper: Optional[float]
    model_used: str
    unit: str = "tonnes per hectare"


# ─── Endpoints ───────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"message": "AgriYield Predictor API is running", "model_ready": _model_ready}


@app.get("/health")
def health():
    return {"status": "ok", "model_ready": _model_ready}


@app.get("/meta")
def get_meta():
    try:
        return predictor.get_meta()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        result = predictor.predict(
            N=req.N, P=req.P, K=req.K,
            temperature=req.temperature,
            humidity=req.humidity,
            ph=req.ph,
            rainfall=req.rainfall,
            soil_type=req.soil_type,
            label=req.label,
        )
        return {**result, "unit": "tonnes per hectare"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    """Upload a CSV file with columns matching PredictRequest for batch prediction."""
    content = await file.read()
    try:
        reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
        records = []
        for row in reader:
            records.append({
                "N": float(row["N"]),
                "P": float(row["P"]),
                "K": float(row["K"]),
                "temperature": float(row["temperature"]),
                "humidity": float(row["humidity"]),
                "ph": float(row["ph"]),
                "rainfall": float(row["rainfall"]),
                "soil_type": row["soil_type"],
                "label": row["label"],
            })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")

    try:
        results = predictor.batch_predict(records)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {"count": len(results), "predictions": results}


@app.get("/eda/yield-by-crop")
def eda_yield_by_crop():
    return eda.yield_by_crop()


@app.get("/eda/correlation")
def eda_correlation():
    return eda.correlation_matrix()


@app.get("/eda/distributions")
def eda_distributions():
    return eda.feature_distributions()


@app.get("/eda/scatter/{feature}")
def eda_scatter(feature: str):
    allowed = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    if feature not in allowed:
        raise HTTPException(status_code=400, detail=f"Feature must be one of {allowed}")
    return eda.scatter_yield_vs_feature(feature)


@app.get("/eda/shap")
def eda_shap():
    return eda.shap_importances()


@app.post("/train")
def trigger_training(background_tasks: BackgroundTasks):
    """Retrain the model in the background."""
    def _train():
        from app.train import train
        train()

    background_tasks.add_task(_train)
    return {"message": "Training started in background"}

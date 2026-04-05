"""
AgriYield Predictor — FastAPI Backend
"""
import os
import io
import csv
import requests
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, BackgroundTasks
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
    state: str = Field(..., description="Region (State)")
    district: str = Field(..., description="District Name")
    area_ha: float = Field(..., gt=0, description="Area in Hectares")
    label: str = Field(..., description="Crop type")
    N: Optional[float] = Field(None, ge=0, le=300, description="Nitrogen content (kg/ha)")
    P: Optional[float] = Field(None, ge=0, le=150, description="Phosphorus content (kg/ha)")
    K: Optional[float] = Field(None, ge=0, le=200, description="Potassium content (kg/ha)")
    temperature: Optional[float] = Field(None, ge=-10, le=55, description="Temperature (°C)")
    humidity: Optional[float] = Field(None, ge=0, le=100, description="Humidity (%)")
    ph: Optional[float] = Field(None, ge=0, le=14, description="Soil pH")
    rainfall: Optional[float] = Field(None, ge=0, le=4000, description="Rainfall (mm)")
    soil_type: Optional[str] = Field(None, description="Soil type")
    mode: Optional[str] = "manual"


class PredictResponse(BaseModel):
    yield_t_ha: float
    total_yield_tonnes: float
    ci_lower: Optional[float]
    ci_upper: Optional[float]
    model_used: str
    unit: str = "tonnes per hectare"
    enhancement: Optional[dict] = None

class RecommendCropRequest(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float
    rainfall: float

class RecommendCropResponse(BaseModel):
    recommended_crops: list[str]


# ─── Endpoints ───────────────────────────────────────────────────────────────

api_router = APIRouter()


@api_router.get("/")
def root():
    return {"message": "AgriYield Predictor API is running", "model_ready": _model_ready}


@api_router.get("/health")
def health():
    return {"status": "ok", "model_ready": _model_ready}


@api_router.get("/meta")
def get_meta():
    try:
        return predictor.get_meta()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))


@api_router.get("/defaults/{state}")
def get_state_defaults(state: str):
    try:
        defaults = predictor.get_state_defaults(state)
        meta = predictor.get_meta()
        top_crops = meta.get("top_crops", {}).get(state, [])
        return {"defaults": defaults, "top_crops": top_crops}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/historical-reference")
def get_historical_reference(state: str, district: str, crop: str, limit: int = 5):
    try:
        from app.dataset import get_dataset
        df = get_dataset()
        
        mask = (df["state"].str.lower().str.strip() == state.lower().strip()) & (df["label"].str.lower().str.strip() == crop.lower().strip())
        filtered = df[mask]
        
        dist_mask = filtered["district"].str.lower().str.strip() == district.lower().strip()
        if len(filtered[dist_mask]) > 0:
            # Prefer district-level match if we have any rows
            filtered = filtered[dist_mask]
            
        filtered = filtered[["year", "yield_t_ha", "N", "P", "K", "rainfall", "temperature", "humidity"]]
        filtered = filtered.sort_values("year", ascending=False).head(limit)
        
        # Round the values for cleaner display
        filtered = filtered.round(2)
        records = filtered.to_dict(orient="records")
        
        return {"records": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def log_prediction(req: PredictRequest, res: dict):
    csv_path = Path("data/user_predictions.csv")
    # ensure data dir exists
    csv_path.parent.mkdir(exist_ok=True, parents=True)
    file_exists = csv_path.exists()
    
    with open(csv_path, mode="a", newline="", encoding="utf-8") as f:
        fieldnames = [
            "timestamp", "state", "district", "area_ha", "label", "N", "P", "K", 
            "temperature", "humidity", "ph", "rainfall", "soil_type", 
            "predicted_yield_t_ha", "total_yield_tonnes"
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        if not file_exists:
            writer.writeheader()
        
        writer.writerow({
            "timestamp": datetime.now().isoformat(),
            "state": req.state,
            "district": req.district,
            "area_ha": req.area_ha,
            "label": req.label,
            "N": req.N, "P": req.P, "K": req.K,
            "temperature": req.temperature,
            "humidity": req.humidity,
            "ph": req.ph,
            "rainfall": req.rainfall,
            "soil_type": req.soil_type,
            "predicted_yield_t_ha": res["yield_t_ha"],
            "total_yield_tonnes": res["total_yield_tonnes"],
        })


@api_router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    try:
        result = predictor.predict(
            state=req.state,
            district=req.district,
            area_ha=req.area_ha,
            label=req.label,
            N=req.N, P=req.P, K=req.K,
            temperature=req.temperature,
            humidity=req.humidity,
            ph=req.ph,
            rainfall=req.rainfall,
            soil_type=req.soil_type,
            mode=req.mode,
        )
        log_prediction(req, result)
        return {**result, "unit": "tonnes per hectare"}
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/recommend-crop", response_model=RecommendCropResponse)
def recommend_crop_api(req: RecommendCropRequest):
    try:
        crops = predictor.recommend_crop(
            N=req.N, P=req.P, K=req.K,
            temperature=req.temperature,
            humidity=req.humidity,
            ph=req.ph,
            rainfall=req.rainfall
        )
        return {"recommended_crops": crops}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/live-weather")
def get_live_weather(state: str, district: str):
    try:
        # Geocode the district
        geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={district}&count=1&language=en&format=json"
        geo_res = requests.get(geo_url).json()
        
        if not geo_res.get("results"):
            # Fallback to state if district not found
            geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={state}&count=1&language=en&format=json"
            geo_res = requests.get(geo_url).json()
            if not geo_res.get("results"):
                raise HTTPException(status_code=404, detail=f"Could not find coordinates for {district}, {state}")
            
        lat = geo_res["results"][0]["latitude"]
        lon = geo_res["results"][0]["longitude"]
        
        # Get live current weather metrics
        weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,precipitation"
        weather_res = requests.get(weather_url).json()
        
        current = weather_res.get("current", {})
        
        return {
            "temperature": current.get("temperature_2m", 25.0),
            "humidity": current.get("relative_humidity_2m", 50.0),
            "rainfall": current.get("precipitation", 0.0) * 100, # Approx scaling 
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch live weather: {str(e)}")


@api_router.post("/predict/batch")
async def predict_batch(file: UploadFile = File(...)):
    """Upload a CSV file with columns matching PredictRequest for batch prediction."""
    content = await file.read()
    try:
        reader = csv.DictReader(io.StringIO(content.decode("utf-8")))
        records = []
        for row in reader:
            records.append({
                "state": row["state"],
                "district": row.get("district", "Unknown"),
                "area_ha": float(row["area_ha"]),
                "N": float(row["N"]) if row.get("N") else None,
                "P": float(row["P"]) if row.get("P") else None,
                "K": float(row["K"]) if row.get("K") else None,
                "temperature": float(row["temperature"]) if row.get("temperature") else None,
                "humidity": float(row["humidity"]) if row.get("humidity") else None,
                "ph": float(row["ph"]) if row.get("ph") else None,
                "rainfall": float(row["rainfall"]) if row.get("rainfall") else None,
                "soil_type": row.get("soil_type") or None,
                "label": row["label"],
            })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")

    try:
        results = predictor.batch_predict(records)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {"count": len(results), "predictions": results}


@api_router.get("/eda/yield-by-crop")
def eda_yield_by_crop():
    return eda.yield_by_crop()


@api_router.get("/eda/correlation")
def eda_correlation():
    return eda.correlation_matrix()


@api_router.get("/eda/distributions")
def eda_distributions():
    return eda.feature_distributions()


@api_router.get("/eda/scatter/{feature}")
def eda_scatter(feature: str):
    allowed = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
    if feature not in allowed:
        raise HTTPException(status_code=400, detail=f"Feature must be one of {allowed}")
    return eda.scatter_yield_vs_feature(feature)


@api_router.get("/eda/shap")
def eda_shap():
    return eda.shap_importances()


@api_router.post("/train")
def trigger_training(background_tasks: BackgroundTasks):
    """Retrain the model in the background."""
    def _train():
        from app.train import train
        train()

    background_tasks.add_task(_train)
    return {"message": "Training started in background"}

app.include_router(api_router, prefix="/api")

frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists() and (frontend_dist / "index.html").exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse
    
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_static(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        file_path = (frontend_dist / full_path).resolve()
        try:
            if file_path.exists() and file_path.is_file() and frontend_dist.resolve() in file_path.parents:
                return FileResponse(file_path)
        except Exception:
            pass
            
        return FileResponse(frontend_dist / "index.html")

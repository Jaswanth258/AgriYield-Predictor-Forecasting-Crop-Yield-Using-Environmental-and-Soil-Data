# 🌱 AgriYield Predictor
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![XGBoost](https://img.shields.io/badge/XGBoost-(%23F37626.svg?style=for-the-badge&logo=xgboost&logoColor=white) 
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)

An advanced artificial intelligence web application engineered to predict crop yields with pinpoint accuracy using extreme-gradient boosting models (XGBoost). The system leverages microclimate inputs (temperature, rainfall, pH) and deep sub-soil elements (Nitrogen, Phosphorous, Potassium) to deliver data-led agricultural recommendations.

### 🌍 **Live Application Demo:** [https://agriyield-predictor-forecasting-crop.onrender.com](https://agriyield-predictor-forecasting-crop.onrender.com)

## 🎯 Core Features & Capabilities

### 1. Highly-Calibrated AI Predictions
* **What it is:** Predicts precise tonnes-per-hectare (t/ha) and the total net harvest using hyper-localized historical soil mappings.
* **How we implemented it:** Built a custom ensemble `VotingRegressor` compounding `RandomForest`, `XGBoost`, and `LightGBM`. All structural scaling is completed through robust Scikit-Learn `StandardScaler` pipelines before dumping into a `.joblib` serialized output.

### 2. Live Open-Meteo Integration
* **What it is:** When a user is unaware of localized metrics (like temperature or rainfall), the system defaults to real-time local statistics.
* **How we implemented it:** Developed fallback parsing architecture inside the FastAPI `/predict` endpoint that utilizes the `requests` library to instantly ping the Open-Meteo API for real-time local weather using accurate geo-coordinates for the specific district in India. 

### 3. "Auto-Optimize" For Massive Yields
* **What it is:** An interactive one-click button that completely fills the user's dashboard with the mathematically "perfect" environmental inputs for their specific crop.
* **How we implemented it:** Coded an aggressive data-filtration strategy that scans historical databases for solely the top 25% percentile farms globally. The algorithm captures their median inputs (N, P, K, pH) and registers them statically into `meta.json` as the gold-standard benchmark.

### 4. Bulk/Batch CSV Processing
* **What it is:** Advanced tool explicitly built for macro-farms or co-ops to instantly execute ML payload predictions on thousands of acres simultaneously.
* **How we implemented it:** Created a specific `POST /predict/batch` FastAPI endpoint taking in an `UploadFile` (Pandas CSV frame). It chunks the results through the `VotingRegressor` engine, parses yield enhancement warnings asynchronously, and serves the JSON structure straight back to React for rapid frontend table generation and `export to CSV` hooks.

### 5. Educational Transparency & "Explainer" Components
* **What it is:** Bridges the gap between impenetrable AI calculations and non-technical farmers by providing plain-English validation and a "📜 Historical Ground Truth" record table proving previous farm performance directly beneath the prediction outcome.
* **How we implemented it:** Passed local dataframe extractions directly as contextual React props into specialized UI cards, triggering only when data falls below an 85% optimal matching threshold.

### 6. Dynamic Glassmorphism Aesthetics
* **What it is:** An enterprise-grade, beautifully engaging user interface ensuring interactions feel tactile, professional, and trustworthy, departing from standard "plain" academic dashboards.
* **How we implemented it:** Deplayed pure CSS Keyframe animation meshes under Vite/React combined with aggressive TailwindCSS `backdrop-blur-2xl` transparent-white overlays and deep drop shadows.

---

## 🛠️ Technology Stack
* **Frontend:** React 18, Vite, Tailwind CSS, Recharts (for deep `/eda` analytics), React Router Dom.
* **Backend:** Python 3.9+, FastAPI, Uvicorn, Pandas.
* **Machine Learning Context:** Scikit-Learn, XGBoost, LightGBM, SHAP (for feature importance modeling).
* **Tooling:** `html2canvas` & `jspdf` (for PDF report generations).

---

## 🚀 Execution & Local Setup

Running the project simultaneously requires hosting the API (Backend) and the client (Frontend).

### Quickstart (Windows users)
To circumvent tedious multi-terminal openings, we built a native 1-click startup module:
1. Ensure both **Python 3.9+** and **Node.js** are installed on your machine.
2. In your File Explorer, simply double-click or run the powershell script recursively via:
   ```powershell
   .\run.ps1
   ```
Both systems will launch flawlessly and automatically open the application at **`http://localhost:5173`**.

### Standard Setup

**1. Start the FastAPI Backend Server**
```bash
cd backend
python -m venv venv
venv\Scripts\activate   # (or `source venv/bin/activate` on Mac)
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*The backend API will run on `http://localhost:8000`.*

**2. Start the React UI**
Open a totally brand-new terminal window and run:
```bash
cd frontend
npm install
npm run dev
```
*The React UI will run on `http://localhost:5173`.*

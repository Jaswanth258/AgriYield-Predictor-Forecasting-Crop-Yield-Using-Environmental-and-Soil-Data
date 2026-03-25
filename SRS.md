# Software Requirements Specification (SRS)
## AgriYield Predictor

---

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to define the software requirements for the **AgriYield Predictor** application. It serves as a comprehensive guide for developers, product managers, and stakeholders to understand the scope, functionality, user interactions, and technical constraints of the platform.

### 1.2 Scope
AgriYield Predictor is a web-based, machine-learning-powered platform designed to empower agricultural stakeholders. By synthesizing local environmental conditions (temperature, humidity, rainfall) and soil nutrient data (Nitrogen, Phosphorous, Potassium, pH), the software predicts crop yield capacity. The software seeks to demystify complex AI analytics by providing direct, actionable insights and transparent data histories, ultimately promoting data-driven farming.

---

## 2. Overall Description

### 2.1 Product Perspective
AgriYield predictably operates as a standard client-server application. 
- The **Client (Frontend)** is a rich single-page application built on React.js and Vite, offering dynamic data visualizations and premium user experiences. 
- The **Server (Backend)** is a RESTful API built on Python FastAPI, which orchestrates machine learning environments, data parsing, and external API requests (e.g., Live Weather).

### 2.2 User Classes and Characteristics
1. **Farmers / Growers:** Users with practical agricultural knowledge but potentially limited technical or data-science expertise. They require clear, plain-English explanations of predictions and actionable "Yield Enhancement" steps.
2. **Agricultural Planners / Co-Ops:** Intermediate technical users who utilize the "Batch Prediction" features to process hundreds of farms simultaneously via CSV uploads.
3. **Analysts / Researchers:** Advanced users who actively utilize the "Exploratory Data Analysis" (EDA) dashboard to observe historical macro-trends, model confidence intervals (CI), and regional averages.

### 2.3 Operating Environment
- **Browser:** Modern web browsers (Chrome, Firefox, Safari, Edge) supporting standard JavaScript (ES6+), CSS3 features (Grid, Flexbox, backdrop-filter for Glassmorphism).
- **Backend Infrastructure:** Any operating system running Python 3.9+. Highly scalable through ASGI servers like Uvicorn.

---

## 3. System Features & Workflow

### 3.1 Core Predictive Engine
**Description:** The system accepts 7 core environmental metrics to forecast crop output.
- **Inputs:** `State`, `District`, `Crop Label`, `Area (Hectares)`, `Nitrogen (N)`, `Phosphorous (P)`, `Potassium (K)`, `Temperature`, `Humidity`, `pH`, `Rainfall`.
- **Logic:** The payload is evaluated by a trained XGBoost/RandomForest regression model mapped to the user's localized zone.
- **Outputs:** Predicted Tonnes per Hectare (t/ha), Estimated Total Harvest Capacity, and 90% Confidence Interval. 

### 3.2 Dynamic Fallback & Live Weather Integration
**Description:** Reduces user friction during data-entry.
- **Workflow:** If a user selects `"Auto"` input mode or fails to provide metrics, the application seamlessly calls the Open-Meteo API for real-time local weather. Soil values gracefully fallback to historical dataset averages specific to that exact state and district.

### 3.3 Auto-Optimize & Actionable Intelligence
**Description:** The system acts as an advisory tool.
- **Workflow:** When requested, the backend scans the historical dataset for the top 25% percentile highest-yielding records of a specific crop. It instantly returns the mathematically optimal environmental parameters. If a user's manual inputs fall below the 85% threshold of these optimal markers, the UI triggers a "Yield Enhancement Warning" advising the exact quantity of fertilizer needed.

### 3.4 Transparency Explainer Module
**Description:** Builds trust through clear data provenence.
- **Workflow:** The system intercepts the ML prediction and generates a plain-English explanation card summarizing how the XGBoost algorithm cross-referenced decades of local data. Furthermore, a "Historical Ground Truth" table is appended to the result, displaying the last known actual farm yields in the user's database.

### 3.5 High-Throughput Batch Processing
**Description:** Allows bulk computation for macro-planners.
- **Workflow:** Users download a strict CSV template. Upon modifying and uploading, the backend iteratively processes each row through the prediction pipeline. The frontend asynchronously renders a dynamic result table, which can then be immediately exported back to a CSV encompassing all generated predictions and enhancement warnings.

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements
- **Latency:** Single yield predictions must execute and respond in under 300ms. Live weather fetch operations via Open-Meteo must not stall UI rendering (handled via async React hooks).
- **Scalability:** The FastAPI backend must support asynchronous batch processing to handle CSV workloads exceeding 5,000 continuous rows without blocking the main event loop.

### 4.2 Usability & Aesthetic Requirements
- **Design System:** The UI must adhere strictly to a Premium Glassmorphism architecture. All components must float above dynamic, high-contrast, fully-animated CSS mesh gradients.
- **Responsiveness:** The layout architecture (Tailwind) must gracefully scale from 1080p desktop environments down to mobile viewports without breaking prediction forms or EDA charts.
- **Accessibility:** Form fields must have clear textual labels (not just placeholders). Complex AI metrics (like Confidence Intervals) must be explicitly defined via "ℹ️ Metric Notation" popovers.

### 4.3 Reliability & Availability
- **Model Fallback:** In the event that a crop lacks sufficient localized training data to execute a highly-confident ML prediction, the system must securely fall back to the historical median for that region to prevent rendering NaN or 0.0 exceptions to the user.

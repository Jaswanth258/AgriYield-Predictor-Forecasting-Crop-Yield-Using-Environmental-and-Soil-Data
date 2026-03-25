import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHealth, getMeta } from "../api";
import StatCard from "../components/StatCard";
import Loader from "../components/Loader";
import EmptyStateCarousel from "../components/EmptyStateCarousel";

export default function Home() {
  const [health, setHealth] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([getHealth(), getMeta()]).then(([h, m]) => {
      if (h.status === "fulfilled") setHealth(h.value.data);
      if (m.status === "fulfilled") setMeta(m.value.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Loader message="Connecting to AgriYield API..." />;

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-brand-700 to-teal-900 text-white border-0 shadow-xl shadow-brand-900/10 p-10 md:p-14">
        <div className="absolute right-[-5%] top-[-10%] opacity-10 text-[250px] leading-none select-none pointer-events-none transform rotate-12 filter blur-[2px]">🌾</div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <span className={`w-2.5 h-2.5 rounded-full ${health?.model_ready ? "bg-green-300 animate-pulse" : "bg-red-300"}`} />
            <span className="text-brand-200 text-sm font-medium">
              {health?.model_ready ? "Model Ready" : "Model Loading..."}
            </span>
          </div>
          <h1 className="text-4xl font-extrabold mb-3">AgriYield Predictor</h1>
          <p className="text-brand-100 text-lg max-w-xl leading-relaxed">
            Forecast crop yield based on soil nutrients, weather conditions, and environmental parameters
            using machine learning — powered by Random Forest, XGBoost, and LightGBM.
          </p>
          <div className="flex flex-wrap gap-4 mt-8">
            <Link to="/predict" className="bg-white text-teal-700 hover:bg-emerald-50 font-bold px-8 py-4 rounded-xl transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 text-lg">
              ✨ Predict Yield
            </Link>
            <Link to="/eda" className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white font-bold px-8 py-4 rounded-xl transition-all border border-white/30 text-lg">
              📈 Explore Data
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      {meta && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="🌱" label="Crop Types" value={meta.crop_list?.length ?? "—"} sub="supported crops" />
          <StatCard icon="🏆" label="Best Model" value={meta.best_model ?? "—"} sub={meta.metrics?.[meta.best_model] ? `R² = ${meta.metrics[meta.best_model].r2}` : ""} color="amber" />
          <StatCard icon="🎯" label="RMSE" value={meta.metrics?.[meta.best_model]?.rmse ?? "—"} sub="t/ha error" color="blue" />
          <StatCard icon="🧪" label="Features" value={meta.feature_cols?.length ?? "—"} sub="input parameters" color="purple" />
        </div>
      )}

      {/* Impressive AI Explanation Carousel */}
      <div>
        <h2 className="text-2xl font-bold mb-5 text-gray-800 tracking-tight">How the AI Works</h2>
        <EmptyStateCarousel />
      </div>

      {/* Feature cards */}
      <div>
        <h2 className="text-xl font-bold mb-4 text-gray-800">What Can You Do?</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              icon: "🔬",
              title: "Single Prediction",
              desc: "Enter soil and weather data manually to predict yield for a specific crop and location.",
              to: "/predict",
              cta: "Start Predicting",
              color: "brand",
            },
            {
              icon: "📤",
              title: "Batch Prediction",
              desc: "Upload a CSV file with multiple records and get bulk yield predictions in one click.",
              to: "/batch",
              cta: "Upload CSV",
              color: "amber",
            },
            {
              icon: "📊",
              title: "Data Analysis",
              desc: "Visualize correlations, distributions, yield by crop, and SHAP feature importances.",
              to: "/eda",
              cta: "Explore Charts",
              color: "blue",
            },
          ].map((f) => (
            <div key={f.title} className="card hover:shadow-md transition-shadow group">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm mb-4 leading-relaxed">{f.desc}</p>
              <Link
                to={f.to}
                className="inline-flex items-center gap-1 text-brand-600 font-medium text-sm hover:text-brand-800 group-hover:gap-2 transition-all"
              >
                {f.cta} →
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Input features info */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Input Parameters</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Nitrogen (N)", unit: "kg/ha", icon: "🧪" },
            { label: "Phosphorus (P)", unit: "kg/ha", icon: "🧪" },
            { label: "Potassium (K)", unit: "kg/ha", icon: "🧪" },
            { label: "Temperature", unit: "°C", icon: "🌡️" },
            { label: "Humidity", unit: "%", icon: "💧" },
            { label: "Soil pH", unit: "0–14", icon: "⚗️" },
            { label: "Rainfall", unit: "mm", icon: "🌧️" },
            { label: "Soil Type", unit: "categorical", icon: "🌍" },
          ].map((p) => (
            <div key={p.label} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
              <span className="text-xl">{p.icon}</span>
              <div>
                <p className="text-sm font-medium text-gray-800">{p.label}</p>
                <p className="text-xs text-gray-400">{p.unit}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Crop list */}
      {meta?.crop_list && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Supported Crops ({meta.crop_list.length})</h2>
          <div className="flex flex-wrap gap-2">
            {meta.crop_list.map((c) => (
              <span key={c} className="badge bg-brand-50 text-brand-800 px-3 py-1.5 rounded-full capitalize text-sm font-medium border border-brand-100">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

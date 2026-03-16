import { useEffect, useState } from "react";
import { getMeta, predictYield } from "../api";
import ResultCard from "../components/ResultCard";
import toast from "react-hot-toast";

const DEFAULTS = {
  N: 20, P: 10, K: 18, temperature: 25,
  humidity: 80, ph: 6.5, rainfall: 1200,
  soil_type: "loamy", label: "rice",
};

const FIELD_CONFIG = [
  { key: "N",           label: "Nitrogen (N)",      unit: "kg/ha",  min: 0,   max: 170,  step: 1,    icon: "🧪" },
  { key: "P",           label: "Phosphorus (P)",     unit: "kg/ha",  min: 0,   max: 80,   step: 1,    icon: "🧪" },
  { key: "K",           label: "Potassium (K)",      unit: "kg/ha",  min: 0,   max: 110,  step: 1,    icon: "🧪" },
  { key: "temperature", label: "Temperature",        unit: "°C",     min: 10,  max: 45,   step: 0.1,  icon: "🌡️" },
  { key: "humidity",    label: "Humidity",           unit: "%",      min: 0,   max: 100,  step: 0.1,  icon: "💧" },
  { key: "ph",          label: "Soil pH",            unit: "",       min: 4,   max: 9,    step: 0.01, icon: "⚗️" },
  { key: "rainfall",    label: "Rainfall",           unit: "mm",     min: 300, max: 3500, step: 10,   icon: "🌧️" },
];

export default function Predict() {
  const [form, setForm] = useState(DEFAULTS);
  const [crops, setCrops] = useState([]);
  const [soils, setSoils] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMeta().then((r) => {
      setCrops(r.data.crop_list ?? []);
      setSoils(r.data.soil_types ?? []);
    }).catch(() => {});
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: isNaN(value) || value === "" ? value : parseFloat(value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await predictYield(form);
      setResult(res.data);
      toast.success("Prediction ready!");
    } catch (err) {
      const msg = err.response?.data?.detail ?? "Prediction failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setForm(DEFAULTS);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Crop Yield Prediction</h1>
        <p className="text-gray-500 mt-1">Enter soil and environmental parameters to predict yield.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-3 card space-y-5">
          <h2 className="font-bold text-gray-800 text-lg">Input Parameters</h2>

          {/* Numeric fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            {FIELD_CONFIG.map((f) => (
              <div key={f.key}>
                <label className="label">
                  {f.icon} {f.label}
                  {f.unit && <span className="text-gray-400 font-normal ml-1">({f.unit})</span>}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name={f.key}
                    value={form[f.key]}
                    onChange={handleChange}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    required
                    className="input-field"
                  />
                </div>
                {/* Range indicator */}
                <input
                  type="range"
                  name={f.key}
                  min={f.min}
                  max={f.max}
                  step={f.step}
                  value={Math.min(Math.max(form[f.key] ?? f.min, f.min), f.max)}
                  onChange={handleChange}
                  className="w-full h-1.5 mt-2 accent-brand-500 cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                  <span>{f.min}</span>
                  <span>{f.max}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Categorical fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">🌍 Soil Type</label>
              <select name="soil_type" value={form.soil_type} onChange={handleChange} className="input-field">
                {soils.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">🌱 Crop</label>
              <select name="label" value={form.label} onChange={handleChange} className="input-field">
                {crops.map((c) => (
                  <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Predicting...
                </span>
              ) : "🌾 Predict Yield"}
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary">
              Reset
            </button>
          </div>
        </form>

        {/* Result panel */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <ResultCard result={result} crop={form.label} soilType={form.soil_type} />
          ) : (
            <div className="card flex flex-col items-center justify-center py-16 text-center text-gray-400 border-dashed border-2 border-gray-200">
              <span className="text-5xl mb-3">🌾</span>
              <p className="font-medium">Results will appear here</p>
              <p className="text-sm mt-1">Fill in the parameters and click Predict</p>
            </div>
          )}

          {/* Guidance card */}
          <div className="card bg-amber-50 border-amber-100">
            <h3 className="font-semibold text-amber-800 mb-2">💡 Tips</h3>
            <ul className="text-sm text-amber-700 space-y-1.5">
              <li>• NPK levels (Nitrogen, Phosphorus, Potassium) have the highest impact on yield.</li>
              <li>• Soil pH between 6.0–7.5 is optimal for most crops.</li>
              <li>• Match rainfall to the crop's natural growing region for best accuracy.</li>
              <li>• Loamy or silty soils generally give higher predicted yields.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

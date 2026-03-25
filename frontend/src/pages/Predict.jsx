import { useEffect, useState } from "react";
import { getMeta, predictYield, recommendCrop, getLiveWeather, getHistoricalReference } from "../api";
import ResultCard from "../components/ResultCard";
import EmptyStateCarousel from "../components/EmptyStateCarousel";
import toast from "react-hot-toast";

const DEFAULTS = {
  state: "Andhra Pradesh", district: "Anantapur", area_ha: 1,
  N: "", P: "", K: "", temperature: "",
  humidity: "", ph: "", rainfall: "",
  soil_type: "", label: "rice",
};

const FIELD_CONFIG = [
  { key: "N",           label: "Nitrogen (N)",      unit: "kg/ha",  min: 0,   max: 170,  step: 0.1,    icon: "🧪" },
  { key: "P",           label: "Phosphorus (P)",     unit: "kg/ha",  min: 0,   max: 80,   step: 0.1,    icon: "🧪" },
  { key: "K",           label: "Potassium (K)",      unit: "kg/ha",  min: 0,   max: 110,  step: 0.1,    icon: "🧪" },
  { key: "temperature", label: "Temperature",        unit: "°C",     min: 10,  max: 45,   step: 0.1,  icon: "🌡️" },
  { key: "humidity",    label: "Humidity",           unit: "%",      min: 0,   max: 100,  step: 0.1,  icon: "💧" },
  { key: "ph",          label: "Soil pH",            unit: "",       min: 4,   max: 9,    step: 0.01, icon: "⚗️" },
  { key: "rainfall",    label: "Rainfall",           unit: "mm",     min: 300, max: 3500, step: 0.1,   icon: "🌧️" },
];

export default function Predict() {
  const [form, setForm] = useState(DEFAULTS);
  const [crops, setCrops] = useState([]);
  const [soils, setSoils] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [regionHierarchy, setRegionHierarchy] = useState({});
  const [regionDefaults, setRegionDefaults] = useState(null);
  const [topCrops, setTopCrops] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recommending, setRecommending] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [liveWeather, setLiveWeather] = useState(null);
  const [inputMode, setInputMode] = useState("auto"); // "auto" or "manual"
  const [historicalData, setHistoricalData] = useState([]);
  const [benchmarks, setBenchmarks] = useState({});

  useEffect(() => {
    getMeta().then((r) => {
      setCrops(r.data.crop_list ?? []);
      setSoils(r.data.soil_types ?? []);
      if (r.data.crop_benchmarks) setBenchmarks(r.data.crop_benchmarks);
      if (r.data.state_list) setStates(r.data.state_list);
      if (r.data.region_hierarchy) {
        setRegionHierarchy(r.data.region_hierarchy);
        if (r.data.region_hierarchy[DEFAULTS.state]) {
          setDistricts(r.data.region_hierarchy[DEFAULTS.state]);
        }
      }
    }).catch(() => {});
    fetchDefaults(DEFAULTS.state);
  }, []);

  const fetchWeather = async (state, district) => {
    if (!state || !district) return;
    try {
      setWeatherLoading(true);
      const res = await getLiveWeather(state, district);
      setLiveWeather(res.data);
      if (inputMode === "auto") {
        setForm((f) => ({
          ...f,
          temperature: parseFloat(res.data.temperature.toFixed(1)),
          humidity: parseFloat(res.data.humidity.toFixed(1)),
          rainfall: Math.round(res.data.rainfall),
        }));
      }
    } catch (e) {
      setLiveWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchDefaults = async (state) => {
    try {
      const { data } = await import("axios").then((axios) => axios.get(`http://127.0.0.1:8000/defaults/${encodeURIComponent(state)}`));
      setRegionDefaults(data.defaults);
      setTopCrops(data.top_crops || []);
      
      // Auto-apply if in "auto" mode
      if (inputMode === "auto" && data.defaults) {
        setForm((f) => ({
          ...f,
          N: Math.round(data.defaults.N),
          P: Math.round(data.defaults.P),
          K: Math.round(data.defaults.K),
          ph: parseFloat(data.defaults.ph.toFixed(2)),
          temperature: liveWeather ? parseFloat(liveWeather.temperature.toFixed(1)) : parseFloat(data.defaults.temperature.toFixed(1)),
          humidity: liveWeather ? parseFloat(liveWeather.humidity.toFixed(1)) : parseFloat(data.defaults.humidity.toFixed(1)),
          rainfall: liveWeather ? Math.round(liveWeather.rainfall) : Math.round(data.defaults.rainfall),
        }));
      }
    } catch (e) {
      setRegionDefaults(null);
      setTopCrops([]);
    }
  };

  useEffect(() => {
    if (inputMode === "auto" && regionDefaults) {
        setForm((f) => ({
          ...f,
          N: Math.round(regionDefaults.N),
          P: Math.round(regionDefaults.P),
          K: Math.round(regionDefaults.K),
          ph: parseFloat(regionDefaults.ph.toFixed(2)),
          temperature: liveWeather ? parseFloat(liveWeather.temperature.toFixed(1)) : parseFloat(regionDefaults.temperature.toFixed(1)),
          humidity: liveWeather ? parseFloat(liveWeather.humidity.toFixed(1)) : parseFloat(regionDefaults.humidity.toFixed(1)),
          rainfall: liveWeather ? Math.round(liveWeather.rainfall) : Math.round(regionDefaults.rainfall),
        }));
    } else if (inputMode === "manual") {
        setForm((f) => ({
            ...f,
            N: "", P: "", K: "", temperature: "", humidity: "", ph: "", rainfall: ""
        }));
    }
  }, [inputMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "state") {
      const newDistricts = regionHierarchy[value] || [];
      const newDist = newDistricts[0] || "";
      setDistricts(newDistricts);
      setForm((f) => ({ ...f, state: value, district: newDist }));
      fetchDefaults(value);
      fetchWeather(value, newDist);
      return;
    }
    if (name === "district") {
      setForm((f) => ({ ...f, district: value }));
      fetchWeather(form.state, value);
      return;
    }
    setForm((f) => ({ ...f, [name]: isNaN(value) || value === "" ? value : parseFloat(value) }));
  };

  const handleSuggestCrop = async () => {
    setRecommending(true);
    try {
      const payload = {
        N: form.N || 0,
        P: form.P || 0,
        K: form.K || 0,
        temperature: form.temperature || 25,
        humidity: form.humidity || 50,
        ph: form.ph || 6.5,
        rainfall: form.rainfall || 1000,
      };
      const res = await recommendCrop(payload);
      if (res.data.recommended_crops?.length > 0) {
        const topCrop = res.data.recommended_crops[0];
        setForm((f) => ({ ...f, label: topCrop }));
        toast.success(`Recommended crop: ${topCrop.charAt(0).toUpperCase() + topCrop.slice(1)}`);
      }
    } catch (err) {
      toast.error("Failed to suggest crop");
    } finally {
      setRecommending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, mode: inputMode };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === "") payload[k] = null;
      });
      const res = await predictYield(payload);
      setResult(res.data);
      
      try {
        const histRes = await getHistoricalReference(payload.state, payload.district, payload.label);
        setHistoricalData(histRes.data.records);
      } catch (err) {
        console.error("Historical lookup failed", err);
        setHistoricalData([]);
      }
      
      toast.success("Prediction ready!");
    } catch (err) {
      const msg = err.response?.data?.detail ?? "Prediction failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = () => {
    if (!form.label) {
      toast.error("Please select a crop first");
      return;
    }
    const bench = benchmarks[form.label.toLowerCase()];
    if (!bench || !bench.optimal_temp) {
      toast.error("Detailed optimal benchmarks not yet trained for this crop");
      return;
    }
    
    setInputMode("manual");
    setForm(f => ({
      ...f,
      N: bench.optimal_N,
      P: bench.optimal_P,
      K: bench.optimal_K,
      temperature: bench.optimal_temp,
      humidity: bench.optimal_humidity,
      ph: bench.optimal_ph,
      rainfall: bench.optimal_rainfall,
    }));
    toast.success(`Loaded top 25% optimal inputs for ${form.label}!`);
  };

  const handleReset = () => {
    setForm((f) => ({ ...DEFAULTS, state: f.state, district: f.district }));
    setResult(null);
  };

  const handleApplyDefaults = () => {
    if (regionDefaults) {
      setForm((f) => ({
        ...f,
        N: Math.round(regionDefaults.N),
        P: Math.round(regionDefaults.P),
        K: Math.round(regionDefaults.K),
        temperature: parseFloat(regionDefaults.temperature.toFixed(1)),
        humidity: parseFloat(regionDefaults.humidity.toFixed(1)),
        ph: parseFloat(regionDefaults.ph.toFixed(2)),
        rainfall: Math.round(regionDefaults.rainfall),
      }));
      toast.success(`Applied historical averages for ${form.state}`);
    }
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

          {/* Required Fields */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">📍 Region (State)</label>
              <select name="state" value={form.state} onChange={handleChange} className="input-field" required>
                {states.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">🗺️ District</label>
              <select name="district" value={form.district} onChange={handleChange} className="input-field" required disabled={!districts.length}>
                {districts.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">📏 Area (Hectares)</label>
              <input type="number" name="area_ha" value={form.area_ha} onChange={handleChange} min={0.1} step={0.1} required className="input-field" />
            </div>
            <div>
              <label className="label flex justify-between items-center">
                <span>
                  🌱 Crop
                  {topCrops.length > 0 && <span className="ml-2 text-xs text-brand-500 font-medium hidden lg:inline-block">Regional: {topCrops.slice(0, 3).map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join(", ")}</span>}
                </span>
                <button type="button" onClick={handleSuggestCrop} disabled={recommending} className="text-xs text-brand-600 hover:text-brand-800 font-semibold flex items-center gap-1 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 transition-colors">
                  {recommending ? "⌛" : "✨"} Suggest
                </button>
              </label>
              <select name="label" value={form.label} onChange={handleChange} className="input-field" required>
                {crops.map((c) => (
                  <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">🌍 Soil Type <span className="text-xs text-brand-600 ml-1 font-semibold">(Optional)</span></label>
              <select name="soil_type" value={form.soil_type} onChange={handleChange} className="input-field">
                <option value="">Don't know (Auto-detect from State)</option>
                {soils.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5 mt-4">
            <div className="mb-5 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <h3 className="font-bold text-gray-800 text-sm mb-3">Soil & Weather Data Source</h3>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors flex-1 ${inputMode === 'auto' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="inputMode" value="auto" checked={inputMode === "auto"} onChange={(e) => setInputMode(e.target.value)} className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500" />
                  <div>
                    <span className="block font-semibold text-sm text-gray-800">
                      Live Weather & Defaults
                      {weatherLoading && <span className="ml-2 text-xs text-brand-600 animate-pulse">Fetching 🌩️...</span>}
                    </span>
                    <span className="block text-xs text-gray-500">Auto-fill live current weather + regional soil</span>
                  </div>
                </label>
                <label className={`flex items-center gap-2 p-3 rounded-md border cursor-pointer transition-colors flex-1 ${inputMode === 'manual' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}>
                  <input type="radio" name="inputMode" value="manual" checked={inputMode === "manual"} onChange={(e) => setInputMode(e.target.value)} className="w-4 h-4 text-brand-600 border-gray-300 focus:ring-brand-500" />
                  <div>
                    <span className="block font-semibold text-sm text-gray-800">Enter Custom Data</span>
                    <span className="block text-xs text-gray-500">Provides exact inputs for manual entry</span>
                  </div>
                </label>
              </div>
            </div>

            <div className={`grid sm:grid-cols-2 gap-4 transition-opacity duration-300 ${inputMode === 'auto' ? 'opacity-80 pointer-events-none' : 'opacity-100'}`}>
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
                      placeholder={`Expected: ${f.min} - ${f.max}`}
                      className="input-field placeholder-gray-300"
                    />
                  </div>
                  <input
                    type="range"
                    name={f.key}
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={form[f.key] !== "" && form[f.key] !== null ? form[f.key] : f.min}
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
            <button type="button" onClick={handleReset} className="btn-secondary flex-1">
              Reset
            </button>
          </div>
        </form>

        {/* Result panel */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <ResultCard result={result} crop={form.label} soilType={form.soil_type} historicalData={historicalData} onOptimize={handleOptimize} benchmarks={benchmarks[form.label?.toLowerCase()]} />
          ) : (
            <EmptyStateCarousel />
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

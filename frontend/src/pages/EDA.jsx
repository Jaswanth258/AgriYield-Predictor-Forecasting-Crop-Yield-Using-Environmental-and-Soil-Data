import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Legend, Cell, LineChart, Line,
} from "recharts";
import {
  getYieldByCrop, getCorrelation, getDistributions, getScatter, getShap,
} from "../api";
import Loader from "../components/Loader";

const COLORS = [
  "#16a34a","#22c55e","#4ade80","#86efac","#bbf7d0",
  "#f59e0b","#fbbf24","#fcd34d","#fde68a","#fef9c3",
  "#3b82f6","#60a5fa","#93c5fd","#2563eb","#1d4ed8",
  "#8b5cf6","#a78bfa","#c4b5fd","#7c3aed","#6d28d9",
  "#ec4899","#f43f5e","#ef4444",
];

const FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"];

function Section({ title, children }) {
  return (
    <div className="card space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      {children}
    </div>
  );
}

export default function EDA() {
  const [yieldByCrop, setYieldByCrop] = useState(null);
  const [corr, setCorr] = useState(null);
  const [dist, setDist] = useState(null);
  const [scatter, setScatter] = useState(null);
  const [shap, setShap] = useState(null);
  const [activeFeature, setActiveFeature] = useState("rainfall");
  const [activeDist, setActiveDist] = useState("yield_t_ha");

  useEffect(() => {
    Promise.allSettled([
      getYieldByCrop(),
      getCorrelation(),
      getDistributions(),
      getShap(),
    ]).then(([y, c, d, s]) => {
      if (y.status === "fulfilled") setYieldByCrop(y.value.data);
      if (c.status === "fulfilled") setCorr(c.value.data);
      if (d.status === "fulfilled") setDist(d.value.data);
      if (s.status === "fulfilled") setShap(s.value.data);
    });
  }, []);

  useEffect(() => {
    getScatter(activeFeature).then((r) => setScatter(r.data)).catch(() => {});
  }, [activeFeature]);

  const DIST_FEATURES = ["yield_t_ha", "N", "P", "K", "temperature", "humidity", "ph", "rainfall"];

  if (!yieldByCrop) return <Loader message="Loading analysis data..." />;

  // Build dist histogram data
  const histData = dist && dist[activeDist]
    ? dist[activeDist].bins.slice(0, -1).map((b, i) => ({
        bin: b.toFixed(1),
        count: dist[activeDist].counts[i],
      }))
    : [];

  // Correlation heatmap — find yield row
  let yieldCorr = null;
  if (corr) {
    const idx = corr.columns.indexOf("yield_t_ha");
    yieldCorr = corr.columns.map((col, i) => ({
      feature: col,
      correlation: corr.matrix[idx][i],
    })).filter((d) => d.feature !== "yield_t_ha");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Exploratory Data Analysis</h1>
        <p className="text-gray-500 mt-1">Visualize relationships between features and crop yield.</p>
      </div>

      {/* Yield by crop */}
      <Section title="Average Yield by Crop (t/ha)">
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={yieldByCrop} margin={{ top: 5, right: 20, left: 0, bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="label" angle={-40} textAnchor="end" tick={{ fontSize: 12 }} interval={0} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: "t/ha", angle: -90, position: "insideLeft", offset: 15 }} />
            <Tooltip formatter={(v) => [`${v} t/ha`, "Avg Yield"]} />
            <Bar dataKey="avg_yield" radius={[6, 6, 0, 0]}>
              {yieldByCrop.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Section>

      {/* Correlation with yield */}
      {yieldCorr && (
        <Section title="Feature Correlation with Yield">
          <p className="text-sm text-gray-500">Pearson correlation coefficients — higher |value| = stronger relationship.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={yieldCorr} layout="vertical" margin={{ left: 80, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[-1, 1]} tick={{ fontSize: 12 }} />
              <YAxis dataKey="feature" type="category" tick={{ fontSize: 12 }} width={80} />
              <Tooltip formatter={(v) => [v.toFixed(4), "Correlation"]} />
              <Bar dataKey="correlation" radius={[0, 6, 6, 0]}>
                {yieldCorr.map((d, i) => (
                  <Cell key={i} fill={d.correlation >= 0 ? "#16a34a" : "#ef4444"} fillOpacity={Math.abs(d.correlation) * 0.8 + 0.2} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* Distribution */}
      {dist && (
        <Section title="Feature Distributions">
          <div className="flex flex-wrap gap-2 mb-4">
            {DIST_FEATURES.map((f) => (
              <button
                key={f}
                onClick={() => setActiveDist(f)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeDist === f
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          {dist[activeDist] && (
            <div>
              <div className="flex gap-4 text-sm mb-2 text-gray-500">
                <span>Mean: <strong className="text-gray-800">{dist[activeDist].mean}</strong></span>
                <span>Std: <strong className="text-gray-800">{dist[activeDist].std}</strong></span>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={histData} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="bin" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [v, "Count"]} labelFormatter={(l) => `Bin ≈ ${l}`} />
                  <Bar dataKey="count" fill="#16a34a" fillOpacity={0.8} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>
      )}

      {/* Scatter */}
      <Section title="Scatter: Feature vs Yield">
        <div className="flex flex-wrap gap-2 mb-4">
          {FEATURES.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFeature(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeFeature === f
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        {scatter ? (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="x" name={activeFeature} tick={{ fontSize: 11 }} label={{ value: activeFeature, position: "insideBottom", offset: -5 }} />
              <YAxis dataKey="y" name="yield_t_ha" tick={{ fontSize: 11 }} label={{ value: "Yield (t/ha)", angle: -90, position: "insideLeft" }} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} formatter={(v, n) => [v.toFixed(3), n]} />
              <Scatter data={scatter} fill="#16a34a" fillOpacity={0.5} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <Loader message="Loading scatter data..." />
        )}
      </Section>

      {/* SHAP */}
      {shap && shap.length > 0 && (
        <Section title="SHAP Feature Importance (Top 12)">
          <p className="text-sm text-gray-500">Mean absolute SHAP values — higher = more impact on yield prediction.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={shap} layout="vertical" margin={{ left: 140, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={140} />
              <Tooltip formatter={(v) => [v.toFixed(4), "Importance"]} />
              <Bar dataKey="importance" fill="#f59e0b" fillOpacity={0.85} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}
    </div>
  );
}

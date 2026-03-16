import { useEffect, useState } from "react";
import { getMeta, triggerTrain } from "../api";
import Loader from "../components/Loader";
import toast from "react-hot-toast";

const MODEL_DESCRIPTIONS = {
  RandomForest: {
    icon: "🌲",
    desc: "An ensemble of decision trees that uses bagging to reduce variance. Excellent at capturing non-linear relationships and provides built-in feature importance via Gini impurity.",
    pros: ["High accuracy", "Handles missing values", "Native feature importance", "Robust to outliers"],
    cons: ["Slower than linear models", "Memory intensive for large datasets"],
  },
  XGBoost: {
    icon: "⚡",
    desc: "Gradient boosted decision trees with regularization. Sequentially builds trees that correct errors of previous ones. State-of-the-art for tabular data.",
    pros: ["Often best accuracy", "Regularization (L1/L2)", "Fast training with hist method", "GPU support"],
    cons: ["Many hyperparameters to tune", "Can overfit on small datasets"],
  },
  LightGBM: {
    icon: "💡",
    desc: "A fast, distributed gradient boosting framework that uses leaf-wise tree growth instead of level-wise. Significantly faster than XGBoost on large datasets.",
    pros: ["Fastest training", "Lower memory usage", "High accuracy", "Handles large datasets"],
    cons: ["May overfit on small datasets", "Leaf-wise growth can cause deep trees"],
  },
  Ridge: {
    icon: "📏",
    desc: "Regularized linear regression (L2 penalty). Serves as a fast, interpretable baseline. Works well when relationships between features and target are approximately linear.",
    pros: ["Very fast", "Interpretable coefficients", "No hyperparameter search needed", "Stable predictions"],
    cons: ["Cannot capture non-linear patterns", "Limited expressiveness"],
  },
};

export default function ModelInfo() {
  const [meta, setMeta] = useState(null);
  const [training, setTraining] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMeta().then((r) => {
      setMeta(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleRetrain = async () => {
    setTraining(true);
    try {
      await triggerTrain();
      toast.success("Retraining started in background! Refresh in ~30 seconds.");
    } catch {
      toast.error("Failed to start training");
    } finally {
      setTraining(false);
    }
  };

  if (loading) return <Loader message="Loading model information..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">Model Information</h1>
          <p className="text-gray-500 mt-1">Overview of trained models, metrics, and feature pipeline.</p>
        </div>
        <button
          onClick={handleRetrain}
          disabled={training}
          className="btn-secondary flex items-center gap-2"
        >
          {training ? (
            <>
              <span className="w-4 h-4 border-2 border-gray-300 border-t-brand-600 rounded-full animate-spin" />
              Starting...
            </>
          ) : "🔄 Retrain Model"}
        </button>
      </div>

      {/* Best model highlight */}
      {meta && (
        <div className="card bg-gradient-to-br from-brand-50 to-white border-brand-200">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{MODEL_DESCRIPTIONS[meta.best_model]?.icon ?? "🤖"}</span>
            <div>
              <p className="text-sm text-brand-600 font-medium uppercase tracking-wide">Best Performing Model</p>
              <p className="text-2xl font-extrabold text-gray-900">{meta.best_model}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {["rmse", "mae", "r2"].map((m) => (
              <div key={m} className="bg-white rounded-xl p-4 border border-brand-100 text-center">
                <p className="text-2xl font-bold text-brand-700">
                  {meta.metrics?.[meta.best_model]?.[m] ?? "—"}
                </p>
                <p className="text-sm text-gray-500 uppercase font-medium mt-0.5">
                  {m === "r2" ? "R² Score" : m.toUpperCase()}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {m === "rmse" ? "t/ha" : m === "mae" ? "t/ha" : "0–1"}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All model metrics */}
      {meta?.metrics && (
        <div className="card">
          <h2 className="text-xl font-bold mb-4">All Model Comparison</h2>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600 border-b">Model</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 border-b">RMSE ↓</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 border-b">MAE ↓</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600 border-b">R² ↑</th>
                  <th className="py-3 px-4 border-b" />
                </tr>
              </thead>
              <tbody>
                {Object.entries(meta.metrics).map(([name, m]) => (
                  <tr key={name} className={`border-b ${name === meta.best_model ? "bg-brand-50" : "hover:bg-gray-50"}`}>
                    <td className="py-3 px-4 font-semibold flex items-center gap-2">
                      {MODEL_DESCRIPTIONS[name]?.icon} {name}
                    </td>
                    <td className="py-3 px-4 text-right font-mono">{m.rmse}</td>
                    <td className="py-3 px-4 text-right font-mono">{m.mae}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-brand-700">{m.r2}</td>
                    <td className="py-3 px-4 text-center">
                      {name === meta.best_model && (
                        <span className="badge bg-brand-100 text-brand-800 px-2 py-0.5">Best</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Model cards */}
      <div>
        <h2 className="text-xl font-bold mb-4">Model Descriptions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(MODEL_DESCRIPTIONS).map(([name, info]) => (
            <div
              key={name}
              className={`card ${meta?.best_model === name ? "border-2 border-brand-200" : ""}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{info.icon}</span>
                <h3 className="font-bold text-gray-800 text-lg">{name}</h3>
                {meta?.best_model === name && (
                  <span className="badge bg-brand-100 text-brand-700 ml-auto">Selected</span>
                )}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed mb-3">{info.desc}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1">✅ Pros</p>
                  <ul className="space-y-0.5">
                    {info.pros.map((p) => (
                      <li key={p} className="text-xs text-gray-500">• {p}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-600 mb-1">⚠️ Cons</p>
                  <ul className="space-y-0.5">
                    {info.cons.map((c) => (
                      <li key={c} className="text-xs text-gray-500">• {c}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline info */}
      <div className="card">
        <h2 className="text-xl font-bold mb-4">Preprocessing Pipeline</h2>
        <div className="space-y-3">
          {[
            { step: "1. Data Generation", desc: "Synthetic dataset with 5,000 rows, 23 crop types, 6 soil types — based on real crop NPK/weather profiles." },
            { step: "2. Train/Test Split", desc: "80% training / 20% test split with random state 42 for reproducibility." },
            { step: "3. Numeric Scaling", desc: "StandardScaler applied to [N, P, K, temperature, humidity, ph, rainfall] — zero mean, unit variance." },
            { step: "4. Categorical Encoding", desc: "OneHotEncoder applied to [soil_type, label] with handle_unknown='ignore' for unseen categories." },
            { step: "5. Model Selection", desc: "All candidate models trained; best R² on test set is selected and persisted via joblib." },
            { step: "6. SHAP Explainability", desc: "TreeExplainer computes mean absolute SHAP values on a 200-sample subset for feature importance." },
          ].map((s) => (
            <div key={s.step} className="flex gap-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <span className="text-brand-600 font-bold text-sm whitespace-nowrap">{s.step}</span>
              <p className="text-sm text-gray-600">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

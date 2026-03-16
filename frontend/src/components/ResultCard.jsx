export default function ResultCard({ result, crop, soilType }) {
  if (!result) return null;

  const { yield_t_ha, ci_lower, ci_upper, model_used } = result;

  const getYieldColor = (y) => {
    if (y >= 10) return "text-brand-600";
    if (y >= 5)  return "text-amber-600";
    return "text-red-500";
  };

  const getYieldLabel = (y) => {
    if (y >= 10) return { label: "Excellent Yield", color: "bg-brand-100 text-brand-800" };
    if (y >= 5)  return { label: "Good Yield",      color: "bg-amber-100 text-amber-800" };
    return         { label: "Below Average",         color: "bg-red-100 text-red-800" };
  };

  const badge = getYieldLabel(yield_t_ha);

  return (
    <div className="card border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500 font-medium uppercase tracking-wide">Predicted Yield</p>
          <p className={`text-5xl font-extrabold mt-1 ${getYieldColor(yield_t_ha)}`}>
            {yield_t_ha.toFixed(2)}
          </p>
          <p className="text-gray-500 text-sm mt-1">tonnes per hectare (t/ha)</p>
        </div>
        <span className={`badge text-sm px-3 py-1 rounded-full font-semibold ${badge.color}`}>
          {badge.label}
        </span>
      </div>

      {ci_lower !== null && ci_upper !== null && (
        <div className="mt-3 p-3 bg-white/70 rounded-xl border border-brand-100">
          <p className="text-xs font-medium text-gray-500 mb-1">90% Confidence Interval</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{ci_lower.toFixed(2)}</span>
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full"
                style={{ width: "100%" }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">{ci_upper.toFixed(2)}</span>
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-gray-400 text-xs">Crop</p>
          <p className="font-semibold capitalize">{crop}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100">
          <p className="text-gray-400 text-xs">Soil Type</p>
          <p className="font-semibold capitalize">{soilType}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 col-span-2">
          <p className="text-gray-400 text-xs">Model Used</p>
          <p className="font-semibold">{model_used}</p>
        </div>
      </div>
    </div>
  );
}

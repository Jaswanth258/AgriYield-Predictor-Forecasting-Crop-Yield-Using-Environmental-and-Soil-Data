import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* Crop → Unsplash image URL mapping (free, no API key, high-res) */
const CROP_IMAGES = {
  rice:        "https://images.unsplash.com/photo-1536054960546-15b37f7c9e02?w=800&q=80",
  maize:       "/images/corn_field.png",
  chickpea:    "https://images.unsplash.com/photo-1515589654645-8b1784ebaf0b?w=800&q=80",
  kidneybeans: "https://images.unsplash.com/photo-1551133989-1dc3e5f22f77?w=800&q=80",
  pigeonpeas:  "https://images.unsplash.com/photo-1582284540020-8acbe03f4924?w=800&q=80",
  mothbeans:   "https://images.unsplash.com/photo-1596547609652-9cb5d8d76921?w=800&q=80",
  mungbean:    "https://images.unsplash.com/photo-1515589654645-8b1784ebaf0b?w=800&q=80",
  blackgram:   "https://images.unsplash.com/photo-1551133989-1dc3e5f22f77?w=800&q=80",
  lentil:      "https://images.unsplash.com/photo-1596547609652-9cb5d8d76921?w=800&q=80",
  cotton:      "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=800&q=80",
  jute:        "https://images.unsplash.com/photo-1564419320461-6870880221ad?w=800&q=80",
  coconut:     "https://images.unsplash.com/photo-1560493676-04071c5f467b?w=800&q=80",
  banana:      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=800&q=80",
  default:     "/images/aerial_farm.png",
};

function getCropImage(crop) {
  if (!crop) return CROP_IMAGES.default;
  const key = crop.toLowerCase().trim();
  return CROP_IMAGES[key] ?? CROP_IMAGES.default;
}

export default function ResultCard({ result, crop, soilType, historicalData = [], onOptimize, benchmarks }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [cropImgError, setCropImgError] = useState(false);

  const downloadPDF = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height]
      });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("AgriYield_Report.pdf");
    } catch (err) {
      console.error("PDF generation failed", err);
    } finally {
      setDownloading(false);
    }
  };

  if (!result) return null;

  const { yield_t_ha, total_yield_tonnes, ci_lower, ci_upper, model_used } = result;

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
    <div ref={cardRef} className="card border-2 border-brand-200 bg-gradient-to-br from-brand-50 to-white overflow-hidden p-0">
      {/* Crop image header */}
      <div className="relative h-40 rounded-t-3xl overflow-hidden">
        {cropImgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-teal-700 flex items-center justify-center text-6xl">
            🌾
          </div>
        ) : (
          <img
            src={getCropImage(crop)}
            alt={crop ?? "crop field"}
            className="w-full h-full object-cover"
            onError={() => setCropImgError(true)}
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
          <div>
            <p className="text-white/70 text-[10px] uppercase tracking-widest font-bold">Crop</p>
            <p className="text-white font-extrabold text-lg capitalize leading-tight">{crop ?? "Unknown"}</p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-bold shadow ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Predicted Yield</p>
          <div className="flex items-baseline gap-2">
            <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-brand-600 to-teal-600 drop-shadow-sm filter transition-all duration-500 hover:scale-105">
              {yield_t_ha.toFixed(2)}
            </span>
            <span className="text-lg text-gray-500 font-bold">t/ha</span>
          </div>

          {total_yield_tonnes !== undefined && (
            <div className="mt-5 pt-4 border-t border-brand-100/50">
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mb-1">Estimated Total Harvest</p>
              <div className="flex items-baseline gap-1.5 mt-0.5 group cursor-default">
                <span className="text-4xl font-black text-gray-800 tracking-tight group-hover:text-brand-700 transition-colors">
                  {total_yield_tonnes.toLocaleString()}
                </span>
                <span className="text-base text-gray-500 font-medium">tonnes</span>
              </div>
            </div>
          )}
        </div>
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

      {/* Yield Enhancement Alert */}
      {result.enhancement && (
        <div className={`mt-5 p-4 rounded-xl border flex gap-3 ${
          result.enhancement.is_poor 
            ? "bg-red-50 border-red-100 text-red-800" 
            : "bg-brand-50 border-brand-100 text-brand-800"
        }`}>
          <span className="text-xl">⚠️</span>
          <div>
            <h4 className="font-semibold mb-1">Yield Enhancement Ideas</h4>
            <p className="text-sm opacity-90 leading-relaxed">{result.enhancement.message}</p>
            <div className="mt-3 flex gap-4 text-sm font-medium">
              <span>N: {result.enhancement.recommended_N} kg/ha</span>
              <span>P: {result.enhancement.recommended_P} kg/ha</span>
              <span>K: {result.enhancement.recommended_K} kg/ha</span>
            </div>
            {onOptimize && benchmarks && (
              <button 
                onClick={onOptimize}
                type="button"
                className={`mt-4 w-full flex justify-center items-center py-2 px-3 bg-white border rounded shadow-sm text-sm font-semibold transition-colors ${
                  result.enhancement.is_poor 
                    ? "border-red-200 text-red-700 hover:bg-red-50" 
                    : "border-brand-200 text-brand-700 hover:bg-brand-50"
                }`}
              >
                ✨ Auto-Apply All Optimal Inputs
              </button>
            )}
          </div>
        </div>
      )}

      {/* Historical Ground Truth */}
      {historicalData && historicalData.length > 0 && (
        <div className="mt-6 border-t pt-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <span>📜</span> Historical Ground Truth
          </h4>
          <div className="overflow-x-auto rounded-lg border border-gray-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2 font-medium">Year</th>
                  <th className="px-3 py-2 font-medium text-brand-700">Yield (t/ha)</th>
                  <th className="px-3 py-2 font-medium">Rain (mm)</th>
                  <th className="px-3 py-2 font-medium">N-P-K</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historicalData.map((row, idx) => (
                  <tr key={idx} className="bg-white hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-600">{row.year}</td>
                    <td className="px-3 py-2 font-semibold text-gray-800">{row.yield_t_ha}</td>
                    <td className="px-3 py-2 text-gray-500">{row.rainfall}</td>
                    <td className="px-3 py-2 text-gray-500">{row.N}-{row.P}-{row.K}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 italic text-center">
            Actual dataset records for exact State & Crop match.
          </p>
        </div>
      )}

      {/* How the model works */}
      <div className="mt-8 bg-gradient-to-br from-brand-50/50 to-blue-50/50 rounded-xl p-5 border border-brand-100/60 shadow-inner">
        <h4 className="text-[13px] font-bold text-brand-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <span>🧠</span> How this prediction was made
        </h4>
        <p className="text-sm text-gray-600 leading-relaxed">
          Your inputs were passed through a <span className="font-semibold text-gray-800">VotingRegressor</span> ensemble — combining <span className="font-semibold text-gray-800">RandomForest, XGBoost, and LightGBM</span> — all scaled via a Scikit-Learn StandardScaler pipeline. Regional soil defaults from <span className="font-semibold text-gray-800">state_soil.csv</span> and live weather from <span className="font-semibold text-gray-800">Open-Meteo</span> were used where values were not manually provided. The confidence interval is the <span className="font-semibold text-gray-800">5th–95th percentile</span> of the RandomForest estimator tree predictions (bootstrap).
        </p>
      </div>

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

      <div className="mt-4 bg-teal-50/60 text-teal-800 text-[11px] sm:text-xs px-4 py-3 rounded-xl border border-teal-100/50 flex items-start gap-2 shadow-sm">
        <span className="text-sm">ℹ️</span> 
        <p className="leading-relaxed"><strong>Metric Notation:</strong> The <strong>Total Potential Yield</strong> computes the exact tonnes-per-hectare (t/ha) harvest over your total inputted land area. The <strong>Model Used</strong> indicates which highly-trained ML algorithm (e.g. XGBoost, RandomForest) scored the absolute highest accuracy for this specific geographic subset historically.</p>
      </div>

      <button 
        onClick={downloadPDF} 
        disabled={downloading}
        className="mt-5 w-full btn-secondary py-2.5 text-sm font-semibold border-brand-200 text-brand-700 hover:bg-brand-50"
      >
        {downloading ? "Generating PDF..." : "📥 Download PDF Report"}
      </button>
      </div>{/* end p-6 */}
    </div>
  );
}

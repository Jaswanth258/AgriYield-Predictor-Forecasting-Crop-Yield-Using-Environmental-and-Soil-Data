import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { predictBatch } from "../api";
import toast from "react-hot-toast";

const SAMPLE_CSV = `state,district,area_ha,N,P,K,temperature,humidity,ph,rainfall,soil_type,label
Andhra Pradesh,Anantapur,100,90,42,43,24.5,65,6.5,120,loamy,rice
Punjab,Ludhiana,50,100,55,40,22.0,60,6.8,90,clay,wheat
Gujarat,Surat,200,120,60,50,28.0,70,6.2,150,sandy,maize
Madhya Pradesh,Indore,75,40,55,25,20.0,45,6.5,70,loamy,chickpea
Kerala,Wayanad,120,110,75,45,26.0,72,6.0,130,silty,banana`;

export default function BatchPredict() {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) setFile(accepted[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"] },
    maxFiles: 1,
  });

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await predictBatch(fd);
      setResults(res.data);
      toast.success(`${res.data.count} predictions complete!`);
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Batch prediction failed");
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sample_batch.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadResults = () => {
    if (!results) return;
    const header = "row,yield_t_ha,ci_lower,ci_upper,model_used,enhancement_message\n";
    const rows = results.predictions.map((p, i) =>
      `${i + 1},${p.yield_t_ha},${p.ci_lower},${p.ci_upper},${p.model_used},"${p.enhancement ? p.enhancement.message.replace(/"/g, '""') : 'Average or above'}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "yield_predictions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold">Batch Prediction</h1>
        <p className="text-gray-500 mt-1">Upload a CSV file to predict yield for multiple records at once.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload panel */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">Upload CSV</h2>
            <button onClick={downloadSample} className="btn-secondary text-xs py-2 px-3">
              📥 Download Sample
            </button>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
              isDragActive ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-4xl mb-3">{isDragActive ? "📂" : "📁"}</div>
            {file ? (
              <div>
                <p className="font-semibold text-brand-700">{file.name}</p>
                <p className="text-sm text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-600">Drag & drop a CSV file here</p>
                <p className="text-sm text-gray-400 mt-1">or click to browse</p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : "🚀 Run Predictions"}
              </button>
              <button onClick={() => { setFile(null); setResults(null); }} className="btn-secondary">
                Clear
              </button>
            </div>
          )}

          {/* CSV format reference */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Expected Columns</p>
            <div className="grid grid-cols-4 gap-1">
              {["state", "district", "area_ha", "label", "N", "P", "K", "temperature", "humidity", "ph", "rainfall", "soil_type"].map((c) => (
                <span key={c} className="text-[10px] font-mono bg-white border border-gray-200 rounded px-1 py-1 text-center truncate">
                  {c}
                </span>
              ))}
            </div>
          </div>

          {/* Educational Explanation */}
          <div className="mt-6 bg-gradient-to-br from-brand-50/50 to-blue-50/50 rounded-xl p-5 border border-brand-100/60 shadow-inner">
            <h4 className="text-[13px] font-bold text-brand-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <span>🧠</span> How the AI works
            </h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              When you upload a CSV, our AI evaluates every single row independently. Just as it does for a single farm, the XGBoost engine extracts the specific State, District, Crop, and precise soil metrics of that specific row and compares it against decades of real-world agricultural harvest histories to mathematically calculate the most realistic crop yield possible.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-800">
              Results {results && <span className="text-brand-600">({results.count})</span>}
            </h2>
            {results && (
              <button onClick={downloadResults} className="btn-secondary text-xs py-2 px-3">
                📤 Export CSV
              </button>
            )}
          </div>

          {results && (
            <div className="bg-blue-50/50 text-blue-800 text-xs px-3 py-2 rounded-lg border border-blue-100 flex items-start gap-2 mb-2 mt-2">
              <span>ℹ️</span> 
              <p><strong>Note on Metrics:</strong> Yield is measured in Tonnes per Hectare (t/ha). The <strong>CI Range</strong> displays the expected highs and lows caused by historical weather variances. Any <strong>Action/Suggestion</strong> alerts you if your inputs fall severely below the top 25% highest yielding past regional farms.</p>
            </div>
          )}

          {results ? (
            <div className="overflow-auto max-h-[500px]">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 border-b">#</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 border-b">Yield (t/ha)</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 border-b">CI Range</th>
                    <th className="text-left py-2 px-3 font-semibold text-gray-600 border-b">Enhancement</th>
                  </tr>
                </thead>
                <tbody>
                  {results.predictions.map((p, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-400">{i + 1}</td>
                      <td className={`py-2 px-3 font-bold ${p.enhancement ? "text-red-500" : "text-brand-700"}`}>{p.yield_t_ha.toFixed(3)}</td>
                      <td className="py-2 px-3 text-gray-500">{(p.ci_lower !== null && p.ci_upper !== null) ? `${p.ci_lower.toFixed(2)} - ${p.ci_upper.toFixed(2)}` : "—"}</td>
                      <td className="py-2 px-3 text-xs text-gray-500">{p.enhancement ? `⚠️ ${p.enhancement.recommended_N}/${p.enhancement.recommended_P}/${p.enhancement.recommended_K}` : "✅ OK"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <span className="text-5xl mb-3">📊</span>
              <p className="font-medium">Predictions will appear here</p>
              <p className="text-sm mt-1">Upload a CSV and run predictions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

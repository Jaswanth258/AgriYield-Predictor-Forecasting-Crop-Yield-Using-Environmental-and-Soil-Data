import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  timeout: 120000, // 2 min — training can take a while on first load
});

export const getHealth = () => api.get("/health");
export const getMeta = () => api.get("/meta");

export const predictYield = (payload) => api.post("/predict", payload);

export const predictBatch = (formData) =>
  api.post("/predict/batch", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const getYieldByCrop = () => api.get("/eda/yield-by-crop");
export const getCorrelation = () => api.get("/eda/correlation");
export const getDistributions = () => api.get("/eda/distributions");
export const getScatter = (feature) => api.get(`/eda/scatter/${feature}`);
export const getShap = () => api.get("/eda/shap");

export const triggerTrain = () => api.post("/train");

export default api;

import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import Predict from "./pages/Predict";
import BatchPredict from "./pages/BatchPredict";
import EDA from "./pages/EDA";
import ModelInfo from "./pages/ModelInfo";

export default function App() {
  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        {/* Full-screen landing — no Layout wrapper */}
        <Route path="/" element={<Landing />} />

        {/* Dashboard routes — inside Layout */}
        <Route element={<Layout />}>
          <Route path="/home" element={<Home />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/batch" element={<BatchPredict />} />
          <Route path="/eda" element={<EDA />} />
          <Route path="/model" element={<ModelInfo />} />
        </Route>

        {/* Catch-all → landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

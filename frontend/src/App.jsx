import { Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Layout from "./components/Layout";
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
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/batch" element={<BatchPredict />} />
          <Route path="/eda" element={<EDA />} />
          <Route path="/model" element={<ModelInfo />} />
        </Route>
      </Routes>
    </>
  );
}

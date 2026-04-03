import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ─── crop image map (local + Unsplash fallbacks) ─── */
const FEATURES = [
  {
    icon: "🔬",
    title: "Ensemble Yield Prediction",
    desc: "Built a custom VotingRegressor combining RandomForest, XGBoost, and LightGBM — all scaled through a Scikit-Learn pipeline and serialized via joblib. Enter NPK levels, pH, and soil type to get a prediction in tonnes per hectare.",
    color: "from-emerald-500/20 to-teal-500/20",
    border: "border-emerald-400/30",
    img: "/images/soil_nutrient.png",
  },
  {
    icon: "🌦️",
    title: "Open-Meteo Live Weather",
    desc: "When environmental data is unavailable, it auto-geocodes your district using the Open-Meteo Geocoding API, then fetches real-time temperature, humidity, and precipitation — no manual input needed.",
    color: "from-blue-500/20 to-cyan-500/20",
    border: "border-blue-400/30",
    img: "/images/aerial_farm.png",
  },
  {
    icon: "📊",
    title: "Batch CSV & SHAP Analysis",
    desc: "Upload a CSV of multiple field records via POST /predict/batch. On the EDA page, visualize SHAP feature importances, yield distributions by crop, correlation matrices, and scatter plots.",
    color: "from-violet-500/20 to-purple-500/20",
    border: "border-violet-400/30",
    img: "/images/rice_paddy.png",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Select Region & Crop",
    desc: "Choose your Indian state, district, area in hectares, and crop type. The backend auto-geocodes your district via Open-Meteo to fetch current temperature, humidity, and precipitation.",
    icon: "📍",
  },
  {
    num: "02",
    title: "Provide Soil Inputs",
    desc: "Enter Nitrogen (N), Phosphorus (P), Potassium (K), soil pH, and soil type. Or enable Auto-fill — regional defaults are loaded from state_soil.csv and state_weather.csv averages.",
    icon: "🧪",
  },
  {
    num: "03",
    title: "Get Ensemble Prediction",
    desc: "The VotingRegressor (RF + XGBoost + LightGBM) outputs yield in t/ha with a 90% confidence interval. If your NPK is below the top-25% benchmark, a yield enhancement suggestion is shown.",
    icon: "🤖",
  },
];

const TECH_STACK = [
  { name: "RandomForest", badge: "ML" },
  { name: "XGBoost", badge: "ML" },
  { name: "LightGBM", badge: "ML" },
  { name: "Scikit-Learn", badge: "ML" },
  { name: "SHAP", badge: "Explainability" },
  { name: "FastAPI", badge: "Backend" },
  { name: "React 18 + Vite", badge: "Frontend" },
  { name: "Tailwind CSS", badge: "Styling" },
  { name: "Recharts", badge: "Visualization" },
  { name: "Open-Meteo API", badge: "Weather" },
  { name: "joblib", badge: "Serialization" },
  { name: "html2canvas + jsPDF", badge: "Export" },
];

/* ── Typewriter hook ── */
function useTypewriter(texts, speed = 80, pause = 2200) {
  const [display, setDisplay] = useState("");
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[idx];
    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => setCharIdx((c) => c + 1), speed);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), pause);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx((c) => c - 1), speed / 2);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % texts.length);
    }
    setDisplay(current.slice(0, charIdx));
  }, [charIdx, deleting, idx, texts, speed, pause]);

  useEffect(() => {
    setDisplay(texts[idx].slice(0, charIdx));
  }, [charIdx, idx, texts]);

  return display;
}

/* ── Floating grain particle ── */
function GrainParticles() {
  const particles = Array.from({ length: 18 }, (_, i) => i);
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {particles.map((i) => (
        <div
          key={i}
          className="grain-particle"
          style={{
            left: `${(i * 17 + 5) % 100}%`,
            animationDelay: `${i * 0.4}s`,
            animationDuration: `${6 + (i % 5)}s`,
            opacity: 0.18 + (i % 4) * 0.07,
            fontSize: `${12 + (i % 3) * 6}px`,
          }}
        >
          {["🌾", "🌿", "✨", "🌱"][i % 4]}
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [visible, setVisible] = useState({});

  const typeText = useTypewriter([
    "Predict Crop Yield with AI",
    "Powered by XGBoost + LightGBM",
    "Live Weather. Real Soil Data.",
    "Ensemble ML for Indian Agriculture",
  ]);

  /* ── Parallax on scroll ── */
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const handleScroll = () => {
      const scrollY = window.scrollY;
      if (hero) hero.style.backgroundPositionY = `${scrollY * 0.4}px`;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* ── Intersection observer for section animations ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible((v) => ({ ...v, [e.target.dataset.section]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll("[data-section]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="landing-root">
      {/* ══════════ HERO SECTION ══════════ */}
      <section
        ref={heroRef}
        className="landing-hero"
        style={{
          backgroundImage: imgError
            ? "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #047857 70%, #0d9488 100%)"
            : `url(/images/hero_wheat.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          backgroundAttachment: "fixed",
        }}
      >
        {/* Preload hero image silently */}
        <img
          src="/images/hero_wheat.png"
          alt=""
          style={{ display: "none" }}
          onLoad={() => setHeroLoaded(true)}
          onError={() => setImgError(true)}
        />

        {/* Dark gradient overlay */}
        <div className="landing-hero-overlay" />

        {/* Grain particles */}
        <GrainParticles />

        {/* Green tint vignette */}
        <div className="landing-vignette" />

        {/* Hero content */}
        <div className="landing-hero-content">
          {/* Badge */}
          <div className="landing-badge">
            <span className="landing-badge-dot" />
            AgriYield Predictor · India Edition
          </div>

          {/* Animated headline */}
          <h1 className="landing-title">
            <span className="landing-title-static">ML-Powered</span>
            <br />
            <span className="landing-title-typed">
              {typeText}
              <span className="landing-cursor">|</span>
            </span>
          </h1>

          <p className="landing-subtitle">
            A full-stack crop yield prediction system built with a custom <strong style={{color:'#6ee7b7'}}>VotingRegressor</strong> (RandomForest + XGBoost + LightGBM),
            live weather via <strong style={{color:'#6ee7b7'}}>Open-Meteo API</strong>, regional soil defaults,
            batch CSV processing, SHAP explainability, and a PDF export — all connected to a FastAPI backend.
          </p>

          {/* CTA buttons */}
          <div className="landing-cta-group">
            <button
              id="enter-dashboard-btn"
              onClick={() => navigate("/home")}
              className="landing-cta-primary"
            >
              <span>🌾 Enter Dashboard</span>
              <span className="landing-cta-arrow">→</span>
            </button>
            <button
              onClick={() => navigate("/predict")}
              className="landing-cta-secondary"
            >
              ✨ Quick Predict
            </button>
          </div>

          {/* Quick stats strip */}
          <div className="landing-stats-strip">
            {[
              { val: "3", label: "ML Models in Ensemble" },
              { val: "5th–95th", label: "Percentile CI (Bootstrap)" },
              { val: "7", label: "Soil & Weather Features" },
              { val: "Top 25%", label: "Farm Data for Auto-Optimize" },
            ].map((s) => (
              <div key={s.label} className="landing-stat-item">
                <span className="landing-stat-val">{s.val}</span>
                <span className="landing-stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll down hint */}
        <div className="landing-scroll-hint">
          <div className="landing-scroll-icon" />
          <span>Scroll to explore</span>
        </div>
      </section>

      {/* ══════════ FEATURE CARDS ══════════ */}
      <section
        className={`landing-section landing-features ${visible["features"] ? "section-visible" : "section-hidden"}`}
        data-section="features"
      >
        <div className="landing-section-inner">
          <div className="landing-section-label">What's Inside</div>
          <h2 className="landing-section-title">Three Core Capabilities, Fully Implemented</h2>
          <p className="landing-section-sub">
            Each feature is connected end-to-end — from the FastAPI backend endpoints to the React UI. Nothing is mocked or placeholder.
          </p>

          <div className="landing-feature-grid">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`landing-feature-card ${f.border}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              >
                {/* Card image */}
                <div className="landing-feature-img-wrap">
                  <img
                    src={f.img}
                    alt={f.title}
                    className="landing-feature-img"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                  <div className="landing-feature-img-fallback" style={{ display: "none" }}>
                    {f.icon}
                  </div>
                  <div className={`landing-feature-img-overlay bg-gradient-to-br ${f.color}`} />
                </div>
                <div className="landing-feature-body">
                  <span className="landing-feature-icon">{f.icon}</span>
                  <h3 className="landing-feature-title">{f.title}</h3>
                  <p className="landing-feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ HOW IT WORKS ══════════ */}
      <section
        className={`landing-section landing-howto ${visible["howto"] ? "section-visible" : "section-hidden"}`}
        data-section="howto"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(2,44,34,0.96), rgba(5,60,48,0.93)), url(/images/corn_field.png)`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="landing-section-inner">
          <div className="landing-section-label" style={{ color: "#6ee7b7" }}>
            How It Works
          </div>
          <h2 className="landing-section-title" style={{ color: "#fff" }}>
            Predict in 3 Simple Steps
          </h2>

          <div className="landing-steps-grid">
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                className="landing-step-card"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                <div className="landing-step-num">{s.num}</div>
                <div className="landing-step-icon">{s.icon}</div>
                <h3 className="landing-step-title">{s.title}</h3>
                <p className="landing-step-desc">{s.desc}</p>
                {i < STEPS.length - 1 && <div className="landing-step-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════ TECH STACK ══════════ */}
      <section
        className={`landing-section landing-tech ${visible["tech"] ? "section-visible" : "section-hidden"}`}
        data-section="tech"
      >
        <div className="landing-section-inner">
          <div className="landing-section-label">Tech Stack</div>
          <h2 className="landing-section-title">What We Actually Used to Build This</h2>

          <div className="landing-tech-grid">
            {TECH_STACK.map((t) => (
              <div key={t.name} className="landing-tech-pill">
                <span className="landing-tech-badge">{t.badge}</span>
                <span className="landing-tech-name">{t.name}</span>
              </div>
            ))}
          </div>

          {/* Image strip */}
          <div className="landing-img-strip">
            <img
              src="/images/aerial_farm.png"
              alt="Indian agricultural fields from above"
              className="landing-strip-img"
              loading="lazy"
              onError={(e) => (e.target.style.display = "none")}
            />
            <div className="landing-strip-overlay">
              <p className="landing-strip-quote">
                "Built on merged agricultural datasets — NPK soil records, district-level weather averages, and real crop yield ground truth — all processed through a Scikit-Learn VotingRegressor pipeline."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════ FINAL CTA ══════════ */}
      <section className="landing-final-cta">
        <div className="landing-final-cta-inner">
          <h2 className="landing-final-title">See It In Action</h2>
          <p className="landing-final-sub">
            Select a state, enter your NPK values (or use auto-fill), pick a crop, and hit Predict
            — the VotingRegressor returns your yield estimate with a confidence interval in under a second.
          </p>
          <div className="landing-cta-group">
            <button
              onClick={() => navigate("/home")}
              className="landing-cta-primary"
              id="final-enter-dashboard-btn"
            >
              <span>🌾 Enter Dashboard</span>
              <span className="landing-cta-arrow">→</span>
            </button>
            <button
              onClick={() => navigate("/predict")}
              className="landing-cta-secondary-dark"
            >
              ✨ Start Predicting
            </button>
          </div>
        </div>
      </section>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="landing-footer">
        <span>🌾 AgriYield Predictor</span>
        <span>ML-powered crop yield forecasting for Indian agriculture</span>
        <span>FastAPI · React · XGBoost · LightGBM · Open-Meteo</span>
      </footer>
    </div>
  );
}

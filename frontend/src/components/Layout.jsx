import { Outlet, NavLink, Link } from "react-router-dom";
import { useState } from "react";

const links = [
  { to: "/home", label: "Home", icon: "🏠" },
  { to: "/predict", label: "Predict", icon: "🌾" },
  { to: "/batch", label: "Batch", icon: "📊" },
  { to: "/eda", label: "Analysis", icon: "📈" },
  { to: "/model", label: "Model Info", icon: "🤖" },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col relative z-0">
      <div className="bg-mesh"><div className="bg-mesh-center"></div></div>
      
      {/* Top nav */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-white/60 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-xs text-gray-400 hover:text-brand-600 font-medium transition-colors hidden sm:block">← Landing</Link>
              <div className="w-px h-4 bg-gray-200 hidden sm:block" />
              <span className="text-2xl">🌾</span>
              <div>
                <span className="font-bold text-brand-700 text-lg leading-none">AgriYield</span>
                <span className="block text-xs text-gray-500 leading-none">Predictor</span>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-brand-50 text-brand-700"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  <span>{l.icon}</span>
                  {l.label}
                </NavLink>
              ))}
            </nav>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-white/50 bg-white/90 backdrop-blur-xl px-4 py-3 space-y-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium w-full ${
                    isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                  }`
                }
              >
                <span>{l.icon}</span>
                {l.label}
              </NavLink>
            ))}
          </div>
        )}
      </header>

      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <Outlet />
      </main>

      <footer className="border-t border-white/50 bg-white/40 backdrop-blur-sm mt-8">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between text-xs text-gray-500 font-medium">
          <span>AgriYield Predictor — ML-powered crop yield forecasting</span>
          <span>Powered by FastAPI + React + scikit-learn / XGBoost / LightGBM</span>
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from "react";

const STAGES = [
  {
    title: "Awaiting Data",
    desc: "Enter your environmental parameters to begin the prediction.",
    svg: (
      <svg viewBox="0 0 100 100" className="w-32 h-32 mx-auto text-brand-200 overflow-visible filter drop-shadow-[0_10px_10px_rgba(20,184,166,0.2)]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 20 80 L 80 80" strokeWidth="4" className="text-amber-700/20" />
        <circle cx="50" cy="80" r="4" fill="currentColor" className="text-amber-800/40" />
        <path d="M 20 30 Q 50 10 80 30" stroke="url(#sunGradient)" strokeWidth="6" strokeDasharray="5 10" className="animate-pulse" />
        <defs>
          <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FDE68A" />
            <stop offset="100%" stopColor="#FCD34D" />
          </linearGradient>
        </defs>
      </svg>
    )
  },
  {
    title: "Simulating Growth",
    desc: "Our XGBoost AI models the exact conditions against historical ground truth.",
    svg: (
      <svg viewBox="0 0 100 100" className="w-32 h-32 mx-auto text-brand-500 overflow-visible filter drop-shadow-[0_15px_15px_rgba(20,184,166,0.3)]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <style>{`
          .animate-grow-stem {
            stroke-dasharray: 100;
            stroke-dashoffset: 100;
            animation: growStem 1.5s ease-out forwards;
          }
          .animate-grow-leaf-1 {
            transform-origin: 50% 100%;
            transform: scale(0);
            animation: growLeaf 1s ease-out 0.8s forwards;
          }
          .animate-grow-leaf-2 {
            transform-origin: 50% 100%;
            transform: scale(0);
            animation: growLeaf 1s ease-out 1.2s forwards;
          }
          @keyframes growStem { to { stroke-dashoffset: 0; } }
          @keyframes growLeaf { to { transform: scale(1); } }
        `}</style>
        <path d="M 20 80 L 80 80" strokeWidth="4" className="text-amber-700/20" />
        <path className="animate-grow-stem" d="M 50 80 Q 45 50 50 25" />
        <path className="animate-grow-leaf-1 text-emerald-400" d="M 48 60 Q 30 60 30 45 Q 40 40 48 60" fill="currentColor" stroke="none" />
        <path className="animate-grow-leaf-2 text-brand-400" d="M 50 40 Q 75 35 70 20 Q 60 15 50 40" fill="currentColor" stroke="none" />
      </svg>
    )
  },
  {
    title: "Maximizing Yield",
    desc: "Discovering perfect N-P-K ratios to elevate your farming potential.",
    svg: (
      <svg viewBox="0 0 100 100" className="w-40 h-40 -mt-4 mx-auto text-brand-600 overflow-visible filter drop-shadow-[0_15px_20px_rgba(16,185,129,0.4)]" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 20 80 L 80 80" strokeWidth="4" className="text-amber-700/30" />
        <path d="M 50 80 Q 45 50 50 25" />
        <path className="text-emerald-500" d="M 48 60 Q 25 60 25 40 Q 40 35 48 60" fill="currentColor" stroke="none" />
        <path className="text-brand-500" d="M 50 40 Q 80 35 75 15 Q 60 10 50 40" fill="currentColor" stroke="none" />
        <path className="text-emerald-400" d="M 50 25 Q 35 25 35 10 Q 45 5 50 20" fill="currentColor" stroke="none" />
        
        {/* Magic sparkles */}
        <circle cx="20" cy="20" r="2" fill="#FCD34D" className="animate-ping" stroke="none" />
        <circle cx="80" cy="40" r="1.5" fill="#FCD34D" className="animate-ping" style={{ animationDelay: "0.5s" }} stroke="none" />
        <circle cx="60" cy="10" r="2.5" fill="#FDE68A" className="animate-ping" style={{ animationDelay: "1s" }} stroke="none" />
      </svg>
    )
  }
];

export default function EmptyStateCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % STAGES.length);
    }, 4500); // Change perfectly every 4.5 seconds for calmness
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-white/60 bg-gradient-to-b from-white/30 to-brand-50/20 backdrop-blur-2xl shadow-xl shadow-brand-500/5 overflow-hidden relative transition-all duration-500 hover:shadow-2xl hover:bg-white/40">
      <div className="absolute inset-0 bg-white/20 pointer-events-none rounded-3xl" />
      
      <div className="relative z-10 w-full h-40 flex items-center justify-center">
        {STAGES.map((stage, idx) => (
          <div
            key={idx}
            className={`absolute transition-all duration-1000 ease-in-out transform ${
              idx === current 
                ? "opacity-100 translate-y-0 scale-100" 
                : "opacity-0 translate-y-8 scale-95 pointer-events-none"
            }`}
          >
            {stage.svg}
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-6 h-24 w-full">
        {STAGES.map((stage, idx) => (
          <div
            key={idx}
            className={`absolute w-full top-0 left-0 transition-opacity duration-1000 ease-in-out ${
              idx === current ? "opacity-100" : "opacity-0"
            }`}
          >
            <h3 className="text-lg font-semibold text-gray-800">{stage.title}</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-[250px] mx-auto leading-relaxed">
              {stage.desc}
            </p>
          </div>
        ))}
      </div>
      
      {/* Dots */}
      <div className="relative z-10 flex gap-2 mt-6">
        {STAGES.map((_, idx) => (
          <div 
            key={idx} 
            className={`h-1.5 rounded-full transition-all duration-700 ${
              idx === current ? "w-6 bg-brand-400" : "w-1.5 bg-gray-200"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

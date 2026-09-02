"use client";

import React, { useEffect, useState } from "react";
import { FileText, FileSpreadsheet, FileJson, CheckCircle, TrendingDown, ShieldCheck, Zap } from "lucide-react";

export function MagicTransform() {
  const [key, setKey] = useState(0);

  // Restart animations periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setKey(k => k + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div key={key} className="relative w-full max-w-[800px] h-[300px] flex items-center justify-center mx-auto overflow-hidden rounded-3xl bg-white border border-slate-200/80 shadow-[0_20px_60px_-15px_rgba(99,102,241,0.12)]">
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Subtle Glow Behind Center */}
      <div className="absolute w-64 h-64 bg-indigo-100/60 rounded-full blur-3xl pointer-events-none" />

      {/* Central ARES Processing Node */}
      <div className="relative z-20 flex flex-col items-center justify-center">
        {/* Pulsing rings */}
        <div className="absolute w-32 h-32 bg-indigo-500/15 rounded-full animate-ping" style={{ animationDuration: '2.5s' }} />
        <div className="absolute w-28 h-28 bg-indigo-500/20 rounded-full animate-pulse" />
        
        {/* Core Node */}
        <div className="relative w-20 h-20 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 rounded-2xl flex items-center justify-center shadow-[0_12px_35px_rgba(79,70,229,0.35)] z-30 overflow-hidden group border-2 border-indigo-200/60">
          <div className="absolute inset-0 bg-white/10 group-hover:bg-white/20 transition-colors" />
          <Zap className="w-10 h-10 text-white fill-white animate-pulse" />
          
          {/* Inner scanline */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-200 opacity-90" style={{ animation: 'scan 1.5s linear infinite' }} />
        </div>
        
        <span className="mt-4 font-mono text-xs font-black text-indigo-700 tracking-wider uppercase bg-indigo-50/90 px-4 py-1.5 rounded-full border border-indigo-200/80 shadow-sm">
          ARES Engine
        </span>
      </div>

      {/* Flying In Documents (Raw Data) */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1/3 h-full pointer-events-none z-10">
        <div className="magic-fly-in absolute top-[20%] left-[-20%] p-3 bg-white rounded-xl border border-slate-200 shadow-md flex items-center justify-center" style={{ animationDelay: '0s' }}>
          <FileText className="w-6 h-6 text-indigo-600" />
        </div>
        <div className="magic-fly-in absolute top-[50%] left-[-30%] p-3 bg-white rounded-xl border border-slate-200 shadow-md flex items-center justify-center" style={{ animationDelay: '0.6s' }}>
          <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
        </div>
        <div className="magic-fly-in absolute top-[70%] left-[-10%] p-3 bg-white rounded-xl border border-slate-200 shadow-md flex items-center justify-center" style={{ animationDelay: '1.2s' }}>
          <FileJson className="w-6 h-6 text-amber-600" />
        </div>
      </div>

      {/* Flying Out Results (Optimized Data - High Contrast & Full Opacity) */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/3 h-full pointer-events-none z-10">
        <div className="magic-fly-out absolute top-[20%] left-0 px-4 py-2.5 bg-white rounded-xl border-2 border-emerald-300 shadow-[0_8px_20px_rgba(16,185,129,0.18)] flex items-center gap-2.5" style={{ animationDelay: '1.5s' }}>
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-extrabold text-emerald-800 tracking-tight">Route OK</span>
        </div>
        <div className="magic-fly-out absolute top-[50%] left-0 px-4 py-2.5 bg-white rounded-xl border-2 border-blue-300 shadow-[0_8px_20px_rgba(59,130,246,0.18)] flex items-center gap-2.5" style={{ animationDelay: '2.1s' }}>
          <TrendingDown className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="text-xs font-extrabold text-blue-800 tracking-tight">-$34k Cost</span>
        </div>
        <div className="magic-fly-out absolute top-[70%] left-0 px-4 py-2.5 bg-white rounded-xl border-2 border-amber-300 shadow-[0_8px_20px_rgba(245,158,11,0.18)] flex items-center gap-2.5" style={{ animationDelay: '2.7s' }}>
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
          <span className="text-xs font-extrabold text-amber-800 tracking-tight">Secured</span>
        </div>
      </div>

      <style>{`
        @keyframes magic-fly-in {
          0% {
            transform: translateX(0) scale(1) rotate(-10deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          60% {
            transform: translateX(200px) scale(0.6) rotate(15deg);
            opacity: 0;
          }
          100% {
            transform: translateX(200px) scale(0.6);
            opacity: 0;
          }
        }
        
        @keyframes magic-fly-out {
          0% {
            transform: translateX(0) scale(0.5);
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          70% {
            transform: translateX(180px) scale(1.1) rotate(5deg);
            opacity: 1;
          }
          100% {
            transform: translateX(220px) scale(1);
            opacity: 0;
          }
        }

        @keyframes scan {
          0% { top: -10%; }
          100% { top: 110%; }
        }

        .magic-fly-in {
          animation: magic-fly-in 3.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        
        .magic-fly-out {
          animation: magic-fly-out 3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}

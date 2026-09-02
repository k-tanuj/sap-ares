"use client";

import React from "react";
import { Factory, Package, Truck, Globe, Shield, Activity } from "lucide-react";

export function Circles() {
  return (
    <div className="relative flex items-center justify-center w-full max-w-[500px] aspect-square mx-auto">
      
      {/* Center Element */}
      <div className="absolute z-50 flex items-center justify-center w-24 h-24 bg-indigo-600 rounded-full shadow-[0_0_40px_rgba(79,70,229,0.5)] border-4 border-slate-950">
        <Shield className="w-10 h-10 text-white" />
      </div>

      {/* Ring 1 - Inner */}
      <div className="absolute w-[200px] h-[200px] rounded-full border border-slate-700/50 border-dashed animate-[spin_15s_linear_infinite]">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-indigo-500/50 p-2 rounded-full animate-[spin_15s_linear_infinite_reverse]">
          <Factory className="w-5 h-5 text-indigo-400" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-slate-900 border border-emerald-500/50 p-2 rounded-full animate-[spin_15s_linear_infinite_reverse]">
          <Package className="w-5 h-5 text-emerald-400" />
        </div>
      </div>

      {/* Ring 2 - Middle */}
      <div className="absolute w-[320px] h-[320px] rounded-full border border-slate-700/40 animate-[spin_25s_linear_infinite_reverse]">
        <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-amber-500/50 p-3 rounded-full animate-[spin_25s_linear_infinite]">
          <Truck className="w-6 h-6 text-amber-400" />
        </div>
        <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-blue-500/50 p-3 rounded-full animate-[spin_25s_linear_infinite]">
          <Globe className="w-6 h-6 text-blue-400" />
        </div>
        <div className="absolute bottom-4 right-12 translate-x-1/2 bg-slate-900 border border-pink-500/50 p-2 rounded-full animate-[spin_25s_linear_infinite]">
          <Activity className="w-4 h-4 text-pink-400" />
        </div>
      </div>

      {/* Ring 3 - Outer */}
      <div className="absolute w-[440px] h-[440px] rounded-full border border-slate-700/30 border-dashed animate-[spin_35s_linear_infinite]">
        <div className="absolute top-8 left-16 bg-slate-800 p-2.5 rounded-full border border-slate-600 animate-[spin_35s_linear_infinite_reverse] shadow-lg">
          <img src="https://api.dicebear.com/7.x/shapes/svg?seed=SupplierA" alt="Supplier" className="w-8 h-8 rounded-full" />
        </div>
        <div className="absolute bottom-12 right-12 bg-slate-800 p-2.5 rounded-full border border-slate-600 animate-[spin_35s_linear_infinite_reverse] shadow-lg">
          <img src="https://api.dicebear.com/7.x/shapes/svg?seed=SupplierB" alt="Supplier" className="w-8 h-8 rounded-full" />
        </div>
        <div className="absolute top-1/2 right-[-16px] -translate-y-1/2 bg-slate-800 p-2 rounded-full border border-slate-600 animate-[spin_35s_linear_infinite_reverse] shadow-lg">
          <img src="https://api.dicebear.com/7.x/shapes/svg?seed=SupplierC" alt="Supplier" className="w-6 h-6 rounded-full" />
        </div>
      </div>
      
      {/* Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />
    </div>
  );
}

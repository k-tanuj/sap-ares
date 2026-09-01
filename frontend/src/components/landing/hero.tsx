import Link from 'next/link';
import { Shield, Settings, Activity, Network } from 'lucide-react';

export function Hero() {
  return (
    <section id="home" className="relative overflow-hidden bg-gray-50 pt-16 md:pt-24 lg:pt-32">
      <div className="container mx-auto px-4 md:px-8 text-center">
        {/* Main Text */}
        <div className="mx-auto max-w-4xl space-y-6 flex flex-col items-center">
          <span className="text-[10px] font-bold tracking-widest text-indigo-600 uppercase bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100 mb-2">
            Autonomous Resilience & Enterprise Sourcing
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl lg:text-7xl text-balance">
            The Self-Healing Supply Chain Control Plane
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 md:text-xl leading-relaxed text-balance">
            Mitigate geopolitical tariffs, trade customs disruptions, and capacity deficits autonomously. ARES combines LangGraph AI orchestration with Google OR-Tools mathematical optimization to secure enterprise networks.
          </p>
        </div>

        {/* Visual Element Placeholder (High-Tech ARES Theme) */}
        <div className="mx-auto mt-16 max-w-5xl relative">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]" />
          
          <div className="relative aspect-[2/1] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-pink-50 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center">
             
             {/* Center glowing orb/network */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-indigo-200/40 blur-[80px]"></div>
             
             {/* Floating Nodes (LangGraph/Agents) */}
             <div className="absolute top-1/4 left-1/4 w-48 bg-white/80 backdrop-blur border border-white rounded-xl p-4 shadow-sm transform -rotate-3 flex flex-col gap-3 z-20">
                <div className="flex items-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider">
                  <Activity className="w-4 h-4" /> Detection Agent
                </div>
                <div className="text-xs text-slate-500">Monitoring global tariffs...</div>
                <div className="w-full bg-indigo-50 rounded-full h-1.5"><div className="bg-indigo-400 h-1.5 rounded-full w-[85%]"></div></div>
             </div>

             <div className="absolute bottom-1/4 right-1/4 w-52 bg-white/80 backdrop-blur border border-white rounded-xl p-4 shadow-sm transform rotate-2 flex flex-col gap-3 z-20">
                <div className="flex items-center gap-2 text-indigo-500 text-xs font-bold uppercase tracking-wider">
                  <Settings className="w-4 h-4" /> OR-Tools Optimizer
                </div>
                <div className="text-[10px] font-mono text-indigo-600 bg-indigo-50 p-2 rounded">
                  {">"} Solving capacity model...<br/>
                  {">"} Optimal route found.
                </div>
             </div>

             {/* Central Map/Network Graphic Mockup */}
             <div className="relative z-10 w-2/3 h-1/2 bg-white/60 backdrop-blur-sm rounded-2xl border border-white shadow-sm flex items-center justify-center overflow-hidden">
                <Network className="w-32 h-32 text-indigo-200 absolute" />
                <div className="text-center">
                   <div className="text-2xl font-bold text-slate-800 mb-2">ARES Command Center</div>
                   <div className="text-xs text-slate-500 font-mono">Status: Network Secured</div>
                </div>
             </div>
             
          </div>
        </div>

        {/* Tech Stack Strip */}
        <div className="mt-20 border-y border-gray-100 bg-white py-8">
          <p className="text-center text-xs font-bold tracking-widest uppercase text-gray-400 mb-6">Powered By</p>
          <div className="flex flex-wrap items-center justify-center gap-12 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            <div className="font-bold text-xl text-slate-700">SAP HANA</div>
            <div className="font-bold text-xl text-slate-700">LangGraph</div>
            <div className="font-bold text-xl text-slate-700">Google OR-Tools</div>
            <div className="font-bold text-xl text-slate-700">FastAPI</div>
          </div>
        </div>
      </div>
    </section>
  );
}

import Link from 'next/link';
import { Shield, Settings, Activity } from 'lucide-react';
import { MagicTransform } from '../ui/magic-transform';

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

         {/* Visual Element: Magic Transform UI */}
         <div className="mx-auto mt-16 max-w-5xl relative flex justify-center py-20 pb-32">
            <MagicTransform />
         </div>

        {/* Tech Stack Strip */}
        <div className="mt-8 border-y border-gray-100 bg-white py-8">
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

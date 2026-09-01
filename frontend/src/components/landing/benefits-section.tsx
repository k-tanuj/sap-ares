import { Database, Cpu, Globe, TrendingUp } from 'lucide-react';

export function BenefitsSection() {
  return (
    <section id="architecture" className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-8">
        
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left Text & Integrations */}
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
              Enterprise SAP Integrations
            </h2>
            <p className="text-gray-600 md:text-lg mb-10 leading-relaxed">
              ARES runs operational business workflows securely inside a dedicated PostgreSQL node while communicating with the SAP ERP trial boundary using optimized adapters.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Database className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">SAP HANA Cloud</h4>
                  <p className="text-xs text-gray-500">Master Material & Plant Records</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Cpu className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">SAP Generative AI Hub</h4>
                  <p className="text-xs text-gray-500">Controlled LLM Orchestration</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <Globe className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">SAP Integration Suite</h4>
                  <p className="text-xs text-gray-500">Bidirectional OData Boundaries</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <TrendingUp className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">SAP Analytics Cloud</h4>
                  <p className="text-xs text-gray-500">Executive Resilience Dashboards</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Architecture Terminal Visual */}
          <div className="relative">
             {/* Decorative background glow */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-indigo-500/10 rounded-full blur-[100px]"></div>
             
             <div className="bg-slate-900 rounded-[2rem] border border-slate-800 p-8 shadow-2xl relative z-10 font-mono overflow-hidden">
               {/* Terminal header */}
               <div className="flex gap-2 mb-6 border-b border-slate-800 pb-4">
                 <div className="w-3 h-3 rounded-full bg-red-500"></div>
                 <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                 <div className="w-3 h-3 rounded-full bg-green-500"></div>
               </div>
               
               <div className="text-sm space-y-5 text-slate-300">
                 <div className="text-slate-500 opacity-70">{"// ARES System Connectivity"}</div>
                 
                 <div className="space-y-2">
                   <div className="text-indigo-400 font-bold bg-indigo-500/10 inline-block px-2 py-1 rounded">Buyer/Supplier Portals</div>
                   <div className="text-slate-500 pl-4 border-l-2 border-slate-800 ml-2">↓ Next.js (HTTPS)</div>
                   <div className="text-emerald-400 font-bold bg-emerald-500/10 inline-block px-2 py-1 rounded">FastAPI Backend [Security Gate]</div>
                   <div className="text-slate-500 pl-4 border-l-2 border-slate-800 ml-2">↓ SQL queries</div>
                   <div className="text-amber-400 font-bold bg-amber-500/10 inline-block px-2 py-1 rounded">PostgreSQL (ARES Truth)</div>
                 </div>
                 
                 <div className="border-t border-slate-800/50 pt-5 space-y-2">
                   <div className="text-emerald-400 font-bold bg-emerald-500/10 inline-block px-2 py-1 rounded">SAP Adapters</div>
                   <div className="text-slate-500 pl-4 border-l-2 border-slate-800 ml-2">↓ OData REST API</div>
                   <div className="text-indigo-400 font-bold bg-indigo-500/10 inline-block px-2 py-1 rounded">SAP Integration Suite</div>
                   <div className="text-slate-400 pl-4 border-l-2 border-slate-800 ml-2 py-1">├─ HANA Cloud (ERP Data)</div>
                   <div className="text-slate-400 pl-4 border-l-2 border-slate-800 ml-2 py-1">└─ AI Hub [gpt-4-deployment]</div>
                 </div>
               </div>
               
               {/* Decorative animated scanline */}
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent opacity-50" style={{ animation: 'scan 4s linear infinite' }}></div>
             </div>
          </div>
        </div>
        
      </div>
    </section>
  );
}

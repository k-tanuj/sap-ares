import { Shield, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function FeaturesGrid() {
  return (
    <section className="py-24 bg-white relative z-10">
      <div className="container mx-auto px-4 md:px-8">
        
        {/* Top Connecting Section */}
        <div className="text-center max-w-4xl mx-auto mb-32 relative">
           <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 text-balance mb-6">
             Unified Access to your<br />Resilience Network
           </h2>
           <p className="text-gray-600 md:text-lg max-w-2xl mx-auto">
             Dedicated workspaces for internal planning and external collaboration, tightly integrated with SAP.
           </p>
        </div>

        {/* Portal Cards Grid */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Buyer Control Center */}
          <div className="group rounded-[2.5rem] bg-gray-50 p-10 transition-colors hover:bg-gray-100 flex flex-col h-full border border-gray-100 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
            
            <div className="relative z-10">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50">
                <Shield className="h-7 w-7" />
              </div>
              <h3 className="mb-4 text-3xl font-bold text-gray-900">Buyer Control Center</h3>
              <p className="mb-10 text-gray-600 leading-relaxed">
                Monitor global trade disruptions, approve supplier onboardings, ingest tariffs, launch LangGraph scenario agents, and run OR-Tools optimizations.
              </p>
            </div>
            
            <div className="mt-auto relative z-10">
              {/* Mock Dashboard UI */}
              <div className="aspect-[16/9] rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden border border-gray-100">
                 <div className="flex justify-between items-center mb-4">
                   <div className="text-gray-900 text-xs font-bold flex items-center gap-2">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> System Healthy
                   </div>
                   <div className="text-indigo-600 font-bold text-[10px] bg-indigo-50 px-2 py-1 rounded-full border border-indigo-100">LangGraph Active</div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-3 mb-3">
                   <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                     <div className="text-gray-500 text-[10px] font-bold mb-1 uppercase tracking-wider">Active Alerts</div>
                     <div className="text-xl font-bold text-red-500">3</div>
                   </div>
                   <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                     <div className="text-gray-500 text-[10px] font-bold mb-1 uppercase tracking-wider">Suppliers Impacted</div>
                     <div className="text-xl font-bold text-orange-500">14</div>
                   </div>
                 </div>
                 
                 <div className="bg-gradient-to-r from-indigo-50/50 to-pink-50/50 rounded-xl p-3 h-20 relative border border-indigo-50">
                   <div className="text-indigo-900/60 text-[10px] font-bold mb-2 uppercase tracking-wider">Simulated Recovery Path</div>
                   {/* Mock graph line */}
                   <svg viewBox="0 0 100 30" className="w-full h-full stroke-indigo-400 fill-none" preserveAspectRatio="none">
                     <path d="M0,25 Q10,10 20,20 T40,5 T60,25 T80,10 T100,20" strokeWidth="2" strokeLinecap="round" />
                   </svg>
                 </div>
              </div>
              
              <Link href="/login" className="mt-8 flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors w-fit">
                Login as Buyer <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Supplier Portal */}
          <div className="group rounded-[2.5rem] bg-gray-50 p-10 transition-colors hover:bg-gray-100 flex flex-col h-full border border-gray-100 relative overflow-hidden">
             {/* Background glow */}
             <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors duration-500"></div>

            <div className="relative z-10">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50">
                <Users className="h-7 w-7" />
              </div>
              <h3 className="mb-4 text-3xl font-bold text-gray-900">Supplier Portal</h3>
              <p className="mb-10 text-gray-600 leading-relaxed">
                Confirm tariff risk exposure, update logistics routes, adjust pricing conditions, map plants, and report stock quantity levels to buyer networks.
              </p>
            </div>
            
            <div className="mt-auto relative z-10">
               {/* Mock Portal UI */}
               <div className="aspect-[16/9] rounded-2xl bg-white p-5 shadow-xl overflow-hidden border border-gray-200">
                 <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-100">
                   <div className="text-gray-900 font-bold text-sm">Action Required</div>
                   <div className="bg-red-50 text-red-600 text-[10px] px-2 py-1 rounded-full font-bold">Overdue</div>
                 </div>
                 
                 <div className="space-y-3">
                   <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex justify-between items-center">
                     <div>
                       <div className="text-xs font-bold text-gray-900">Confirm Tariff Exposure</div>
                       <div className="text-[10px] text-gray-500">US-CN Trade Policy V4</div>
                     </div>
                     <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">✓</div>
                   </div>
                   
                   <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 flex justify-between items-center">
                     <div>
                       <div className="text-xs font-bold text-gray-900">Update Q3 Inventory</div>
                       <div className="text-[10px] text-gray-500">Plant: Shenzhen-02</div>
                     </div>
                     <div className="w-16 h-6 rounded border border-gray-200 bg-white flex items-center justify-center text-[10px] text-gray-400">Pending</div>
                   </div>
                 </div>
              </div>
              
              <Link href="/login" className="mt-8 flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors w-fit">
                Login or Register as Seller <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

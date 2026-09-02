import { Database, Globe, Cloud } from 'lucide-react';
import { CardSpread } from '../ui/card-spread';

export function BenefitsSection() {
  return (
    <section id="architecture" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-8">
        
        <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Text & Integrations */}
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3.5 py-1.5 rounded-full border border-indigo-100">
              Multi-Tier BTP Architecture
            </span>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mt-4 mb-6">
              Enterprise SAP Integrations
            </h2>
            <p className="text-gray-600 md:text-lg mb-8 leading-relaxed">
              ARES orchestrates mission-critical supply workflows across SAP BTP Cloud Foundry containers, leveraging SAP HANA Cloud for high-throughput relational persistence and SAP Integration Suite for real-time customs telemetry.
            </p>
            
            <div className="space-y-3.5">
              <div className="flex items-center gap-4 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 hover:border-sky-200 transition-colors">
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                  <Cloud className="h-5 w-5 text-sky-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">SAP BTP Cloud Foundry</h4>
                  <p className="text-xs text-gray-500">Zero-Downtime Microservice Container Mesh</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 hover:border-indigo-200 transition-colors">
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                  <Database className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">SAP HANA Cloud</h4>
                  <p className="text-xs text-gray-500">In-Memory Master Materials & Plant Records</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 hover:border-emerald-200 transition-colors">
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100">
                  <Globe className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">SAP Integration Suite</h4>
                  <p className="text-xs text-gray-500">Inbound Customs Webhooks & CPI Integration</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Architecture Visual (Spread Cards Grid) */}
          <div className="relative flex justify-center items-center w-full">
             <CardSpread />
          </div>
        </div>
        
      </div>
    </section>
  );
}

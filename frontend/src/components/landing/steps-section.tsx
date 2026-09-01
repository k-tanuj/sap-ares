import { Activity, Globe, Cpu, TrendingUp } from 'lucide-react';

export function StepsSection() {
  const steps = [
    {
      icon: Activity,
      title: "1. Detect",
      desc: "Ingests automated custom trade feeds, manual updates, or files and normalizes them into unified TariffEvents.",
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200"
    },
    {
      icon: Globe,
      title: "2. Verify",
      desc: "Identifies potentially exposed suppliers. Sourcing nodes submit confirmations providing evidence of actual exposure.",
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      border: "border-indigo-200"
    },
    {
      icon: Cpu,
      title: "3. Decide",
      desc: "LangGraph agents generate recovery scenarios while OR-Tools optimizes quantity allocations under supplier capacities.",
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200"
    },
    {
      icon: TrendingUp,
      title: "4. Simulate",
      desc: "Applies recovery alternatives in sandbox simulation nodes to compute before/after KPIs prior to SAP ERP sync.",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200"
    }
  ];

  return (
    <section id="about" className="py-24 bg-gray-50 border-y border-gray-100 relative">
      <div className="container mx-auto px-4 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 mb-4 text-balance">
            Mitigate Sourcing Disruptions Automatically
          </h2>
          <p className="text-gray-600 md:text-lg">
            How ARES orchestrates decisions across the supply network using a four-step autonomous workflow.
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          {/* Central Orchestration Visual */}
          {/* Central Orchestration Visual */}
          <div className="mb-16 bg-white rounded-3xl p-8 overflow-hidden relative shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-gray-100">
             <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNlN2U1ZTQiLz48L3N2Zz4=')] opacity-30" />
             
             <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8 py-8">
                <div className="text-center w-full md:w-1/3">
                   <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mb-4 shadow-sm">
                     <Activity className="w-8 h-8 text-blue-600" />
                   </div>
                   <div className="text-gray-900 font-bold mb-1">Global Trade Feed</div>
                   <div className="text-xs text-gray-500 font-mono">Input Stream</div>
                </div>
                
                <div className="hidden md:flex w-full md:w-1/3 items-center justify-center">
                   <div className="w-full h-1 bg-gradient-to-r from-blue-200 via-indigo-300 to-emerald-200 rounded-full relative">
                     <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                   </div>
                </div>
                
                <div className="text-center w-full md:w-1/3">
                   <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-4 shadow-sm">
                     <TrendingUp className="w-8 h-8 text-emerald-600" />
                   </div>
                   <div className="text-gray-900 font-bold mb-1">SAP ERP Sync</div>
                   <div className="text-xs text-gray-500 font-mono">Output Stream</div>
                </div>
             </div>
             
             {/* Central Agent Node */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-indigo-200 rounded-2xl p-4 shadow-lg z-20 flex flex-col items-center hidden md:flex">
                <Cpu className="w-6 h-6 text-indigo-600 mb-2" />
                <div className="text-xs font-bold text-indigo-900 tracking-widest uppercase">Orchestrator</div>
             </div>
          </div>

          {/* Workflow Steps Grid */}
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className={`bg-white rounded-3xl p-6 border ${step.border} shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group`}>
                  <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${step.bg} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                  <div className={`h-12 w-12 rounded-2xl ${step.bg} flex items-center justify-center ${step.color} mb-6 relative z-10`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mb-3 relative z-10">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed relative z-10">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

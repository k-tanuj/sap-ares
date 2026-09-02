"use client";

import React from "react";
import { Database, Globe, Cloud, Zap, CheckCircle2 } from "lucide-react";

export function CardSpread() {
  const cards = [
    {
      id: "cf",
      tag: "Runtime",
      title: "SAP BTP Cloud Foundry",
      desc: "Containerized microservice execution, zero-downtime routing & health supervision.",
      icon: <Cloud className="w-5 h-5 text-sky-600" />,
      color: "bg-gradient-to-br from-sky-50 to-white",
      borderColor: "border-sky-200 hover:border-sky-400",
      tagColor: "bg-sky-100 text-sky-800 border-sky-200",
      accent: "text-sky-600",
      status: "Live Service"
    },
    {
      id: "hana",
      tag: "Database",
      title: "SAP HANA Cloud",
      desc: "In-memory persistence for enterprise master materials, plant inventory & supplier entities.",
      icon: <Database className="w-5 h-5 text-indigo-600" />,
      color: "bg-gradient-to-br from-indigo-50 to-white",
      borderColor: "border-indigo-200 hover:border-indigo-400",
      tagColor: "bg-indigo-100 text-indigo-800 border-indigo-200",
      accent: "text-indigo-600",
      status: "Connected"
    },
    {
      id: "cpi",
      tag: "Integration",
      title: "SAP Integration Suite",
      desc: "Cloud Integration (CPI) inbound webhooks with bidirectional customs disruption ingestion.",
      icon: <Globe className="w-5 h-5 text-emerald-600" />,
      color: "bg-gradient-to-br from-emerald-50 to-white",
      borderColor: "border-emerald-200 hover:border-emerald-400",
      tagColor: "bg-emerald-100 text-emerald-800 border-emerald-200",
      accent: "text-emerald-600",
      status: "Ready"
    },
    {
      id: "ai",
      tag: "Autonomous Core",
      title: "ARES AI & Solver Engine",
      desc: "Multi-agent LangGraph coordination coupled with Google OR-Tools SCIP constraint solver.",
      icon: <Zap className="w-5 h-5 text-violet-600" />,
      color: "bg-gradient-to-br from-violet-50 to-white",
      borderColor: "border-violet-200 hover:border-violet-400",
      tagColor: "bg-violet-100 text-violet-800 border-violet-200",
      accent: "text-violet-600",
      status: "Active"
    }
  ];

  return (
    <div className="w-full relative">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-100/50 via-sky-100/30 to-purple-100/40 rounded-3xl blur-2xl -z-10" />

      {/* Fully spread, high-visibility 2x2 grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-2">
        {cards.map((card) => (
          <div
            key={card.id}
            className={`group relative p-5 rounded-2xl border ${card.borderColor} ${card.color} shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_30px_-6px_rgba(79,70,229,0.15)] transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between`}
          >
            <div>
              {/* Header: Icon & Tag */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="p-2.5 bg-white rounded-xl shadow-sm border border-slate-100 group-hover:scale-105 transition-transform">
                  {card.icon}
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${card.tagColor}`}>
                  {card.tag}
                </span>
              </div>

              {/* Title & Description */}
              <h3 className="text-base font-extrabold text-slate-900 mb-1.5 group-hover:text-indigo-600 transition-colors">
                {card.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {card.desc}
              </p>
            </div>

            {/* Status Footer */}
            <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Protocol</span>
              <span className="inline-flex items-center gap-1.5 font-bold text-slate-700">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {card.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


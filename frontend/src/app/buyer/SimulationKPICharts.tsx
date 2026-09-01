"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

interface SimulationKPIChartsProps {
  simulation: any;
}

export default function SimulationKPICharts({ simulation }: SimulationKPIChartsProps) {
  if (!simulation) return null;

  const before = simulation.before_kpi;
  const after = simulation.after_kpi;

  // Bar chart data
  const barData = [
    {
      name: "Cost ($)",
      Before: before.total_cost,
      After: after.total_cost,
    },
    {
      name: "Transit (days)",
      Before: before.recovery_time_days,
      After: after.recovery_time_days,
    },
    {
      name: "Coverage (days)",
      Before: before.inventory_coverage_days,
      After: after.inventory_coverage_days,
    },
    {
      name: "Utilization (%)",
      Before: before.supplier_utilization_pct,
      After: after.supplier_utilization_pct,
    },
    {
      name: "Risk Score",
      Before: before.average_risk_score,
      After: after.average_risk_score,
    },
    {
      name: "Continuity (%)",
      Before: before.continuity_pct,
      After: after.continuity_pct,
    },
  ];

  // Radar chart data (normalize to 0-100 scale)
  const radarData = [
    {
      metric: "Cost Efficiency",
      Before: Math.max(0, 100 - (before.total_cost / 5000) * 100),
      After: Math.max(0, 100 - (after.total_cost / 5000) * 100),
    },
    {
      metric: "Speed",
      Before: Math.max(0, 100 - before.recovery_time_days * 3),
      After: Math.max(0, 100 - after.recovery_time_days * 3),
    },
    {
      metric: "Coverage",
      Before: Math.min(100, before.inventory_coverage_days * 5),
      After: Math.min(100, after.inventory_coverage_days * 5),
    },
    {
      metric: "Utilization",
      Before: before.supplier_utilization_pct,
      After: after.supplier_utilization_pct,
    },
    {
      metric: "Risk Mgmt",
      Before: Math.max(0, 100 - before.average_risk_score),
      After: Math.max(0, 100 - after.average_risk_score),
    },
    {
      metric: "Continuity",
      Before: before.continuity_pct,
      After: after.continuity_pct,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Bar Chart: Before vs After KPIs */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">
          Before vs After KPI Comparison
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} barGap={4} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#64748b" }}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <Tooltip
                contentStyle={{
                  fontSize: 11,
                  borderRadius: 4,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
              />
              <Bar
                dataKey="Before"
                fill="#ef4444"
                radius={[3, 3, 0, 0]}
                name="Disrupted (Before)"
              />
              <Bar
                dataKey="After"
                fill="#10b981"
                radius={[3, 3, 0, 0]}
                name="Mitigated (After)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Radar Chart: Recovery Profile */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-4">
          Recovery Profile Radar
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 10, fill: "#64748b" }}
              />
              <PolarRadiusAxis
                tick={{ fontSize: 9, fill: "#94a3b8" }}
                domain={[0, 100]}
              />
              <Radar
                name="Disrupted"
                dataKey="Before"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Radar
                name="Mitigated"
                dataKey="After"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

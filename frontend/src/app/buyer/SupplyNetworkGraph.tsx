"use client";

import { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

interface SupplyNetworkGraphProps {
  suppliers: any[];
  routes: any[];
  confirmations: any[];
}

export default function SupplyNetworkGraph({
  suppliers,
  routes,
  confirmations,
}: SupplyNetworkGraphProps) {
  // Build nodes from suppliers + buyer plant
  const nodes: Node[] = useMemo(() => {
    const result: Node[] = [];

    // Buyer plant node (center-right)
    result.push({
      id: "buyer-plant",
      type: "default",
      position: { x: 700, y: 220 },
      data: {
        label: (
          <div style={{ textAlign: "center", fontSize: 11 }}>
            <div style={{ fontWeight: 800, color: "#4f46e5" }}>ARES Enterprise</div>
            <div style={{ fontSize: 9, color: "#64748b" }}>Buyer Plant (Munich)</div>
          </div>
        ),
      },
      style: {
        background: "#eef2ff",
        border: "2px solid #4f46e5",
        borderRadius: 8,
        padding: "12px 16px",
        width: 160,
      },
      sourcePosition: Position.Left,
      targetPosition: Position.Left,
    });

    // Supplier nodes (left side, stacked vertically)
    const approvedSuppliers = suppliers.filter(
      (s) => s.type === "SUPPLIER" && (s.onboarding_status === "APPROVED" || s.onboarding_status === "ACTIVE")
    );

    const yStart = 40;
    const ySpacing = 120;

    approvedSuppliers.forEach((s, idx) => {
      // Check if this supplier is confirmed affected
      const isAffected = confirmations.some(
        (c) => c.supplier_org_id === s.id && c.status === "CONFIRMED_AFFECTED"
      );
      const isPotential = confirmations.some(
        (c) => c.supplier_org_id === s.id && c.status === "POTENTIALLY_AFFECTED"
      );

      let borderColor = "#10b981"; // green = safe
      let bgColor = "#ecfdf5";
      let statusLabel = "ACTIVE";
      if (isAffected) {
        borderColor = "#ef4444";
        bgColor = "#fef2f2";
        statusLabel = "DISRUPTED";
      } else if (isPotential) {
        borderColor = "#f59e0b";
        bgColor = "#fffbeb";
        statusLabel = "AT RISK";
      }

      result.push({
        id: s.id,
        type: "default",
        position: { x: 50, y: yStart + idx * ySpacing },
        data: {
          label: (
            <div style={{ textAlign: "center", fontSize: 10 }}>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{s.name}</div>
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: borderColor,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase" as const,
                  marginTop: 2,
                }}
              >
                {statusLabel}
              </div>
            </div>
          ),
        },
        style: {
          background: bgColor,
          border: `2px solid ${borderColor}`,
          borderRadius: 8,
          padding: "10px 14px",
          width: 180,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Right,
      });
    });

    return result;
  }, [suppliers, confirmations]);

  // Build edges from routes
  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = [];

    // Map origin country to supplier org IDs
    const supplierByCountry: Record<string, string> = {};
    suppliers.forEach((s) => {
      // Heuristic: extract country from org name/id
      if (s.id.includes("china")) supplierByCountry["China"] = s.id;
      if (s.id.includes("germany")) supplierByCountry["Germany"] = s.id;
      if (s.id.includes("japan")) supplierByCountry["Japan"] = s.id;
      if (s.id.includes("korea")) supplierByCountry["Korea"] = s.id;
      if (s.id.includes("taiwan")) supplierByCountry["Taiwan"] = s.id;
      if (s.id.includes("belgium")) supplierByCountry["Belgium"] = s.id;
      if (s.id.includes("usa")) supplierByCountry["USA"] = s.id;
      if (s.id.includes("vietnam")) supplierByCountry["Vietnam"] = s.id;
    });

    routes.forEach((r) => {
      const sourceId = supplierByCountry[r.origin];
      if (!sourceId) return;

      // Determine edge style based on mode and status
      const isAffected = confirmations.some(
        (c) => c.supplier_org_id === sourceId && c.status === "CONFIRMED_AFFECTED"
      );

      let strokeColor = "#10b981";
      let strokeDasharray = undefined;
      let strokeWidth = 2;
      let labelText = `${r.mode} (${r.lead_time_days}d, $${r.cost_per_unit})`;

      if (isAffected) {
        strokeColor = "#ef4444";
        strokeWidth = 2.5;
        strokeDasharray = "6 3";
      } else if (r.mode === "AIR") {
        strokeColor = "#6366f1";
      } else if (r.mode === "ROAD") {
        strokeColor = "#10b981";
      }

      result.push({
        id: r.id,
        source: sourceId,
        target: "buyer-plant",
        label: labelText,
        type: "default",
        style: {
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
        },
        labelStyle: {
          fontSize: 8,
          fontWeight: 600,
          fill: "#64748b",
        },
        labelBgStyle: {
          fill: "#ffffff",
          fillOpacity: 0.9,
        },
        labelBgPadding: [4, 6] as [number, number],
        animated: isAffected,
      });
    });

    return result;
  }, [routes, suppliers, confirmations]);

  return (
    <div className="h-[480px] w-full border border-slate-200 rounded bg-slate-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.4}
        maxZoom={1.5}
      >
        <Background gap={20} color="#e2e8f0" />
        <Controls
          showInteractive={false}
          style={{ borderRadius: 6, border: "1px solid #e2e8f0" }}
        />
        <MiniMap
          style={{ borderRadius: 6, border: "1px solid #e2e8f0" }}
          nodeColor={(n) => {
            if (n.id === "buyer-plant") return "#4f46e5";
            const style = n.style as Record<string, string> | undefined;
            return style?.borderColor || "#10b981";
          }}
        />
      </ReactFlow>
    </div>
  );
}

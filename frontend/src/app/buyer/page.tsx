"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Shield, AlertTriangle, Users, Settings, Database, Globe,
  TrendingUp, FileText, CheckCircle, XCircle, RefreshCw, RotateCcw,
  Plus, Play, Info, ArrowRight, UserCheck, Eye, LogOut, Link, Unlink
} from "lucide-react";

import SimulationKPICharts from "./SimulationKPICharts";
import SupplyNetworkGraph from "./SupplyNetworkGraph";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function BuyerDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  
  // Data States
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<any | null>(null);
  const [simulation, setSimulation] = useState<any | null>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [tradeSources, setTradeSources] = useState<any[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [usitcMetadata, setUsitcMetadata] = useState<any>({
    status: "CONFIGURED",
    configured: true,
    last_verified_at: null,
    last_error: null,
    fallback_active: false,
    source_url: "https://datawebws.usitc.gov/dataweb"
  });
  const [usitcTesting, setUsitcTesting] = useState(false);
  
  // Forms & Inputs
  const [newTariff, setNewTariff] = useState({
    title: "",
    source_country: "",
    destination_country: "",
    affected_hscode_categories: "",
    tariff_rate_increase: 0.1,
    effective_date: ""
  });
  
  const [genScenarioParams, setGenScenarioParams] = useState({
    event_id: 1,
    product_id: "MAT-001",
    demand_qty: 3500
  });

  const [genTaskId, setGenTaskId] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<number>(0);
  const [genLogs, setGenLogs] = useState<string[]>([]);
  const [isSapSyncing, setIsSapSyncing] = useState<boolean>(false);
  const [scenarioNegotiations, setScenarioNegotiations] = useState<{ [key: number]: any[] }>({});

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load context on mount
  useEffect(() => {
    const role = localStorage.getItem("ares_role");

    if (!role || !role.startsWith("BUYER")) {
      router.replace("/login");
      return;
    }
    // With HttpOnly cookies, we don't store the raw token.
    loadAllData("");
  }, []);

  const loadAllData = async (jwt: string) => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${jwt}` };
      
      // Fetch Suppliers
      const supRes = await fetch("/api/suppliers", { credentials: "include" });
      if (supRes.status === 401) {
        localStorage.clear();
        router.replace("/login");
        return;
      }
      let loadedSuppliers: any[] = [];
      if (supRes.ok) {
        loadedSuppliers = await supRes.json();
        setSuppliers(loadedSuppliers);
      }

      // Fetch Tariff Events
      const tarRes = await fetch("/api/tariffs", { credentials: "include" });
      if (tarRes.status === 401) {
        localStorage.clear();
        router.replace("/login");
        return;
      }
      let loadedTariffs: any[] = [];
      if (tarRes.ok) {
        loadedTariffs = await tarRes.json();
        setTariffs(loadedTariffs);
      }

      // If database is empty, automatically trigger system seed and reload
      if (loadedSuppliers.length === 0 && loadedTariffs.length === 0) {
        const seedRes = await fetch("/api/system/seed", { method: "POST" });
        if (seedRes.ok) {
          const sRes2 = await fetch("/api/suppliers", { credentials: "include" });
          if (sRes2.ok) setSuppliers(await sRes2.json());
          const tRes2 = await fetch("/api/tariffs", { credentials: "include" });
          if (tRes2.ok) setTariffs(await tRes2.json());
        }
      }

      // Fetch Confirmations
      const confRes = await fetch("/api/tariffs/confirmations/all", { credentials: "include" });
      if (confRes.ok) setConfirmations(await confRes.json());

      // Fetch Scenarios
      const scenRes = await fetch("/api/scenarios", { credentials: "include" });
      if (scenRes.ok) setScenarios(await scenRes.json());

      // Fetch Audit Logs
      const auditRes = await fetch("/api/audit-logs", { credentials: "include" });
      if (auditRes.ok) setAuditLogs(await auditRes.json());

      // Fetch Active Routes
      const routesRes = await fetch("/api/suppliers/routes", { credentials: "include" });
      if (routesRes.ok) setRoutes(await routesRes.json());

      // Fetch Trade Source statuses
      const sourcesRes = await fetch("/api/trade/sources", { credentials: "include" });
      if (sourcesRes.ok) setTradeSources(await sourcesRes.json());

      // Fetch Backend-Verified USITC Status
      const usitcStatusRes = await fetch("/api/trade/sources/usitc/status", { credentials: "include" });
      if (usitcStatusRes.ok) setUsitcMetadata(await usitcStatusRes.json());

      // Fetch live analytics dashboard data
      const analyticsRes = await fetch("/api/analytics/dashboard", { credentials: "include" });
      if (analyticsRes.ok) setAnalyticsData(await analyticsRes.json());

      // Automatic SAP Analytics Sync in Background
      fetch("/api/sap/sync-analytics", { method: "POST", credentials: "include" }).catch(() => {});

    } catch (err: any) {
      setError("Failed to sync backend data.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  // Onboarding lifecycle
  const handleUpdateSupplierStatus = async (orgId: string, newStatus: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/suppliers/${orgId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) throw new Error("Status update failed");
      setSuccess(`Supplier ${orgId} set to status: ${newStatus}`);
      loadAllData("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Review & Confirm Tariff
  const handleConfirmTariff = async (eventId: number, statusStr: "CONFIRMED" | "REJECTED") => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tariffs/${eventId}/status`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusStr })
      });
      if (!res.ok) throw new Error("Tariff update failed");
      setSuccess(`Tariff event #${eventId} reviewed & set to ${statusStr}. Potentially affected suppliers flagged.`);
      loadAllData("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Create Manual Event
  const handleCreateTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/tariffs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newTariff,
          effective_date: new Date(newTariff.effective_date).toISOString()
        })
      });
      if (!res.ok) throw new Error("Failed to register tariff event");
      setSuccess("Custom tariff event detected & registered in system.");
      setNewTariff({
        title: "",
        source_country: "",
        destination_country: "",
        affected_hscode_categories: "",
        tariff_rate_increase: 0.1,
        effective_date: ""
      });
      loadAllData("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // SSE Hook for Async Task Progress
  useEffect(() => {
    if (!genTaskId) return;

    const eventSource = new EventSource(`/api/scenarios/tasks/${genTaskId}/stream`, {
      withCredentials: true // needed for HttpOnly cookies
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.progress !== undefined) {
          setGenProgress(data.progress);
        }
        if (data.stage) {
          setGenLogs(prev => [...prev, data.stage]);
        } else if (data.message) {
          setGenLogs(prev => [...prev, data.message]);
        }
        
        if (data.status === "COMPLETED") {
          setSuccess("AI scenarios generated successfully. Feasibility pruners & OR-Tools MIP optimizer completed.");
          loadAllData("");
          eventSource.close();
          setTimeout(() => setGenTaskId(null), 3000);
        } else if (data.status === "ERROR" || data.status === "FAILED") {
          setError(data.error || data.result?.error || "AI scenario generation failed.");
          eventSource.close();
          setGenTaskId(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      eventSource.close();
      setGenTaskId(null);
    };

    return () => {
      eventSource.close();
    };
  }, [genTaskId]);


  const handleLoadNegotiations = async (scenId: number) => {
    try {
      const res = await fetch(`/api/scenarios/${scenId}/negotiations`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setScenarioNegotiations(prev => ({ ...prev, [scenId]: data }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generate Scenarios via LangGraph (Async via background worker + SSE)
  const handleGenerateScenarios = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/scenarios/generate-async?event_id=${genScenarioParams.event_id}&product_id=${genScenarioParams.product_id}&demand_qty=${genScenarioParams.demand_qty}`, {
        method: "POST",
        credentials: "include"
      });
      const data = await res.json();
      if (!res.ok) {
        // Surface quota errors with a clear, actionable message
        const detail = data?.detail || "";
        if (detail.includes("LLM_QUOTA_EXCEEDED") || detail.includes("RESOURCE_EXHAUSTED")) {
          setError("⚠️ Gemini API quota exhausted. Update the GEMINI_API_KEY in backend/.env with a key that has available quota, then restart the backend server.");
        } else {
          setError(detail || "Scenario generation failed.");
        }
        return;
      }
      
      // Start SSE listening
      setGenTaskId(data.task_id);
      setGenProgress(0);
      setGenLogs(["AI scenario generation initialized..."]);
      
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Approve Scenario
  const handleApproveScenario = async (scenId: number) => {
    setError("");
    setSuccess("");
    setIsSapSyncing(true);
    try {
      const res = await fetch(`/api/scenarios/${scenId}/approve`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Approval failed");
      }
      
      const uniqueSuppliers = new Set(data.action_details?.map((act: any) => act.supplier_org_id).filter(Boolean));
      const count = uniqueSuppliers.size;
      
      setSuccess(`✅ Scenario Approved. SAP S/4HANA Write-Back Successful. ${count} affected supplier${count !== 1 ? 's' : ''} notified.`);
      loadAllData("");
      setActiveTab("simulation");
      loadSimulationResult(scenId, "");
    } catch (err: any) {
      setError("SAP ERP Sync Error: " + err.message);
    } finally {
      setIsSapSyncing(false);
    }
  };

  // Clear Scenario Workspace for New Mitigation
  const handleClearScenarioWorkspace = async () => {
    setError("");
    setSuccess("");
    try {
      await fetch("/api/scenarios/clear-pending", {
        method: "POST",
        credentials: "include"
      });
      setGenScenarioParams({ event_id: 1, product_id: "", demand_qty: 1000 });
      await loadAllData("");
      setSuccess("Mitigation workspace cleared. Select a disruption incident to run a new scenario.");
    } catch (err: any) {
      setError("Failed to clear scenario workspace: " + err.message);
    }
  };

  const loadSimulationResult = async (scenId: number, jwt: string) => {
    try {
      const res = await fetch(`/api/scenarios/${scenId}/simulation`, {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) setSimulation(data[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sync to SAP manual trigger
  const handleSyncToSAP = async () => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/sap/sync-analytics", {
        method: "POST",
        credentials: "include"
      });
      if (!res.ok) throw new Error("SAP Sync failed");
      setSuccess("Successfully synchronized supply network and decisions datasets to SAP Analytics Cloud trial endpoints.");
      loadAllData("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 overflow-hidden text-slate-800 relative">
      {/* Background Soft Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-pink-200/40 blur-[120px] pointer-events-none"></div>

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white/60 backdrop-blur-xl border border-white m-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between relative z-10">
        <div>
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <img src="/ares-logo.svg" alt="ARES Logo" className="h-8 w-8 object-contain" />
              <span className="font-bold text-xl tracking-tight text-slate-800">ARES Control</span>
            </div>
            <p className="text-sm text-indigo-500 font-mono mt-2 uppercase tracking-wider font-semibold">Enterprise Buyer</p>
          </div>
          
          <nav className="p-4 space-y-1">
            {[
              { id: "overview", label: "Overview", icon: Shield },
              { id: "tariffs", label: "Tariff Events", icon: AlertTriangle },
              { id: "disruptions", label: "Disruptions", icon: Database },
              { id: "suppliers", label: "Suppliers", icon: Users },
              { id: "network", label: "Supply Network", icon: Globe },
              { id: "scenarios", label: "Scenarios", icon: TrendingUp },
              { id: "decisions", label: "Decisions", icon: CheckCircle },
              { id: "simulation", label: "Simulation", icon: Play },
              { id: "analytics", label: "SAP Analytics", icon: FileText },
              { id: "trade-sources", label: "Trade Sources", icon: Globe },
              { id: "audit", label: "Audit Log", icon: Database }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setError(""); setSuccess(""); }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-200 ${
                    activeTab === tab.id 
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-2.5 text-base font-semibold text-slate-500 hover:text-red-500 rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col overflow-hidden relative z-10 py-4 pr-4">
        
        {/* TOP BAR */}
        <header className="h-16 bg-white/60 backdrop-blur-md rounded-2xl border border-white flex items-center justify-between px-6 mb-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <h2 className="text-xl font-bold tracking-tight text-slate-800">
            {activeTab.toUpperCase().replace("_", " ")}
          </h2>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" size="icon"
              onClick={() => loadAllData("")}
              disabled={loading}
              className="text-slate-500 border-slate-200 hover:bg-slate-50 bg-white"
              title="Refresh Dashboard & Sync SAP"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Badge variant="outline" className="px-3 py-1 uppercase tracking-widest text-xs font-mono border-indigo-200 text-indigo-600 bg-indigo-50">
              Org: org-buyer-1
            </Badge>
          </div>
        </header>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto px-2 pb-8 custom-scrollbar">

        {/* FEEDBACK BANNERS */}
        <div className="px-8 pt-4">
          {error && (
            <div className="p-3 text-sm font-medium text-red-800 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded">
              {success}
            </div>
          )}
        </div>


          
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Stats Card Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: "Active Tariff Incidents", val: tariffs.filter(t => t.status === "CONFIRMED" || t.status === "DETECTED").length, status: "WARNING" },
                  { label: "Pending Supplier Onboardings", val: suppliers.filter(s => s.onboarding_status === "REGISTERED" || s.onboarding_status === "PENDING_VERIFICATION" || s.onboarding_status === "PENDING").length, status: "INFO" },
                  { label: "Total Monitored Suppliers", val: suppliers.length, status: "SUCCESS" },
                  { label: "Flagged Risk Exposure Forms", val: confirmations.filter(c => c.status === "POTENTIALLY_AFFECTED" || c.status === "CONFIRMED_AFFECTED").length, status: "DANGER" }
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded border border-slate-250 p-5 shadow-sm">
                    <span className="text-sm font-semibold uppercase tracking-wider text-slate-400 block">{s.label}</span>
                    <span className="text-3xl font-bold mt-1 block">{s.val}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-6">
                {/* Active Alerts */}
                <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Urgent Disruptions</h3>
                  <div className="space-y-3">
                    {tariffs.filter(t => t.status === "CONFIRMED" || t.status === "DETECTED").map((t) => (
                      <div key={t.id} className="p-4 bg-red-50 border border-red-150 rounded flex justify-between items-start">
                        <div>
                          <span className="text-sm font-bold text-red-800 uppercase tracking-wide">Tariff Confirmed</span>
                          <h4 className="text-base font-bold text-slate-900 mt-1">{t.title}</h4>
                          <p className="text-sm text-slate-500 mt-1">Origin: {t.source_country} → Rate increase: +{(t.tariff_rate_increase * 100)}%</p>
                        </div>
                        <button 
                          onClick={() => { setActiveTab("scenarios"); setGenScenarioParams({ ...genScenarioParams, event_id: t.id }) }}
                          className="bg-white hover:bg-slate-100 text-slate-900 font-semibold border border-slate-350 text-sm px-2.5 py-1 rounded shadow-sm flex items-center space-x-1"
                        >
                          <span>Mitigate</span>
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: TARIFF EVENTS */}
          {activeTab === "tariffs" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Tariff Table list */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded shadow-sm p-6">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Registered Trade Tariffs</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Title</th>
                        <th className="pb-3">Source</th>
                        <th className="pb-3">Trade Countries</th>
                        <th className="pb-3">HSCode Categories</th>
                        <th className="pb-3">Rate Increase</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tariffs.map((t) => (
                        <tr key={t.id} className="text-slate-700">
                          <td className="py-3 font-semibold text-slate-900">{t.title}</td>
                          <td className="py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                              t.source_agency === "CBIC" ? "bg-orange-50 text-orange-700 border border-orange-150" :
                              t.source_agency === "USITC" ? "bg-blue-50 text-blue-700 border border-blue-150" :
                              t.source_agency === "DGFT" ? "bg-purple-50 text-purple-700 border border-purple-150" :
                              t.source_agency === "IMPORT" ? "bg-teal-50 text-teal-700 border border-teal-150" :
                              "bg-slate-100 text-slate-600"
                            }`}>
                              {t.source_agency || "MANUAL"}
                            </span>
                          </td>
                          <td className="py-3">{t.source_country} → {t.destination_country}</td>
                          <td className="py-3 font-mono">{t.affected_hscode_categories}</td>
                          <td className="py-3 text-red-650 font-bold">+{(t.tariff_rate_increase * 100)}%</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                              t.status === "CONFIRMED" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" :
                              t.status === "DETECTED" ? "bg-amber-50 text-amber-700 border border-amber-150" : "bg-slate-100 text-slate-600"
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3">
                            {t.status === "DETECTED" && (
                              <div className="flex space-x-1">
                                <button 
                                  onClick={() => handleConfirmTariff(t.id, "CONFIRMED")}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2 py-1 rounded"
                                >
                                  Confirm
                                </button>
                                <button 
                                  onClick={() => handleConfirmTariff(t.id, "REJECTED")}
                                  className="bg-slate-200 hover:bg-slate-350 text-slate-700 text-xs font-bold px-2 py-1 rounded"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-6">
                {/* India Trade Intelligence Button */}
                <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-2">Global Trade Intelligence</h3>
                  <p className="text-sm text-slate-400 mb-4">Fetch latest tariff and trade events from CBIC, USITC, and DGFT adapters.</p>
                  <button
                    type="button"
                    onClick={async () => {
                      setError(""); setSuccess("");
                      try {
                        const res = await fetch("/api/trade/ingest", {
                          method: "POST",
                          credentials: "include"
                        });
                        if (!res.ok) throw new Error("Trade ingestion failed");
                        const data = await res.json();
                        setSuccess(`Ingested ${data.length} new trade event(s) from India intelligence sources.`);
                        loadAllData("");
                      } catch (err: any) { setError(err.message); }
                    }}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded transition-colors text-sm"
                  >
                    Fetch from CBIC / DGFT / USITC
                  </button>
                </div>

                {/* Manual Event Form */}
                <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Manual Tariff Entry</h3>
                  <form onSubmit={handleCreateTariff} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Tariff Title</label>
                    <input 
                      type="text" required
                      value={newTariff.title}
                      onChange={(e) => setNewTariff({...newTariff, title: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                      placeholder="e.g. EU Metal Surcharge"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Origin Country</label>
                      <input 
                        type="text" required
                        value={newTariff.source_country}
                        onChange={(e) => setNewTariff({...newTariff, source_country: e.target.value})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                        placeholder="China"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Dest Country</label>
                      <input 
                        type="text" required
                        value={newTariff.destination_country}
                        onChange={(e) => setNewTariff({...newTariff, destination_country: e.target.value})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                        placeholder="Germany"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Affected HSCodes Keywords</label>
                    <input 
                      type="text" required
                      value={newTariff.affected_hscode_categories}
                      onChange={(e) => setNewTariff({...newTariff, affected_hscode_categories: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                      placeholder="Microcontroller, Copper"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Rate Increase (e.g. 0.25 = 25%)</label>
                    <input 
                      type="number" step="0.01" required
                      value={newTariff.tariff_rate_increase}
                      onChange={(e) => setNewTariff({...newTariff, tariff_rate_increase: parseFloat(e.target.value)})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Effective Date</label>
                    <input 
                      type="date" required
                      value={newTariff.effective_date}
                      onChange={(e) => setNewTariff({...newTariff, effective_date: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                    />
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded transition-colors"
                  >
                    Submit Manual Tariff Event
                  </button>
                </form>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DISRUPTIONS (Exposure Declarations) */}
          {activeTab === "disruptions" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-2">Network Risk Sourcing Verification</h3>
              <p className="text-sm text-slate-400 mb-6">Shows exposure declarations submitted by suppliers regarding active tariffs. ARES respects supplier evidence declarations.</p>
              
              <div className="space-y-4">
                {confirmations.map((c) => (
                  <div 
                    key={c.id} 
                    className={`p-5 rounded border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      c.status === "CONFIRMED_AFFECTED" ? "bg-red-50 border-red-150" :
                      c.status === "NOT_AFFECTED" ? "bg-emerald-50 border-emerald-150" : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">Supplier: {c.supplier_org?.name || c.supplier_org_id}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                          c.status === "CONFIRMED_AFFECTED" ? "bg-red-200 text-red-800" :
                          c.status === "NOT_AFFECTED" ? "bg-emerald-200 text-emerald-800" : "bg-amber-100 text-amber-800"
                        }`}>
                          {c.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 font-medium">Event: {c.tariff_event?.title || `Event #${c.tariff_event_id}`}</p>
                      <p className="text-sm text-slate-500 italic mt-2">“ {c.supplier_notes || "No notes provided"} ”</p>
                    </div>
                    <div className="text-sm text-slate-400 text-right">
                      <span className="block font-semibold">Last Updated</span>
                      <span>{new Date(c.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                
                {confirmations.length === 0 && (
                  <div className="text-center p-8 text-slate-400 text-sm">
                    No supplier exposure records generated yet. Review and confirm a detected tariff event first.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SUPPLIERS */}
          {activeTab === "suppliers" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-6">Supplier Directory & Onboarding Lifecycle</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                      <th className="pb-3">Org ID</th>
                      <th className="pb-3">Company Name</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Onboarding Status</th>
                      <th className="pb-3 text-right">Verify Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suppliers.map((s) => (
                      <tr key={s.id} className="text-slate-700">
                        <td className="py-3 font-mono font-bold text-slate-900">{s.id}</td>
                        <td className="py-3 font-semibold">{s.name}</td>
                        <td className="py-3 font-mono">{s.type}</td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            s.onboarding_status === "ACTIVE" || s.onboarding_status === "APPROVED" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" :
                            s.onboarding_status === "REJECTED" ? "bg-red-50 text-red-700 border border-red-150" :
                            "bg-amber-50 text-amber-700 border border-amber-150"
                          }`}>
                            {s.onboarding_status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex justify-end space-x-1">
                            {s.onboarding_status !== "ACTIVE" && s.onboarding_status !== "APPROVED" && (
                              <>
                                <button 
                                  onClick={() => handleUpdateSupplierStatus(s.id, "APPROVED")}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-2 py-1 rounded"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleUpdateSupplierStatus(s.id, "UNDER_REVIEW")}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-2 py-1 rounded border border-slate-350"
                                >
                                  Review
                                </button>
                                <button 
                                  onClick={() => handleUpdateSupplierStatus(s.id, "REJECTED")}
                                  className="bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded border border-red-150"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {s.onboarding_status === "APPROVED" && (
                              <button 
                                onClick={() => handleUpdateSupplierStatus(s.id, "ACTIVE")}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-2 py-1 rounded"
                              >
                                Activate Portal
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SCENARIOS */}
          {activeTab === "scenarios" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Scenario Generator Form */}
              <div className="bg-white border border-slate-200 rounded shadow-sm p-6 h-fit">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Run Recovery Orchestrator</h3>
                <p className="text-sm text-slate-400 mb-6">Triggers LangGraph multi-agent orchestration. It calls SAP Generative AI Hub for recovery steps, then prunes infeasible plans using backend truth constraints, and runs OR-Tools MIP solver to allocate quantities.</p>
                
                <form onSubmit={handleGenerateScenarios} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Disruption Incident</label>
                    <select 
                      value={genScenarioParams.event_id}
                      onChange={(e) => setGenScenarioParams({...genScenarioParams, event_id: parseInt(e.target.value)})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                    >
                      {tariffs.map(t => (
                        <option key={t.id} value={t.id}>{t.title} (#{t.id})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Target Component / Material ID</label>
                    <input 
                      type="text" required
                      value={genScenarioParams.product_id}
                      onChange={(e) => setGenScenarioParams({...genScenarioParams, product_id: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Weekly Sourcing Deficit Quantity</label>
                    <input 
                      type="number" required
                      value={genScenarioParams.demand_qty}
                      onChange={(e) => setGenScenarioParams({...genScenarioParams, demand_qty: parseInt(e.target.value)})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950"
                    />
                  </div>
                  {genTaskId ? (
                    <div className="w-full bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wide">
                        <span>AI Optimization Progress</span>
                        <span>{genProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${genProgress}%` }}
                        ></div>
                      </div>
                      <div className="text-xs font-mono text-slate-500 h-16 overflow-y-auto bg-slate-100 p-2 rounded border border-slate-200">
                        {genLogs.map((log, i) => (
                          <div key={i}>{'>'} {log}</div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <button 
                      type="submit" disabled={loading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded transition-colors disabled:opacity-50"
                    >
                      {loading ? "Orchestrating Agents..." : "Execute AI & Math Optimization"}
                    </button>
                  )}
                </form>
              </div>

              {/* Scenarios List */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-500">Recommended Recovery Scenarios</h3>
                  {scenarios.length > 0 && (
                    <button
                      onClick={handleClearScenarioWorkspace}
                      className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1 rounded transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Start New Mitigation / Reset Workspace
                    </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  {scenarios.filter(s => s.status === "PENDING_REVIEW").map((s) => (
                    <div key={s.id} className="border border-slate-200 rounded p-5 shadow-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-base text-slate-900">{s.name}</h4>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded mt-1 uppercase ${
                            s.feasibility === "FEASIBLE" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-red-50 text-red-700 border border-red-150"
                          }`}>
                            {s.feasibility}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-slate-400">Objective: {s.objective}</span>
                      </div>
                      
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-3 rounded border border-slate-100 text-sm">
                        <div>
                          <span className="text-slate-400 font-semibold block">Total Cost</span>
                          <span className="font-bold text-slate-800">${s.optimized_cost.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">Lead Time</span>
                          <span className="font-bold text-slate-800">{s.recovery_time_days} days</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">Risk Score</span>
                          <span className="font-bold text-slate-800">{s.risk_score}/100</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">Continuity</span>
                          <span className="font-bold text-slate-800">{s.continuity_percentage}%</span>
                        </div>
                      </div>

                      {s.feasibility_notes && (
                        <p className="text-sm text-slate-500 mt-2 bg-amber-50/50 p-2 rounded border border-amber-100/50">
                          {s.feasibility_notes}
                        </p>
                      )}

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <span className="text-sm font-bold text-slate-400 block mb-2">Recovery Actions Summary:</span>
                        <div className="space-y-1.5">
                          {s.action_details.map((act: any, idx: number) => (
                            <div key={idx} className="flex items-center space-x-2 text-sm text-slate-700">
                              <ArrowRight className="h-3 w-3 text-indigo-500" />
                              <span className="font-medium">{act.action_type.replace("_", " ")}</span>
                              {act.supplier_org_id && <span>supplier: <b className="text-slate-900">{act.supplier_org_id}</b></span>}
                              {act.quantity && <span>qty: <b className="text-slate-900">{act.quantity}</b></span>}
                              {act.route_id && <span>route: <b className="text-slate-900">{act.route_id}</b></span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleApproveScenario(s.id)}
                          disabled={s.feasibility === "INFEASIBLE" || isSapSyncing}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-3.5 py-1.5 rounded transition-colors disabled:opacity-50 shadow-sm flex items-center gap-2"
                        >
                          {isSapSyncing ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Syncing to SAP...
                            </>
                          ) : (
                            "Approve Scenario"
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {scenarios.filter(s => s.status === "PENDING_REVIEW").length === 0 && (
                    <div className="text-center p-12 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-3">
                      <Shield className="h-8 w-8 text-indigo-400 mx-auto" />
                      <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">No Active Candidate Scenarios</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Select a disruption incident on the left, enter target material ID & deficit quantity, then click <b>Execute AI & Math Optimization</b> to generate fresh candidate plans.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: SIMULATION */}
          {activeTab === "simulation" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-2">Approved KPI Simulation</h3>
              <p className="text-sm text-slate-400 mb-6">Compares actual disrupted KPIs against simulated recovery state. Simulation executes in-memory snapshots and does not alter live databases.</p>

              {simulation ? (
                <div className="space-y-6">
                  <SimulationKPICharts simulation={simulation} />
                  <div className="text-xs text-slate-400 font-semibold text-right">
                    Simulation Run ID: SIM-{simulation.id} | Timestamp: {new Date(simulation.run_at).toLocaleString()}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400 text-sm">
                  No simulation results found. Select and Approve a Scenario from the tab to run.
                </div>
              )}
            </div>
          )}

          {/* TAB: ANALYTICS — live DB-computed data */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-500">SAP Analytics Cloud Dashboard</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-150 uppercase tracking-wider">Live DB Data</span>
                </div>
                <p className="text-sm text-slate-400 mb-6">Aggregated trade compliance and recovery metrics computed from live database records. No mock values.</p>

                {!analyticsData ? (
                  <div className="text-center p-12 text-slate-400 text-sm">Loading analytics...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    {/* Supplier Concentration — computed from SupplierProfile.country */}
                    <div className="border border-slate-200 rounded p-4">
                      <span className="text-sm font-bold text-slate-400 block mb-3 uppercase">Geopolitical Supplier Concentration</span>
                      {analyticsData.supplier_concentration.length === 0 ? (
                        <p className="text-xs text-slate-400">No supplier country data found.</p>
                      ) : (
                        <div className="space-y-3">
                          {analyticsData.supplier_concentration.map((c: any, i: number) => {
                            const colors = ["bg-red-500", "bg-amber-500", "bg-indigo-500", "bg-emerald-500", "bg-purple-500", "bg-sky-500"];
                            return (
                              <div key={i} className="text-sm">
                                <div className="flex justify-between font-semibold mb-1">
                                  <span>{c.country}</span>
                                  <span className="text-slate-500">{c.share_percent}% ({c.supplier_count})</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded overflow-hidden">
                                  <div className={`h-full ${colors[i % colors.length]}`} style={{width: `${c.share_percent}%`}}></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 font-semibold">
                        {analyticsData.summary.total_suppliers} total active suppliers across {analyticsData.summary.countries_exposed} countries
                      </div>
                    </div>

                    {/* Tariff Financial Exposure — computed from rate × supplier conditions */}
                    <div className="border border-slate-200 rounded p-4 flex flex-col justify-between">
                      <div>
                        <span className="text-sm font-bold text-slate-400 block mb-2 uppercase">Financial Disruption Exposure</span>
                        <div className="mt-4">
                          <span className="text-4xl font-extrabold text-slate-900">
                            ${analyticsData.tariff_exposure.total_annual_exposure_usd.toLocaleString()}
                          </span>
                          <p className="text-sm text-slate-400 mt-1">Estimated annual tariff penalty across all active disruption events.</p>
                        </div>
                        {analyticsData.tariff_exposure.items.slice(0, 2).map((item: any) => (
                          <div key={item.event_id} className="mt-3 text-xs">
                            <div className="flex justify-between font-semibold text-slate-600 mb-0.5">
                              <span className="truncate max-w-[60%]">{item.event_title}</span>
                              <span>${item.annual_exposure_usd.toLocaleString()}</span>
                            </div>
                            <div className="text-slate-400">{item.source_country} · {(item.tariff_rate * 100).toFixed(0)}% tariff rate · {item.affected_supplier_count} supplier(s)</div>
                          </div>
                        ))}
                      </div>
                      {analyticsData.tariff_exposure.items.length === 0 && (
                        <div className="bg-slate-50 border border-slate-200 p-2 rounded text-xs text-slate-500 font-semibold mt-4">
                          No active tariff events with sourcing exposure found.
                        </div>
                      )}
                    </div>

                    {/* Approved Scenario Rank — from Scenario table, status=APPROVED */}
                    <div className="border border-slate-200 rounded p-4">
                      <span className="text-sm font-bold text-slate-400 block mb-3 uppercase">Approved Scenario Rank</span>
                      {analyticsData.approved_scenario_rank.length === 0 ? (
                        <div className="text-center py-6">
                          <p className="text-xs text-slate-400">No approved scenarios yet. Approve a recovery plan from the Scenarios tab to populate this ranking.</p>
                        </div>
                      ) : (
                        <div className="space-y-2 mt-2 text-sm">
                          {analyticsData.approved_scenario_rank.map((s: any) => (
                            <div key={s.id} className="flex justify-between items-center border-b border-slate-100 pb-2">
                              <span className="font-semibold text-slate-700">{s.rank}. {s.name}</span>
                              <span className={`text-xs font-bold ${
                                s.objective === "COST" ? "text-emerald-600" :
                                s.objective === "SPEED" ? "text-indigo-600" :
                                s.objective === "RISK_REDUCTION" ? "text-amber-600" : "text-slate-500"
                              }`}>{s.objective}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400 font-semibold">
                        {analyticsData.summary.total_approved_scenarios} approved decisions · {analyticsData.summary.confirmed_tariff_events} confirmed events
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: SUPPLY NETWORK */}
          {activeTab === "network" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-2">Supply Network Configuration</h3>
              <p className="text-sm text-slate-400 mb-6">Visual mapping of registered plants, materials, and active logistics lanes sourced from the database.</p>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Active Logistics Lanes</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                          <th className="pb-3">Route ID</th>
                          <th className="pb-3">Origin</th>
                          <th className="pb-3">Destination</th>
                          <th className="pb-3">Transport Mode</th>
                          <th className="pb-3">Transit Time</th>
                          <th className="pb-3 text-right">Cost Per Unit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {routes.map(r => (
                          <tr key={r.id} className="text-slate-700">
                            <td className="py-3 font-mono font-bold">{r.id}</td>
                            <td className="py-3">{r.origin}</td>
                            <td className="py-3">{r.destination}</td>
                            <td className="py-3">
                              <span className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded font-bold uppercase">{r.mode}</span>
                            </td>
                            <td className="py-3 font-semibold">{r.lead_time_days} days</td>
                            <td className="py-3 text-right font-bold">${r.cost_per_unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">Geographic Node Visual Flow</h4>
                  <SupplyNetworkGraph suppliers={suppliers} routes={routes} confirmations={confirmations} />
                </div>
              </div>
            </div>
          )}

          {/* TAB: DECISIONS */}
          {activeTab === "decisions" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-2">Approved Sourcing Decisions</h3>
              <p className="text-sm text-slate-400 mb-6">Logs scenario approvals and triggered operational PO transactions executed in ARES.</p>

              <div className="space-y-4">
                {scenarios.filter(s => s.status === "APPROVED").map(s => (
                  <div key={s.id} className="p-4 border border-emerald-150 bg-emerald-50/50 rounded flex flex-col md:flex-row md:items-center justify-between gap-4 text-sm">
                    <div className="flex flex-col space-y-4">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-900 text-base">{s.name}</span>
                          <div className="flex space-x-4 text-slate-500 font-medium">
                            <span>Scenario ID: <b>#{s.id}</b></span>
                            <span>Objective: <b>{s.objective}</b></span>
                            <span>Optimized Cost: <b>${s.optimized_cost.toLocaleString()}</b></span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center space-x-1.5 text-emerald-800 font-bold uppercase tracking-wider text-xs">
                            <CheckCircle className="h-4 w-4" />
                            <span>SAP Transmitted</span>
                          </div>
                          <button 
                            onClick={() => handleLoadNegotiations(s.id)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                          >
                            View Supplier Responses
                          </button>
                        </div>
                      </div>

                      {/* Negotiations Panel */}
                      {scenarioNegotiations[s.id] && (
                        <div className="mt-4 border-t border-emerald-200/50 pt-4">
                          <h5 className="text-xs font-bold text-slate-700 uppercase mb-3">Live Supplier Negotiations</h5>
                          {scenarioNegotiations[s.id].length === 0 ? (
                            <p className="text-xs text-slate-500">No active negotiations for this scenario.</p>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {scenarioNegotiations[s.id].map(neg => (
                                <div key={neg.id} className="bg-white border border-slate-200 rounded p-3 shadow-sm">
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-slate-800 text-sm">{neg.supplier_org_id}</span>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                      neg.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                      neg.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                                      neg.status === 'COUNTERED' ? 'bg-blue-100 text-blue-700' :
                                      'bg-slate-100 text-slate-700'
                                    }`}>
                                      {neg.status}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500 space-y-1">
                                    <div className="flex justify-between"><span>Action:</span> <span className="font-semibold text-slate-700">{neg.action_type}</span></div>
                                    <div className="flex justify-between"><span>Qty:</span> <span className="font-semibold text-slate-700">{neg.proposed_quantity}</span></div>
                                    <div className="flex justify-between"><span>Price:</span> <span className="font-semibold text-slate-700">${neg.price || '---'}</span></div>
                                    <div className="flex justify-between"><span>Lead Time:</span> <span className="font-semibold text-slate-700">{neg.lead_time || '---'} days</span></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {scenarios.filter(s => s.status === "APPROVED").length === 0 && (
                  <div className="text-center p-8 text-slate-400 text-sm">
                    No sourcing decisions approved yet. Go to the "Scenarios" tab to review and approve a plan.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: TRADE DATA SOURCES */}
          {activeTab === "trade-sources" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-1">Trade Data Sources</h3>
                <p className="text-sm text-slate-400 mb-6">Configure and manage external trade intelligence connections. Only Buyer Admins may configure these sources.</p>

                <div className="space-y-4">

                  {/* CBIC Card */}
                  <div className="border border-slate-200 rounded p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-150 text-[10px] font-bold uppercase tracking-wide">CBIC</span>
                        <span className="font-bold text-slate-900 text-sm">Central Board of Indirect Taxes and Customs</span>
                      </div>
                      <p className="text-xs text-slate-400">India — Customs / Tariff Notifications</p>
                      <p className="text-xs text-slate-500">Live web scraping of cbic.gov.in with LLM extraction. No API key required.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-1 rounded">
                        <CheckCircle className="h-3 w-3" /> Connected
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded">Always On</span>
                    </div>
                  </div>

                  {/* DGFT Card */}
                  <div className="border border-slate-200 rounded p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-150 text-[10px] font-bold uppercase tracking-wide">DGFT</span>
                        <span className="font-bold text-slate-900 text-sm">Directorate General of Foreign Trade</span>
                      </div>
                      <p className="text-xs text-slate-400">India — Trade Policy / Import-Export Restrictions</p>
                      <p className="text-xs text-slate-500">Live web scraping of dgft.gov.in with LLM extraction. No API key required.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-1 rounded">
                        <CheckCircle className="h-3 w-3" /> Connected
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded">Always On</span>
                    </div>
                  </div>

                  {/* USITC Card */}
                  <div className="border border-blue-100 rounded p-5 bg-blue-50/30">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-150 text-[10px] font-bold uppercase tracking-wide">USITC</span>
                          <span className="font-bold text-slate-900 text-sm">USITC DataWeb</span>
                        </div>
                        <p className="text-xs text-slate-400">United States — Trade / Tariff Intelligence</p>
                        <p className="text-xs text-slate-500">U.S. import/export trade flows, HTS classification, and trade signals.</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {usitcMetadata.status === "CONNECTED" && (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> CONNECTED
                          </span>
                        )}
                        {usitcMetadata.status === "CONFIGURED" && (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> CONFIGURED
                          </span>
                        )}
                        {usitcMetadata.status === "CONNECTION_FAILED" && (
                          <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded">
                            <XCircle className="h-3.5 w-3.5 text-red-600" /> CONNECTION FAILED
                          </span>
                        )}
                        {usitcMetadata.status === "FALLBACK" && (
                          <span className="flex items-center gap-1 text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded">
                            <AlertTriangle className="h-3.5 w-3.5 text-purple-600" /> FALLBACK MODE
                          </span>
                        )}
                        {usitcMetadata.status === "NOT_CONFIGURED" && (
                          <span className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
                            <XCircle className="h-3.5 w-3.5 text-slate-500" /> NOT CONFIGURED
                          </span>
                        )}
                      </div>
                    </div>

                    {/* USITC Server Managed Info */}
                    <div className="mt-4 pt-4 border-t border-blue-100 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-white/80 p-2.5 rounded border border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">INTEGRATION ENDPOINT</span>
                          <span className="text-xs font-mono text-slate-800 font-medium">{usitcMetadata.source_url || "https://datawebws.usitc.gov/dataweb"}</span>
                        </div>
                        <div className="bg-white/80 p-2.5 rounded border border-slate-200">
                          <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">CREDENTIAL STATUS</span>
                          <span className="text-xs font-mono font-semibold block mt-0.5">
                            {usitcMetadata.status === "CONNECTED" && <span className="text-emerald-700">Connected & Verified</span>}
                            {usitcMetadata.status === "CONFIGURED" && <span className="text-amber-700">Configured — Connection not verified</span>}
                            {usitcMetadata.status === "CONNECTION_FAILED" && <span className="text-red-700">Configured — Connection failed</span>}
                            {usitcMetadata.status === "FALLBACK" && <span className="text-purple-700">Fallback mode active</span>}
                            {usitcMetadata.status === "NOT_CONFIGURED" && <span className="text-slate-500">Not configured</span>}
                          </span>
                        </div>
                      </div>

                      {/* Status Explanation */}
                      <p className="text-xs text-slate-500 font-medium">
                        {usitcMetadata.status === "CONNECTED" && `USITC DataWeb connection verified live. Last verified: ${usitcMetadata.last_verified_at ? new Date(usitcMetadata.last_verified_at).toLocaleString() : "Just now"}.`}
                        {usitcMetadata.status === "CONFIGURED" && "Credentials detected in server environment, but live connection has not yet been verified."}
                        {usitcMetadata.status === "CONNECTION_FAILED" && `Unable to connect to USITC DataWeb. Reason: ${usitcMetadata.last_error || "Service request failed."}`}
                        {usitcMetadata.status === "FALLBACK" && "USITC live endpoints are currently unavailable. ARES is operating in deterministic fallback mode."}
                        {usitcMetadata.status === "NOT_CONFIGURED" && "USITC_API_KEY is missing in server environment backend/.env."}
                      </p>

                      <div className="flex items-center gap-3 pt-1">
                        <button
                          id="usitc-test-connection-btn"
                          disabled={usitcTesting}
                          onClick={async () => {
                            setUsitcTesting(true);
                            setError("");
                            setSuccess("");
                            try {
                              const res = await fetch("/api/trade/sources/usitc/test", {
                                method: "POST",
                                credentials: "include"
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setUsitcMetadata(data);
                                if (data.success) {
                                  setSuccess("USITC DataWeb connection verified successfully.");
                                } else {
                                  setError(`USITC connection failed. Reason: ${data.message}`);
                                }
                              } else {
                                setError("Could not reach ARES backend test endpoint.");
                              }
                            } catch (err: any) {
                              setError("Connection test failed: " + err.message);
                            } finally {
                              setUsitcTesting(false);
                            }
                          }}
                          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3.5 py-1.5 rounded transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${usitcTesting ? "animate-spin" : ""}`} />
                          <span>
                            {usitcTesting ? "Testing connection..." : usitcMetadata.status === "CONNECTED" ? "Retest Connection" : usitcMetadata.status === "CONNECTION_FAILED" ? "Retry Connection" : "Test Connection"}
                          </span>
                        </button>
                        <p className="text-xs text-slate-400">Server executes HTTPS connectivity test directly against USITC DataWeb host.</p>
                      </div>
                    </div>
                  </div>

                  {/* Manual Events Card */}
                  <div className="border border-slate-200 rounded p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wide">MANUAL</span>
                        <span className="font-bold text-slate-900 text-sm">Manual Event Entry</span>
                      </div>
                      <p className="text-xs text-slate-400">Global — Manual</p>
                      <p className="text-xs text-slate-500">Buyer Admins can directly register tariff or disruption events via form.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-1 rounded">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    </div>
                  </div>

                  {/* File Import Card */}
                  <div className="border border-slate-200 rounded p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-150 text-[10px] font-bold uppercase tracking-wide">IMPORT</span>
                        <span className="font-bold text-slate-900 text-sm">File Import</span>
                      </div>
                      <p className="text-xs text-slate-400">Global — CSV / Excel</p>
                      <p className="text-xs text-slate-500">Upload CSV files of tariff events for batch ingestion into the review pipeline.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-1 rounded">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Live Status Panel */}
              {tradeSources.length > 0 && (
                <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Live Adapter Status</h3>
                  <div className="divide-y divide-slate-100">
                    {tradeSources.map((src: any) => (
                      <div key={src.source} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            src.source === "CBIC" ? "bg-orange-50 text-orange-700 border border-orange-150" :
                            src.source === "DGFT" ? "bg-purple-50 text-purple-700 border border-purple-150" :
                            src.source === "USITC" ? "bg-blue-50 text-blue-700 border border-blue-150" :
                            "bg-slate-100 text-slate-600"
                          }`}>{src.source}</span>
                          <span className="text-sm font-semibold text-slate-700">{src.source}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                            src.mode === "MOCK" ? "bg-amber-50 text-amber-700 border border-amber-150" : "bg-emerald-50 text-emerald-700 border border-emerald-150"
                          }`}>{src.mode}</span>
                          {src.available ? (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                              <CheckCircle className="h-3 w-3" /> Available
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                              <XCircle className="h-3 w-3" /> Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-6">ARES Security Audit Trail</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                      <th className="pb-3">Timestamp</th>
                      <th className="pb-3">Operator</th>
                      <th className="pb-3">Action Type</th>
                      <th className="pb-3">Target Entity</th>
                      <th className="pb-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="text-slate-700">
                        <td className="py-3 font-mono text-slate-500">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 font-semibold">{log.email || "System"}</td>
                        <td className="py-3 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-xs font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 font-mono">{log.entity_type} ({log.entity_id})</td>
                        <td className="py-3 text-slate-650">{log.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}

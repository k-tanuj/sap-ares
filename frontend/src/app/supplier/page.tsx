"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building, Wrench, Package, Truck, AlertOctagon, 
  FileText, Shield, CheckCircle, RefreshCw, Plus, 
  MapPin, User, Users, Globe, DollarSign, Calendar, LogOut, Bell
} from "lucide-react";

export default function SupplierPortal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  
  // Supplier Status state
  const [onboardingStatus, setOnboardingStatus] = useState("REGISTERED");
  const [orgName, setOrgName] = useState("");
  
  // Data States
  const [profile, setProfile] = useState<any | null>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  
  // Notification States
  const [notifications, setNotifications] = useState<any[]>([]);
  const [activeNotification, setActiveNotification] = useState<any | null>(null);
  const [dashboardSummary, setDashboardSummary] = useState<any>(null);
  const [notificationScenario, setNotificationScenario] = useState<any | null>(null);
  const [editingFacility, setEditingFacility] = useState<any | null>(null);
  const [editingCondition, setEditingCondition] = useState<any | null>(null);
  const [editingInventory, setEditingInventory] = useState<any | null>(null);
  
  // Forms Inputs
  const [profileForm, setProfileForm] = useState({
    address: "",
    country: "",
    website: "",
    contact_name: "",
    contact_phone: "",
    contact_email: "",
    certifications: "",
    production_restrictions: ""
  });
  
  const [facilityForm, setFacilityForm] = useState({
    id: "",
    name: "",
    location: "",
    type: "MANUFACTURING",
    capacity_utilization: 60.0,
    emergency_capacity: 1000.0
  });

  const [conditionForm, setConditionForm] = useState({
    product_id: "MAT-001",
    base_price: 50.0,
    lead_time_days: 7,
    moq: 1000,
    capacity_per_week: 3000
  });

  const [inventoryForm, setInventoryForm] = useState({
    product_id: "",
    facility_id: "",
    quantity: 0,
    safety_stock: 0,
    allocation_limit: 0
  });


  const [routeForm, setRouteForm] = useState({
    id: "",
    origin: "",
    destination: "",
    mode: "OCEAN",
    lead_time_days: 0,
    cost_per_unit: 0,
    capacity_limit: 0
  });

  const [counterForm, setCounterForm] = useState<{ [key: number]: any }>({});


  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const role = localStorage.getItem("ares_role");
    const savedOrg = localStorage.getItem("ares_org");

    if (!role || !role.startsWith("SUPPLIER")) {
      router.replace("/login");
      return;
    }

    setOrgId(savedOrg);
    loadSupplierData("", savedOrg!);
  }, []);

  const loadSupplierData = async (_jwt: string = "", supplierOrgId: string = "") => {
    setLoading(true);
    setError("");
    try {
      // 1. Fetch organization status
      let currentStatus = onboardingStatus;
      const orgRes = await fetch("/api/suppliers/me", { credentials: 'include' });
      if (orgRes.ok) {
        const myOrg = await orgRes.json();
        currentStatus = myOrg.onboarding_status;
        setOnboardingStatus(myOrg.onboarding_status);
        setOrgName(myOrg.name);
        if (myOrg.id && !orgId) setOrgId(myOrg.id);
      }

      // 2. Fetch Supplier Profile (accessible in any onboarding status)
      const profRes = await fetch("/api/suppliers/profile", { credentials: 'include' });
      if (profRes.ok) {
        const pData = await profRes.json();
        setProfile(pData);
        setProfileForm({
          address: pData.address || "",
          country: pData.country || "",
          website: pData.website || "",
          contact_name: pData.contact_name || "",
          contact_phone: pData.contact_phone || "",
          contact_email: pData.contact_email || "",
          certifications: pData.certifications || "",
          production_restrictions: pData.production_restrictions || ""
        });
      }

      // 3. Fetch Operational Data (will return 403 in backend if not APPROVED/ACTIVE)
      const isApproved = currentStatus === "APPROVED" || currentStatus === "ACTIVE";
      
      // Fetch Confirmations / Disruption requests
      const confRes = await fetch("/api/tariffs/confirmations/all", { credentials: 'include' });
      if (confRes.ok) setConfirmations(await confRes.json());

      if (isApproved) {
        const facRes = await fetch("/api/suppliers/facilities", { credentials: 'include' });
        if (facRes.ok) setFacilities(await facRes.json());

        const prodRes = await fetch("/api/suppliers/products", { credentials: 'include' });
        if (prodRes.ok) setProducts(await prodRes.json());

        const condRes = await fetch("/api/suppliers/conditions", { credentials: 'include' });
        if (condRes.ok) setConditions(await condRes.json());

        const invRes = await fetch("/api/suppliers/inventory", { credentials: 'include' });
        if (invRes.ok) setInventory(await invRes.json());

        const negRes = await fetch("/api/suppliers/negotiations", { credentials: 'include' });
        if (negRes.ok) setNegotiations(await negRes.json());

        const routeRes = await fetch("/api/suppliers/routes", { credentials: 'include' });
        if (routeRes.ok) setRoutes(await routeRes.json());
      }

      // Fetch Dashboard Summary
      const summaryRes = await fetch("/api/suppliers/dashboard-summary", { credentials: 'include' });
      if (summaryRes.ok) setDashboardSummary(await summaryRes.json());

      // Fetch Secondary logs dynamically (Shipments, Docs return empty now)
      const shipRes = await fetch("/api/suppliers/shipments", { credentials: 'include' });
      if (shipRes.ok) setShipments(await shipRes.json());

      const disRes = await fetch("/api/suppliers/disruptions", { credentials: 'include' });
      if (disRes.ok) setIncidents(await disRes.json());

      const docRes = await fetch("/api/suppliers/documents", { credentials: 'include' });
      if (docRes.ok) setDocs(await docRes.json());
      
      const notifRes = await fetch("/api/suppliers/notifications", { credentials: 'include' });
      if (notifRes.ok) setNotifications(await notifRes.json());

    } catch (err: any) {
      // Quietly ignore operational 403s on loading since they are expected for pending orgs
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.replace("/login");
  };

  // Submit Profile update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/suppliers/profile", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(profileForm)
      });
      if (!res.ok) throw new Error("Failed to save profile changes");
      setSuccess("Company profile details updated successfully. Reviewer notified.");
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Facility
  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/suppliers/facilities", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(facilityForm)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to create facility record");
      }
      setSuccess("Operational facility successfully added to inventory map.");
      setFacilityForm({
        id: "",
        name: "",
        location: "",
        type: "MANUFACTURING",
        capacity_utilization: 60.0,
        emergency_capacity: 1000.0
      });
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteFacility = async (facId: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/suppliers/facilities/${facId}`, {
        method: "DELETE",
        credentials: "include"
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete facility");
      }
      setSuccess("Facility removed.");
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateFacility = async (facId: string, updatedData: any) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/suppliers/facilities/${facId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update facility");
      }
      setSuccess("Facility updated.");
      setEditingFacility(null);
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Sourcing Condition
  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/suppliers/conditions", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(conditionForm)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to submit catalog condition");
      }
      setSuccess("Catalog product specification updated.");
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateCondition = async (condId: number, updatedData: any) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/suppliers/conditions/${condId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error("Failed to update condition");
      setSuccess("Condition updated.");
      setEditingCondition(null);
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Inventory Stock
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/suppliers/inventory", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(inventoryForm)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to post stock levels");
      }
      setSuccess("Stock quantity record loaded.");
      setInventoryForm({ product_id: "", facility_id: "", quantity: 0, safety_stock: 0, allocation_limit: 0 });
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateInventory = async (invId: number, updatedData: any) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/suppliers/inventory/${invId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updatedData)
      });
      if (!res.ok) throw new Error("Failed to update inventory");
      setSuccess("Inventory updated.");
      setEditingInventory(null);
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/suppliers/routes", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(routeForm)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to post route");
      }
      setSuccess("Route recorded.");
      setRouteForm({
        id: "", origin: "", destination: "", mode: "OCEAN", lead_time_days: 0, cost_per_unit: 0, capacity_limit: 0
      });
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Disruption Exposure Confirmation
  const handleConfirmDisruption = async (confId: number, statusStr: "CONFIRMED_AFFECTED" | "NOT_AFFECTED", notes: string) => {
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/tariffs/confirmations/${confId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: statusStr,
          supplier_notes: notes
        })
      });
      if (!res.ok) throw new Error("Failed to update exposure status");
      setSuccess("Exposure status submitted to buyer control node.");
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReadNotification = async (notifId: number) => {
    try {
      const res = await fetch(`/api/suppliers/notifications/${notifId}/read`, {
        method: "PUT",
        credentials: "include"
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: true } : n));
        
        // Also fetch the scenario details
        const scenRes = await fetch(`/api/suppliers/notifications/${notifId}/scenario`, {
          credentials: "include"
        });
        if (scenRes.ok) {
          setNotificationScenario(await scenRes.json());
        }
      }
    } catch (err) {
      console.error("Failed to read notification", err);
    }
  };

  const handleNegotiationAction = async (negId: number, action: 'accept' | 'counter' | 'decline', counterData?: any) => {
    setError("");
    setSuccess("");
    try {
      let body: any = {};
      if (action === 'accept') {
        body = {
          signature_text: `ESIGN-${orgId || 'SUPPLIER'}-${Date.now()}`,
          signer_name: "Authorized Supplier Representative",
          signer_title: "Operations Director"
        };
      } else if (action === 'counter') {
        body = {
          counter_quantity: counterData?.proposed_quantity ? Number(counterData.proposed_quantity) : undefined,
          counter_unit_price: counterData?.price ? Number(counterData.price) : undefined,
          counter_lead_days: counterData?.lead_time ? Number(counterData.lead_time) : undefined,
          counter_notes: "Counter-proposal submitted via supplier portal"
        };
      } else if (action === 'decline') {
        body = {
          decline_reason: "Capacity constraints at local manufacturing plant"
        };
      }

      const res = await fetch(`/api/suppliers/negotiations/${negId}/${action}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`Failed to ${action} negotiation proposal`);
      setSuccess(`Negotiation proposal successfully ${action}ed.`);
      loadSupplierData("", orgId || "");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isApproved = onboardingStatus === "APPROVED" || onboardingStatus === "ACTIVE";

  return (
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 overflow-hidden text-slate-800 relative">
      {/* Background Soft Blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-200/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-pink-200/40 blur-[120px] pointer-events-none"></div>

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-64 bg-white/60 backdrop-blur-xl border border-white m-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between relative z-10 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <img src="/ares-logo.svg" alt="ARES Logo" className="h-8 w-8 object-contain" />
              <span className="font-bold text-xl tracking-tight text-slate-800">ARES Supplier</span>
            </div>
            <p className="text-sm text-indigo-500 font-semibold mt-1">Supplier Cockpit</p>
          </div>
          
          <nav className="p-4 space-y-1 overflow-y-auto custom-scrollbar flex-1">
            {[
              { id: "overview", label: "Overview", icon: Shield },
              { id: "company", label: "Company Profile", icon: User },
              { id: "products", label: "Provided Products", icon: Package },
              { id: "notifications", label: "Notifications", icon: Bell },
              { id: "negotiations", label: "Negotiations", icon: Users },
              { id: "facilities", label: "Facilities", icon: Building, restricted: true },
              { id: "catalog", label: "Catalog Conditions", icon: Wrench, restricted: true },
              { id: "inventory", label: "Inventory Stock", icon: Package, restricted: true },
              { id: "routes", label: "Routes", icon: Truck, restricted: true },
              { id: "shipments", label: "Shipments", icon: Truck },
              { id: "disruptions", label: "Disruptions", icon: AlertOctagon },
              { id: "documents", label: "Documents", icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              // Dim restricted tabs if not approved
              const isLocked = tab.restricted && !isApproved;
              return (
                <button
                  key={tab.id}
                  disabled={isLocked}
                  onClick={() => { setActiveTab(tab.id); setError(""); setSuccess(""); }}
                  className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-base font-semibold transition-all duration-200 ${
                    activeTab === tab.id 
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                  {isLocked && <span className="text-[10px] font-bold tracking-wide uppercase bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded border border-slate-200">Locked</span>}
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
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-800">
              {activeTab.toUpperCase().replace("_", " ")}
            </h2>
            <p className="text-xs text-indigo-500 font-mono mt-0.5 uppercase tracking-wider font-semibold">Organization: <b className="text-indigo-600">{orgName || orgId}</b></p>
          </div>
          
          <div className="flex items-center space-x-4">
            <button onClick={() => loadSupplierData("", orgId || "")}
              disabled={loading}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <span className={`text-xs font-mono font-bold px-3 py-1.5 rounded-full border uppercase tracking-widest ${
              isApproved ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-amber-50 text-amber-600 border-amber-200"
            }`}>
              Status: {onboardingStatus}
            </span>
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
          
          {/* Security Gate Notice for Pending Suppliers */}
          {!isApproved && (
            <div className="p-4 bg-amber-50 border border-amber-150 text-amber-800 text-sm rounded mb-4 flex items-start space-x-2 shadow-sm">
              <Shield className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Operational Isolation Lockdown</span>
                <p className="mt-0.5">Your organization onboarding status is currently <b>{onboardingStatus}</b>. Operational features (facilities mapping, catalog conditions, inventory stocks) are restricted by the system until approved.</p>
                <div className="mt-2 pt-2 border-t border-amber-200 text-amber-900">
                  <span className="font-semibold block text-xs uppercase tracking-widest mb-1">Hackathon Demo Instructions</span>
                  <p>To unlock these features, you must sign out (using the button at the bottom left) and log back in using a <b>Buyer Admin</b> account. Then, navigate to the <b>Suppliers</b> tab on the Buyer portal and click <b>Approve</b> next to your organization.</p>
                </div>
              </div>
            </div>
          )}
        </div>


          {/* TAB: NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center">
                  <Bell className="h-4 w-4 mr-2" />
                  Supplier Notifications
                </h3>
                
                {notifications.length === 0 ? (
                  <p className="text-slate-500 text-sm">No notifications available.</p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => {
                          setActiveNotification(notif);
                          if (!notif.is_read) handleReadNotification(notif.id);
                          else {
                            fetch(`/api/suppliers/notifications/${notif.id}/scenario`, { credentials: "include" })
                              .then(res => res.json())
                              .then(data => setNotificationScenario(data));
                          }
                        }}
                        className={`p-4 border rounded cursor-pointer transition-colors ${
                          activeNotification?.id === notif.id ? "border-indigo-500 bg-indigo-50" :
                          notif.is_read ? "border-slate-200 bg-white hover:bg-slate-50" : "border-amber-300 bg-amber-50 hover:bg-amber-100"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <h4 className={`font-bold ${notif.is_read ? "text-slate-800" : "text-amber-900"}`}>{notif.title}</h4>
                          {!notif.is_read && <span className="h-2.5 w-2.5 rounded-full bg-amber-500 mt-1 flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 mt-2 uppercase font-mono tracking-wider">{new Date(notif.created_at).toLocaleString()}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {activeNotification && notificationScenario && (
                <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">
                    Approved Recovery Plan Details
                  </h3>
                  
                  <div className="bg-indigo-50 rounded p-4 mb-6 border border-indigo-100">
                    <p className="text-xs uppercase font-bold text-indigo-500 tracking-wider mb-1">Disruption Context</p>
                    <p className="font-bold text-slate-800">{notificationScenario.disruption_event}</p>
                    <p className="text-sm text-slate-600 mt-1">{notificationScenario.objective}</p>
                  </div>
                  
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 border-b pb-2">Assigned Actions for Your Organization</h4>
                  {notificationScenario.my_actions?.length === 0 ? (
                    <p className="text-slate-500 text-sm italic">No specific supply chain actions assigned to you in this scenario.</p>
                  ) : (
                    <div className="space-y-3">
                      {notificationScenario.my_actions.map((act: any, idx: number) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-4 flex justify-between items-center">
                          <div>
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase rounded inline-block mb-2">
                              {act.action_type.replace(/_/g, " ")}
                            </span>
                            <p className="text-sm text-slate-700">Product: <b className="text-slate-900 font-mono bg-white px-1 border rounded">{act.product_id}</b></p>
                            {act.route_id && <p className="text-sm text-slate-700 mt-1">Route: <b className="text-slate-900 font-mono bg-white px-1 border rounded">{act.route_id}</b></p>}
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-slate-500 uppercase font-bold block mb-1">Target Quantity</span>
                            <span className="text-lg font-black text-emerald-600">{act.quantity.toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}


          {/* TAB: NEGOTIATIONS */}
          {activeTab === "negotiations" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-white p-6 rounded border border-slate-200 shadow-sm">
                <div>
                  <h3 className="text-xl font-black text-slate-800">Negotiations</h3>
                  <p className="text-sm text-slate-500 mt-1">Review, accept, or counter recovery proposals from buyers.</p>
                </div>
              </div>

              {negotiations.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 border border-slate-200 rounded">
                  <p className="text-slate-500">No active negotiations.</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {negotiations.map(neg => (
                    <div key={neg.id} className="bg-white border border-slate-200 rounded p-6 shadow-sm">
                      <div className="flex justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-slate-800">Scenario #{neg.scenario_id}</h4>
                          <p className="text-sm text-slate-500">Action: {neg.action_type}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-bold rounded uppercase h-fit ${
                          neg.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                          neg.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                          neg.status === 'COUNTERED' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {neg.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                          <span className="text-xs font-bold text-slate-400 block mb-1">Requested Qty</span>
                          <span className="text-lg font-black text-slate-800">{neg.proposed_quantity || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                          <span className="text-xs font-bold text-slate-400 block mb-1">Price</span>
                          <span className="text-lg font-black text-slate-800">${neg.price || 'N/A'}</span>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                          <span className="text-xs font-bold text-slate-400 block mb-1">Lead Time</span>
                          <span className="text-lg font-black text-slate-800">{neg.lead_time || 'N/A'} days</span>
                        </div>
                      </div>

                      {neg.status === 'PENDING' && (
                        <div className="border-t border-slate-100 pt-4">
                          <h5 className="text-sm font-bold text-slate-700 mb-3">Your Response</h5>
                          <div className="flex items-end gap-4 mb-4">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Counter Qty</label>
                              <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                                value={counterForm[neg.id]?.proposed_quantity || neg.proposed_quantity || ''}
                                onChange={e => setCounterForm(prev => ({...prev, [neg.id]: {...prev[neg.id], proposed_quantity: parseInt(e.target.value)}}))}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Counter Price</label>
                              <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                                value={counterForm[neg.id]?.price || neg.price || ''}
                                onChange={e => setCounterForm(prev => ({...prev, [neg.id]: {...prev[neg.id], price: parseFloat(e.target.value)}}))}
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-slate-500 mb-1">Counter Lead Time</label>
                              <input 
                                type="number" 
                                className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm"
                                value={counterForm[neg.id]?.lead_time || neg.lead_time || ''}
                                onChange={e => setCounterForm(prev => ({...prev, [neg.id]: {...prev[neg.id], lead_time: parseInt(e.target.value)}}))}
                              />
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <button 
                              onClick={() => handleNegotiationAction(neg.id, 'accept')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-4 py-2 rounded transition-colors"
                            >
                              Accept (E-Sign)
                            </button>
                            <button 
                              onClick={() => handleNegotiationAction(neg.id, 'counter', counterForm[neg.id])}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-4 py-2 rounded transition-colors"
                            >
                              Submit Counter
                            </button>
                            <button 
                              onClick={() => handleNegotiationAction(neg.id, 'decline')}
                              className="bg-red-50 text-red-600 hover:bg-red-100 font-bold text-sm px-4 py-2 rounded transition-colors ml-auto border border-red-200"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: OVERVIEW */}

          {activeTab === "overview" && (
            <div className="space-y-6">
              
              {dashboardSummary && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center space-x-4">
                    <div className="bg-amber-100 p-3 rounded-full"><AlertOctagon className="h-6 w-6 text-amber-600" /></div>
                    <div>
                      <p className="text-sm text-slate-500 uppercase font-bold tracking-wide">Active Alerts</p>
                      <p className="text-2xl font-black text-slate-800">{dashboardSummary.active_alerts}</p>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center space-x-4">
                    <div className="bg-emerald-100 p-3 rounded-full"><Package className="h-6 w-6 text-emerald-600" /></div>
                    <div>
                      <p className="text-sm text-slate-500 uppercase font-bold tracking-wide">Inventory Items</p>
                      <p className="text-2xl font-black text-slate-800">{dashboardSummary.inventory_items}</p>
                    </div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded p-4 shadow-sm flex items-center space-x-4">
                    <div className="bg-indigo-100 p-3 rounded-full"><Bell className="h-6 w-6 text-indigo-600" /></div>
                    <div>
                      <p className="text-sm text-slate-500 uppercase font-bold tracking-wide">Unread Notifs</p>
                      <p className="text-2xl font-black text-slate-800">{dashboardSummary.unread_notifications}</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Active tariff alerts */}
              <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Disruption exposure alerts</h3>
                <div className="space-y-4">
                  {confirmations.map((c) => (
                    <div key={c.id} className="p-4 bg-slate-50 border border-slate-200 rounded flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="text-sm font-bold text-indigo-600 uppercase tracking-wide">Action Required</span>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{c.tariff_event?.title}</h4>
                        <p className="text-sm text-slate-500 mt-1">Origin: {c.tariff_event?.source_country} → Rate increase: +{(c.tariff_event?.tariff_rate_increase * 100)}%</p>
                        <p className="text-[11px] font-medium text-indigo-750 bg-indigo-50 border border-indigo-100 rounded px-2.5 py-1 mt-2.5 w-fit">
                          Current status: <b>{c.status.replace("_", " ")}</b>
                        </p>
                      </div>
                      
                      {c.status === "POTENTIALLY_AFFECTED" && (
                        <div className="flex flex-col space-y-2">
                          <input 
                            type="text"
                            placeholder="Add explanation notes..."
                            id={`notes-${c.id}`}
                            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-950 focus:outline-none focus:border-indigo-500 bg-white"
                          />
                          <div className="flex space-x-1 justify-end">
                            <button
                              onClick={() => {
                                const input = document.getElementById(`notes-${c.id}`) as HTMLInputElement;
                                handleConfirmDisruption(c.id, "CONFIRMED_AFFECTED", input?.value || "Actual exposure confirmed.");
                              }}
                              className="bg-red-650 hover:bg-red-750 text-white font-bold text-sm px-2.5 py-1 rounded"
                            >
                              Confirm Affected
                            </button>
                            <button
                              onClick={() => {
                                const input = document.getElementById(`notes-${c.id}`) as HTMLInputElement;
                                handleConfirmDisruption(c.id, "NOT_AFFECTED", input?.value || "The tariff does not materially affect us.");
                              }}
                              className="bg-emerald-650 hover:bg-emerald-750 text-white font-bold text-sm px-2.5 py-1 rounded"
                            >
                              Declare Unaffected
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {confirmations.length === 0 && (
                    <p className="text-sm text-slate-400 text-center">No active tariff exposure notifications from buyer node.</p>
                  )}
                </div>
              </div>

              {/* Status information card */}
              <div className="bg-white border border-slate-200 rounded p-6 shadow-sm text-sm space-y-3">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500">Sourcing Compliance Checklist</h3>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-emerald-650" />
                  <span>Onboarding status registered</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className={profile ? "h-4 w-4 text-emerald-650" : "h-4 w-4 text-slate-300"} />
                  <span>Company contact details populated</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className={isApproved ? "h-4 w-4 text-emerald-650" : "h-4 w-4 text-slate-300"} />
                  <span>Onboarding approved by Buyer Control Node</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB: COMPANY PROFILE */}
          {activeTab === "company" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6 max-w-2xl">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-6">Company Profile details</h3>
              
              <form onSubmit={handleUpdateProfile} className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Company Address</label>
                    <input 
                      type="text" 
                      value={profileForm.address}
                      onChange={(e) => setProfileForm({...profileForm, address: e.target.value})}
                      className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      placeholder="e.g. Cleanroom Road 1"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Country</label>
                    <input 
                      type="text" 
                      value={profileForm.country}
                      onChange={(e) => setProfileForm({...profileForm, country: e.target.value})}
                      className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      placeholder="e.g. Germany"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Website URL</label>
                    <input 
                      type="text" 
                      value={profileForm.website}
                      onChange={(e) => setProfileForm({...profileForm, website: e.target.value})}
                      className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      placeholder="e.g. www.comp.com"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Contact Name</label>
                    <input 
                      type="text" 
                      value={profileForm.contact_name}
                      onChange={(e) => setProfileForm({...profileForm, contact_name: e.target.value})}
                      className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Contact Phone</label>
                    <input 
                      type="text" 
                      value={profileForm.contact_phone}
                      onChange={(e) => setProfileForm({...profileForm, contact_phone: e.target.value})}
                      className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Contact Email</label>
                    <input 
                      type="email" 
                      value={profileForm.contact_email}
                      onChange={(e) => setProfileForm({...profileForm, contact_email: e.target.value})}
                      className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Industrial Certifications (comma separated)</label>
                  <input 
                    type="text" 
                    value={profileForm.certifications}
                    onChange={(e) => setProfileForm({...profileForm, certifications: e.target.value})}
                    className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    placeholder="e.g. ISO-9001, Cleanroom Class 5"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Production Restrictions / Logistics Constraints</label>
                  <textarea 
                    value={profileForm.production_restrictions}
                    onChange={(e) => setProfileForm({...profileForm, production_restrictions: e.target.value})}
                    className="w-full rounded border border-slate-300 px-3 py-2 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    rows={3}
                  />
                </div>

                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded transition-colors"
                >
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}

          {/* TAB: FACILITIES */}
          {activeTab === "facilities" && isApproved && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Facilities List */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded shadow-sm p-6">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Registered Facilities</h3>
                <div className="space-y-3">
                  {facilities.map(f => (
                    <div key={f.id} className="p-4 bg-slate-50 border border-slate-200 rounded flex flex-col gap-2 text-sm">
                      {editingFacility?.id === f.id ? (
                        <div className="flex flex-col gap-2">
                          <input type="text" value={editingFacility.name} onChange={(e) => setEditingFacility({...editingFacility, name: e.target.value})} className="rounded border px-2 py-1" placeholder="Name" />
                          <input type="text" value={editingFacility.location} onChange={(e) => setEditingFacility({...editingFacility, location: e.target.value})} className="rounded border px-2 py-1" placeholder="Location" />
                          <select value={editingFacility.type} onChange={(e) => setEditingFacility({...editingFacility, type: e.target.value})} className="rounded border px-2 py-1">
                            <option value="MANUFACTURING">MANUFACTURING</option>
                            <option value="WAREHOUSE">WAREHOUSE</option>
                            <option value="DISTRIBUTION">DISTRIBUTION</option>
                          </select>
                          <div className="flex gap-2 items-center">
                            <input type="number" value={editingFacility.capacity_utilization} onChange={(e) => setEditingFacility({...editingFacility, capacity_utilization: parseFloat(e.target.value)})} className="rounded border px-2 py-1 w-24" placeholder="Utilization %" />
                            <input type="number" value={editingFacility.emergency_capacity} onChange={(e) => setEditingFacility({...editingFacility, emergency_capacity: parseFloat(e.target.value)})} className="rounded border px-2 py-1 w-24" placeholder="Emerg Cap" />
                          </div>
                          <div className="flex gap-2 justify-end mt-2">
                            <button onClick={() => setEditingFacility(null)} className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300">Cancel</button>
                            <button onClick={() => handleUpdateFacility(f.id, editingFacility)} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-900 text-base">{f.name}</span>
                            <div className="flex space-x-4 mt-1 text-slate-500">
                              <span>ID: <b>{f.id}</b></span>
                              <span>Type: <b>{f.type}</b></span>
                              <span>Location: <b>{f.location}</b></span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <div>
                              <span className="block font-semibold">Utilization</span>
                              <span className="font-bold text-slate-800">{f.capacity_utilization}%</span>
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => setEditingFacility(f)} className="text-xs text-indigo-600 hover:underline">Edit</button>
                              <button onClick={() => { if(confirm("Delete facility?")) handleDeleteFacility(f.id); }} className="text-xs text-red-600 hover:underline">Delete</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {facilities.length === 0 && (
                    <p className="text-sm text-slate-400 text-center">No manufacturing facilities registered yet.</p>
                  )}
                </div>
              </div>

              {/* Add Facility Form */}
              <div className="bg-white border border-slate-200 rounded shadow-sm p-6 h-fit">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Add Operational Facility</h3>
                <form onSubmit={handleAddFacility} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Facility ID / Code</label>
                    <input 
                      type="text" required
                      value={facilityForm.id}
                      onChange={(e) => setFacilityForm({...facilityForm, id: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      placeholder="e.g. FAC-DE-02"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Facility Name</label>
                    <input 
                      type="text" required
                      value={facilityForm.name}
                      onChange={(e) => setFacilityForm({...facilityForm, name: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      placeholder="e.g. Munich Fab II"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Location (City/Country)</label>
                    <input 
                      type="text" required
                      value={facilityForm.location}
                      onChange={(e) => setFacilityForm({...facilityForm, location: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      placeholder="Munich, Germany"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Facility Type</label>
                    <select 
                      value={facilityForm.type}
                      onChange={(e) => setFacilityForm({...facilityForm, type: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    >
                      <option value="MANUFACTURING">MANUFACTURING</option>
                      <option value="WAREHOUSE">WAREHOUSE</option>
                      <option value="DISTRIBUTION">DISTRIBUTION</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Utilization %</label>
                      <input 
                        type="number" required
                        value={facilityForm.capacity_utilization}
                        onChange={(e) => setFacilityForm({...facilityForm, capacity_utilization: parseFloat(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Emerg Cap (weekly)</label>
                      <input 
                        type="number" required
                        value={facilityForm.emergency_capacity}
                        onChange={(e) => setFacilityForm({...facilityForm, emergency_capacity: parseFloat(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded transition-colors"
                  >
                    Register Facility
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: CATALOG / CONDITIONS */}
          {activeTab === "catalog" && isApproved && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Conditions List */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded shadow-sm p-6">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Sourcing Pricing & Lead times</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Component / Material</th>
                        <th className="pb-3">Base Price</th>
                        <th className="pb-3">Lead Time</th>
                        <th className="pb-3">MOQ</th>
                        <th className="pb-3">Weekly Capacity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {conditions.map(c => (
                        <tr key={c.id} className="text-slate-700">
                          <td className="py-3 font-semibold text-slate-900">{c.product?.name || c.product_id}</td>
                          {editingCondition?.id === c.id ? (
                            <>
                              <td className="py-2"><input type="number" step="0.01" value={editingCondition.base_price} onChange={(e) => setEditingCondition({...editingCondition, base_price: parseFloat(e.target.value)})} className="w-20 border rounded px-1" /></td>
                              <td className="py-2"><input type="number" value={editingCondition.lead_time_days} onChange={(e) => setEditingCondition({...editingCondition, lead_time_days: parseInt(e.target.value)})} className="w-16 border rounded px-1" /></td>
                              <td className="py-2"><input type="number" value={editingCondition.moq} onChange={(e) => setEditingCondition({...editingCondition, moq: parseInt(e.target.value)})} className="w-16 border rounded px-1" /></td>
                              <td className="py-2">
                                <div className="flex gap-2">
                                  <input type="number" value={editingCondition.capacity_per_week} onChange={(e) => setEditingCondition({...editingCondition, capacity_per_week: parseInt(e.target.value)})} className="w-20 border rounded px-1" />
                                  <button onClick={() => handleUpdateCondition(c.id, editingCondition)} className="text-indigo-600 font-bold hover:underline">Save</button>
                                  <button onClick={() => setEditingCondition(null)} className="text-slate-500 hover:underline">Cancel</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 font-bold">${c.base_price}</td>
                              <td className="py-3">{c.lead_time_days} days</td>
                              <td className="py-3 font-mono">{c.moq} units</td>
                              <td className="py-3 font-mono font-bold text-indigo-650 flex justify-between items-center group">
                                <span>{c.capacity_per_week} / week</span>
                                <button onClick={() => setEditingCondition(c)} className="text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity underline">Edit</button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Condition Form */}
              <div className="bg-white border border-slate-200 rounded shadow-sm p-6 h-fit">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Update Sourcing Catalog</h3>
                <form onSubmit={handleAddCondition} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Component ID</label>
                    <input 
                      type="text" required
                      value={conditionForm.product_id}
                      onChange={(e) => setConditionForm({...conditionForm, product_id: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Base Price ($)</label>
                      <input 
                        type="number" step="0.01" required
                        value={conditionForm.base_price}
                        onChange={(e) => setConditionForm({...conditionForm, base_price: parseFloat(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Lead Time (days)</label>
                      <input 
                        type="number" required
                        value={conditionForm.lead_time_days}
                        onChange={(e) => setConditionForm({...conditionForm, lead_time_days: parseInt(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">MOQ</label>
                      <input 
                        type="number" required
                        value={conditionForm.moq}
                        onChange={(e) => setConditionForm({...conditionForm, moq: parseInt(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Weekly Capacity</label>
                      <input 
                        type="number" required
                        value={conditionForm.capacity_per_week}
                        onChange={(e) => setConditionForm({...conditionForm, capacity_per_week: parseInt(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded transition-colors"
                  >
                    Submit Sourcing Condition
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: INVENTORY */}
          {activeTab === "inventory" && isApproved && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Inventory Table */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded shadow-sm p-6">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Stock Levels</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Component / Material</th>
                        <th className="pb-3">Facility</th>
                        <th className="pb-3">Quantity Available</th>
                        <th className="pb-3">Safety Stock</th>
                        <th className="pb-3">Allocation Limit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {inventory.map(i => (
                        <tr key={i.id} className="text-slate-700">
                          <td className="py-3 font-semibold text-slate-900">{i.product?.name || i.product_id}</td>
                          <td className="py-3">{i.facility?.name || i.facility_id || "Unspecified"}</td>
                          {editingInventory?.id === i.id ? (
                            <>
                              <td className="py-2"><input type="number" value={editingInventory.quantity} onChange={(e) => setEditingInventory({...editingInventory, quantity: parseInt(e.target.value)})} className="w-20 border rounded px-1" /></td>
                              <td className="py-2"><input type="number" value={editingInventory.safety_stock} onChange={(e) => setEditingInventory({...editingInventory, safety_stock: parseInt(e.target.value)})} className="w-20 border rounded px-1" /></td>
                              <td className="py-2">
                                <div className="flex gap-2 items-center">
                                  <input type="number" value={editingInventory.allocation_limit} onChange={(e) => setEditingInventory({...editingInventory, allocation_limit: parseInt(e.target.value)})} className="w-20 border rounded px-1" />
                                  <button onClick={() => handleUpdateInventory(i.id, editingInventory)} className="text-indigo-600 font-bold hover:underline">Save</button>
                                  <button onClick={() => setEditingInventory(null)} className="text-slate-500 hover:underline">Cancel</button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="py-3 font-bold font-mono text-slate-800">{i.quantity}</td>
                              <td className="py-3 font-mono text-slate-500">{i.safety_stock}</td>
                              <td className="py-3 font-mono font-bold text-indigo-650 flex justify-between items-center group">
                                <span>{i.allocation_limit}</span>
                                <button onClick={() => setEditingInventory(i)} className="text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity underline">Edit</button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Inventory Form */}
              <div className="bg-white border border-slate-200 rounded shadow-sm p-6 h-fit">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Report Physical Stock</h3>
                <form onSubmit={handleAddInventory} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Component / Material</label>
                    {products && products.length > 0 ? (
                      <select 
                        required
                        value={inventoryForm.product_id}
                        onChange={(e) => setInventoryForm({...inventoryForm, product_id: e.target.value})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white font-medium"
                      >
                        <option value="">Select a Component...</option>
                        {products.map((p: any) => (
                          <option key={p.id} value={p.id}>
                            {p.id} — {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <select 
                        required
                        value={inventoryForm.product_id}
                        onChange={(e) => setInventoryForm({...inventoryForm, product_id: e.target.value})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white font-medium"
                      >
                        <option value="">Select a Component...</option>
                        <option value="MAT-001">MAT-001 — Microcontroller Chip X2</option>
                        <option value="MAT-002">MAT-002 — Automotive Sensor Array S1</option>
                        <option value="MAT-003">MAT-003 — Copper Cable Harness H5</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Facility (Optional)</label>
                    {facilities && facilities.length > 0 ? (
                      <select 
                        value={inventoryForm.facility_id}
                        onChange={(e) => setInventoryForm({...inventoryForm, facility_id: e.target.value})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      >
                        <option value="">(None / Unassigned)</option>
                        {facilities.map((f: any) => (
                          <option key={f.id} value={f.id}>
                            {f.id} — {f.name} ({f.location})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input 
                        type="text"
                        value={inventoryForm.facility_id}
                        onChange={(e) => setInventoryForm({...inventoryForm, facility_id: e.target.value})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                        placeholder="Leave blank or register facility first"
                      />
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Stock Qty</label>
                      <input 
                        type="number" required
                        value={inventoryForm.quantity}
                        onChange={(e) => setInventoryForm({...inventoryForm, quantity: parseInt(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Safety Stock</label>
                      <input 
                        type="number" required
                        value={inventoryForm.safety_stock}
                        onChange={(e) => setInventoryForm({...inventoryForm, safety_stock: parseInt(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Alloc Limit</label>
                      <input 
                        type="number" required
                        value={inventoryForm.allocation_limit}
                        onChange={(e) => setInventoryForm({...inventoryForm, allocation_limit: parseInt(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded transition-colors"
                  >
                    Post Stock Quantity
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: ROUTES */}
          {activeTab === "routes" && isApproved && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Routes Table */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded shadow-sm p-6">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Sourcing Routes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase">
                        <th className="pb-3">Route ID</th>
                        <th className="pb-3">Origin</th>
                        <th className="pb-3">Destination</th>
                        <th className="pb-3">Mode</th>
                        <th className="pb-3">Lead Time</th>
                        <th className="pb-3">Cost/Unit</th>
                        <th className="pb-3">Capacity limit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {routes.map(r => (
                        <tr key={r.id} className="text-slate-700">
                          <td className="py-3 font-semibold text-slate-900">{r.id}</td>
                          <td className="py-3">{r.origin}</td>
                          <td className="py-3">{r.destination}</td>
                          <td className="py-3 text-xs font-bold text-slate-500 bg-slate-100 rounded px-2 w-fit">{r.mode}</td>
                          <td className="py-3 font-mono">{r.lead_time_days} days</td>
                          <td className="py-3 font-mono font-bold">${r.cost_per_unit}</td>
                          <td className="py-3 font-mono font-bold text-indigo-650">{r.capacity_limit}</td>
                        </tr>
                      ))}
                      {routes.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-sm text-slate-400 text-center py-4">No logistics routes registered.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Route Form */}
              <div className="bg-white border border-slate-200 rounded shadow-sm p-6 h-fit">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Add Logistics Route</h3>
                <form onSubmit={handleAddRoute} className="space-y-4 text-sm">
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Route ID / Code</label>
                    <input 
                      type="text" required
                      value={routeForm.id}
                      onChange={(e) => setRouteForm({...routeForm, id: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      placeholder="e.g. RT-OCEAN-CN-DE"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Origin</label>
                      <input 
                        type="text" required
                        value={routeForm.origin}
                        onChange={(e) => setRouteForm({...routeForm, origin: e.target.value})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Destination</label>
                      <input 
                        type="text" required
                        value={routeForm.destination}
                        onChange={(e) => setRouteForm({...routeForm, destination: e.target.value})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Transport Mode</label>
                    <select 
                      value={routeForm.mode}
                      onChange={(e) => setRouteForm({...routeForm, mode: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    >
                      <option value="OCEAN">Ocean</option>
                      <option value="AIR">Air</option>
                      <option value="ROAD">Road</option>
                      <option value="RAIL">Rail</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Lead Time</label>
                      <input 
                        type="number" required
                        value={routeForm.lead_time_days}
                        onChange={(e) => setRouteForm({...routeForm, lead_time_days: parseInt(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                        placeholder="days"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Cost</label>
                      <input 
                        type="number" required step="0.01"
                        value={routeForm.cost_per_unit}
                        onChange={(e) => setRouteForm({...routeForm, cost_per_unit: parseFloat(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                        placeholder="$/unit"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Cap Limit</label>
                      <input 
                        type="number" required
                        value={routeForm.capacity_limit}
                        onChange={(e) => setRouteForm({...routeForm, capacity_limit: parseInt(e.target.value)})}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                        placeholder="units"
                      />
                    </div>
                  </div>
                  <button 
                    type="submit"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2 rounded transition-colors"
                  >
                    Add Route
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB: SHIPMENTS */}
          {activeTab === "shipments" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6 text-center text-slate-500 py-12">
              <Truck className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p>SAP Logistics module not configured for this prototype instance.</p>
            </div>
          )}

          {/* TAB: DISRUPTIONS */}
          {activeTab === "disruptions" && (
            <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Disruption Confirmations log</h3>
              <div className="space-y-3 text-sm">
                {confirmations.map(c => (
                  <div key={c.id} className="p-4 border rounded bg-slate-50 border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-950">{c.tariff_event?.title}</span>
                      <p className="text-slate-500 mt-0.5">Event ID: {c.tariff_event_id} | Status: <b>{c.status.replace("_", " ")}</b></p>
                    </div>
                  </div>
                ))}
                {confirmations.length === 0 && (
                  <p className="text-slate-400 text-center">No disruptions logged.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: DOCUMENTS */}
          {activeTab === "documents" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6 text-center text-slate-500 py-12">
              <FileText className="h-12 w-12 mx-auto text-slate-300 mb-4" />
              <p>Document storage module not configured for this prototype instance.</p>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}

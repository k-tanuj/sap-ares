"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Building, Wrench, Package, Truck, AlertOctagon, 
  FileText, Shield, CheckCircle, RefreshCw, Plus, 
  MapPin, User, Users, Globe, DollarSign, Calendar, LogOut,
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
  const [conditions, setConditions] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  
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
    product_id: "MAT-001",
    facility_id: "",
    quantity: 5000,
    safety_stock: 1000,
    allocation_limit: 3000
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("ares_token");
    const role = localStorage.getItem("ares_role");
    const savedOrg = localStorage.getItem("ares_org");

    if (!savedToken || !role || !role.startsWith("SUPPLIER")) {
      router.replace("/login");
      return;
    }

    setToken(savedToken);
    setOrgId(savedOrg);
    loadSupplierData(savedToken, savedOrg!);
  }, []);

  const loadSupplierData = async (jwt: string, supplierOrgId: string) => {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${jwt}` };
      
      // 1. Fetch organization status
      // We list all suppliers as buyer, but here we can check me or call our specific supplier query
      const meRes = await fetch("http://localhost:8000/api/auth/me", { headers });
      if (meRes.ok) {
        const me = await meRes.json();
        // Fetch organization details
        const orgRes = await fetch(`http://localhost:8000/api/suppliers`, { headers });
        if (orgRes.ok) {
          const orgsList = await orgRes.json();
          const myOrg = orgsList.find((o: any) => o.id === supplierOrgId);
          if (myOrg) {
            setOnboardingStatus(myOrg.onboarding_status);
            setOrgName(myOrg.name);
          }
        }
      }

      // 2. Fetch Supplier Profile (accessible in any onboarding status)
      const profRes = await fetch("http://localhost:8000/api/suppliers/profile", { headers });
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
      // We check locally to avoid console errors
      const isApproved = onboardingStatus === "APPROVED" || onboardingStatus === "ACTIVE";
      
      // Fetch Confirmations / Disruption requests
      const confRes = await fetch("http://localhost:8000/api/tariffs/confirmations/all", { headers });
      if (confRes.ok) setConfirmations(await confRes.json());

      if (isApproved) {
        const facRes = await fetch("http://localhost:8000/api/suppliers/facilities", { headers });
        if (facRes.ok) setFacilities(await facRes.json());

        const condRes = await fetch("http://localhost:8000/api/suppliers/conditions", { headers });
        if (condRes.ok) setConditions(await condRes.json());

        const invRes = await fetch("http://localhost:8000/api/suppliers/inventory", { headers });
        if (invRes.ok) setInventory(await invRes.json());
      }

      // Fetch Mock/Secondary logs dynamically
      const shipRes = await fetch("http://localhost:8000/api/suppliers/shipments", { headers });
      if (shipRes.ok) setShipments(await shipRes.json());

      const disRes = await fetch("http://localhost:8000/api/suppliers/disruptions", { headers });
      if (disRes.ok) setIncidents(await disRes.json());

      const docRes = await fetch("http://localhost:8000/api/suppliers/documents", { headers });
      if (docRes.ok) setDocs(await docRes.json());

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
    if (!token || !orgId) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("http://localhost:8000/api/suppliers/profile", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(profileForm)
      });
      if (!res.ok) throw new Error("Failed to save profile changes");
      setSuccess("Company profile details updated successfully. Reviewer notified.");
      loadSupplierData(token, orgId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Facility
  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("http://localhost:8000/api/suppliers/facilities", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(facilityForm)
      });
      if (!res.ok) throw new Error("Failed to create facility record");
      setSuccess("Operational facility successfully added to inventory map.");
      setFacilityForm({
        id: "",
        name: "",
        location: "",
        type: "MANUFACTURING",
        capacity_utilization: 60.0,
        emergency_capacity: 1000.0
      });
      loadSupplierData(token, orgId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Sourcing Condition
  const handleAddCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("http://localhost:8000/api/suppliers/conditions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(conditionForm)
      });
      if (!res.ok) throw new Error("Failed to submit catalog condition");
      setSuccess("Catalog product specification updated.");
      loadSupplierData(token, orgId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Inventory Stock
  const handleAddInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !orgId) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch("http://localhost:8000/api/suppliers/inventory", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(inventoryForm)
      });
      if (!res.ok) throw new Error("Failed to post stock levels");
      setSuccess("Stock quantity record loaded.");
      loadSupplierData(token, orgId);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Submit Disruption Exposure Confirmation
  const handleConfirmDisruption = async (confId: number, statusStr: "CONFIRMED_AFFECTED" | "NOT_AFFECTED", notes: string) => {
    if (!token || !orgId) return;
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`http://localhost:8000/api/tariffs/confirmations/${confId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          status: statusStr,
          supplier_notes: notes
        })
      });
      if (!res.ok) throw new Error("Failed to update exposure status");
      setSuccess("Exposure status submitted to buyer control node.");
      loadSupplierData(token, orgId);
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
      <aside className="w-64 bg-white/60 backdrop-blur-xl border border-white m-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between relative z-10">
        <div>
          <div className="p-6 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <div className="bg-indigo-100 p-1.5 rounded-lg border border-indigo-200">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="font-bold text-xl tracking-tight text-slate-800">ARES Supplier</span>
            </div>
            <p className="text-sm text-indigo-500 font-semibold mt-1">Supplier Cockpit</p>
          </div>
          
          <nav className="p-4 space-y-1">
            {[
              { id: "overview", label: "Overview", icon: Shield },
              { id: "company", label: "Company Profile", icon: User },
              { id: "facilities", label: "Facilities", icon: Building, restricted: true },
              { id: "catalog", label: "Catalog Conditions", icon: Wrench, restricted: true },
              { id: "inventory", label: "Inventory Stock", icon: Package, restricted: true },
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
            <button 
              onClick={() => token && orgId && loadSupplierData(token, orgId)}
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
            <div className="p-4 bg-amber-50 border border-amber-150 text-amber-800 text-sm rounded mb-4 flex items-start space-x-2">
              <Shield className="h-4 w-4 mt-0.5" />
              <div>
                <span className="font-bold">Operational Isolation Lockdown</span>
                <p className="mt-0.5">Your organization onboarding status is currently <b>{onboardingStatus}</b>. Operational features (facilities mapping, catalog conditions, inventory stocks) are restricted until approved. Please update your <b>Company Profile</b> to submit details for Buyer review.</p>
              </div>
            </div>
          )}
        </div>


          
          {/* TAB: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              
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
                    <div key={f.id} className="p-4 bg-slate-50 border border-slate-200 rounded flex justify-between items-center text-sm">
                      <div>
                        <span className="font-bold text-slate-900 text-base">{f.name}</span>
                        <div className="flex space-x-4 mt-1 text-slate-500">
                          <span>ID: <b>{f.id}</b></span>
                          <span>Type: <b>{f.type}</b></span>
                          <span>Location: <b>{f.location}</b></span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-semibold">Utilization</span>
                        <span className="font-bold text-slate-800">{f.capacity_utilization}%</span>
                      </div>
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
                          <td className="py-3 font-bold">${c.base_price}</td>
                          <td className="py-3">{c.lead_time_days} days</td>
                          <td className="py-3 font-mono">{c.moq} units</td>
                          <td className="py-3 font-mono font-bold text-indigo-650">{c.capacity_per_week} / week</td>
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
                          <td className="py-3 font-bold font-mono text-slate-800">{i.quantity}</td>
                          <td className="py-3 font-mono text-slate-500">{i.safety_stock}</td>
                          <td className="py-3 font-mono font-bold text-indigo-650">{i.allocation_limit}</td>
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
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Component ID</label>
                    <input 
                      type="text" required
                      value={inventoryForm.product_id}
                      onChange={(e) => setInventoryForm({...inventoryForm, product_id: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 uppercase tracking-wide mb-1">Facility ID (optional)</label>
                    <input 
                      type="text"
                      value={inventoryForm.facility_id}
                      onChange={(e) => setInventoryForm({...inventoryForm, facility_id: e.target.value})}
                      className="w-full rounded border border-slate-300 px-2 py-1.5 focus:outline-none focus:border-indigo-500 text-slate-950 bg-white"
                      placeholder="e.g. FAC-DE-02"
                    />
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

          {/* TAB: SHIPMENTS (Mocked) */}
          {activeTab === "shipments" && (
            <div className="bg-white border border-slate-200 rounded shadow-sm p-6">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Active Shipments (SAP OData Mock)</h3>
              <div className="space-y-4 text-sm">
                {shipments.map((ship) => (
                  <div key={ship.id} className="p-4 bg-slate-50 border border-slate-200 rounded flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-950">{ship.id}</span>
                      <p className="text-slate-500 mt-1">Carrier: {ship.carrier || "DHL"} | Route: {ship.origin} → {ship.destination}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                        ship.status === "DELIVERED" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-indigo-50 text-indigo-700 border border-indigo-150"
                      }`}>
                        {ship.status}
                      </span>
                      <span className="block text-xs text-slate-400 mt-1">ETA: {ship.eta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: DISRUPTIONS (Mocked list of incidents) */}
          {activeTab === "disruptions" && (
            <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Active Incidents Log</h3>
              <div className="space-y-3 text-sm">
                {incidents.map(d => (
                  <div key={d.id} className="p-4 border rounded bg-slate-50 border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-slate-950">{d.title}</span>
                      <p className="text-slate-500 mt-0.5">Incident ID: {d.id} | Severity: <b>{d.severity}</b></p>
                    </div>
                    <span className="text-xs font-bold text-slate-500 tracking-wider uppercase border rounded px-2 py-0.5 bg-white shadow-xs">
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: DOCUMENTS (Mocked ISO / compliance docs) */}
          {activeTab === "documents" && (
            <div className="bg-white border border-slate-200 rounded p-6 shadow-sm">
              <h3 className="text-base font-bold uppercase tracking-wider text-slate-500 mb-4">Compliance Document Repository</h3>
              <div className="space-y-3 text-sm">
                {docs.map(doc => (
                  <div key={doc.id} className="p-4 border rounded bg-slate-50 border-slate-200 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-indigo-500" />
                      <div>
                        <span className="font-bold text-slate-950 hover:underline cursor-pointer">{doc.filename}</span>
                        <p className="text-slate-500 mt-0.5">ID: {doc.id} | Category: <b>{doc.type}</b></p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">Uploaded: {doc.uploaded_at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  
  // Login Form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Register Form
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regOrgId, setRegOrgId] = useState("");
  const [regOrgName, setRegOrgName] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Clean local state on toggle
  const toggleView = () => {
    setIsRegister(!isRegister);
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const formData = new URLSearchParams();
      formData.append("username", loginEmail);
      formData.append("password", loginPassword);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
        credentials: "include", // Enable sending/receiving secure HttpOnly cookies
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Authentication failed");
      }

      // The backend sets ares_access_token as an HttpOnly cookie automatically.
      // We still need to call /api/auth/me to get the user's role and organization ID.

      const meRes = await fetch("/api/auth/me", {
        credentials: "include", // Send the HttpOnly cookie
      });

      if (!meRes.ok) throw new Error("Failed to load user session");
      
      const me = await meRes.json();
      localStorage.setItem("ares_role", me.role);
      localStorage.setItem("ares_org", me.organization_id);
      localStorage.setItem("ares_email", me.email);

      // Redirect based on role
      if (me.role.startsWith("BUYER")) {
        router.push("/buyer");
      } else {
        router.push("/supplier");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Register Supplier (status starts as REGISTERED)
      const res = await fetch(`/api/auth/register-supplier?org_name=${encodeURIComponent(regOrgName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: regEmail,
          password: regPassword,
          role: "SUPPLIER_ADMIN",
          organization_id: regOrgId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Registration failed");
      }

      setSuccess("Onboarding registration successful! Your account is now PENDING_VERIFICATION under buyer review.");
      // Clear inputs
      setRegEmail("");
      setRegPassword("");
      setRegOrgId("");
      setRegOrgName("");
      // Switch back to login page
      setTimeout(() => {
        setIsRegister(false);
        setError("");
        setSuccess("");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Onboarding failed. Please ensure the Organization ID is unique.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-pink-50">
      {/* Soft abstract blobs instead of dark glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-200/40 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full bg-pink-200/40 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md m-auto relative z-10 px-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 relative overflow-hidden border border-white">
          
          {/* Subtle top border gradient */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500"></div>

          <div className="text-center mb-10">
            <img 
              src="/ares-logo.svg" 
              alt="ARES Logo" 
              className="inline-flex h-16 w-16 object-contain mb-3 drop-shadow-md" 
            />
            <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">ARES</h1>
            <p className="text-sm text-slate-500 font-medium tracking-wide uppercase mt-2">Control Plane Access</p>
          </div>

          {error && (
            <div className="mb-6 p-4 text-sm font-medium text-red-800 bg-red-50/50 backdrop-blur-sm rounded-xl border border-red-200 shadow-sm flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 text-sm font-medium text-emerald-800 bg-emerald-50/50 backdrop-blur-sm rounded-xl border border-emerald-200 shadow-sm flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              {success}
            </div>
          )}

          {!isRegister ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Enterprise Email
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-slate-900 hover:bg-slate-800 py-3.5 text-base font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/20"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Authenticating...
                  </>
                ) : (
                  <>Sign In to ARES Control <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></>
                )}
              </button>

              <div className="text-center pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={toggleView}
                  className="text-base text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                >
                  Don't have an account? <span className="font-bold">Register as Supplier</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Supplier Org ID
                  </label>
                  <input
                    type="text"
                    required
                    value={regOrgId}
                    onChange={(e) => setRegOrgId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    placeholder="org-supplier-korea"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Company / Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={regOrgName}
                    onChange={(e) => setRegOrgName(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    placeholder="Seoul Semiconductors Co."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    placeholder="admin@seoulsemi.co.kr"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white/50 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-indigo-600 hover:bg-indigo-700 py-3.5 text-base font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20 mt-2"
              >
                {loading ? "Registering..." : "Submit Application"}
              </button>

              <div className="text-center pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={toggleView}
                  className="text-base text-slate-500 hover:text-indigo-600 font-medium transition-colors"
                >
                  Already registered? <span className="font-bold">Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

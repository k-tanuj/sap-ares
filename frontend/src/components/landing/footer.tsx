import { Shield } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto bg-slate-950 text-slate-400 text-sm py-12 border-t border-slate-900 relative z-10">
      <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center space-x-2.5">
          <img src="/ares-logo.svg" alt="ARES Logo" className="h-6 w-6 object-contain" />
          <span className="font-bold text-white tracking-tight text-lg">ARES Control Plane</span>
        </div>
        <div className="text-xs">
          &copy; {new Date().getFullYear()} Autonomous Resilience & Enterprise Sourcing. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

"use client";

import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Header() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        <div 
          onClick={() => scrollToSection('home')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 font-bold group-hover:bg-indigo-100 transition-colors">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">ARES</span>
        </div>
        
        <nav className="hidden md:flex gap-8">
          <button onClick={() => scrollToSection('home')} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">Home</button>
          <button onClick={() => scrollToSection('about')} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">About</button>
          <button onClick={() => scrollToSection('architecture')} className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">System Architecture</button>
        </nav>
        
        <div className="flex items-center gap-3">
          <Link href="/login" className="rounded-full bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 shadow-md">
            Access Control Center
          </Link>
        </div>
      </div>
    </header>
  );
}

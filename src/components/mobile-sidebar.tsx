'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';

export function ResponsiveLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close on route change (simple approach)
  useEffect(() => {
    const handleClick = () => setSidebarOpen(false);
    window.addEventListener('popstate', handleClick);
    return () => window.removeEventListener('popstate', handleClick);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Desktop sidebar */}
      <div className="hidden md:flex shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar panel - force visible on mobile */}
          <div className="relative z-10 w-64 h-full animate-slide-in [&_aside]:!flex">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 z-20 p-1 rounded-lg bg-white/10 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 h-12 border-b border-border bg-card shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg hover:bg-accent/50 transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground">AI Try-On</span>
        </div>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

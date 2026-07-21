"use client";

import { useState, type ReactNode } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";

export function AppShell({ children, userName }: { children: ReactNode; userName?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f7f9ff] text-[#10233f]">
      <AppSidebar className="fixed inset-y-0 left-0 z-30 hidden lg:flex" />
      {sidebarOpen ? <div className="fixed inset-0 z-40 lg:hidden"><button aria-label="Close navigation" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} /><AppSidebar className="relative z-10 shadow-2xl" onClose={() => setSidebarOpen(false)} /></div> : null}
      <div className="lg:pl-[220px]"><AppHeader onMenuClick={() => setSidebarOpen(true)} userName={userName} /><main className="px-4 py-7 sm:px-7 lg:px-8 lg:py-8">{children}</main></div>
    </div>
  );
}

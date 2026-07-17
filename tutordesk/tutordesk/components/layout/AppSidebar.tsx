"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, CalendarCheck2, ClipboardCheck, HelpCircle, LayoutDashboard, Layers3, LogOut, ReceiptText, Settings, Users, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Registrations", icon: ClipboardCheck, href: "/registrations" },
  { label: "Students", icon: Users, href: "/students" },
  { label: "Batches", icon: Layers3, href: "/batches" },
  { label: "Attendance", icon: CalendarCheck2, href: "/attendance" },
  { label: "Fees", icon: ReceiptText, href: "/fees" },
  { label: "Reports", icon: BarChart3, href: "/reports" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function AppSidebar({ className, onClose }: { className?: string; onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className={cn("flex h-full w-[220px] flex-col border-r border-[#dce5f4] bg-[#edf3ff] text-slate-600", className)}>
      <div className="flex h-[58px] items-center justify-between border-b border-[#dce5f4] px-5">
        <div className="flex items-center gap-3">
          <div className="grid size-8 place-items-center rounded-md bg-[#0764ce] text-sm font-bold text-white">T</div>
          <div><p className="text-lg font-extrabold leading-5 tracking-tight text-[#0560bd]">TutorDesk</p><p className="text-[10px] font-semibold text-slate-600">Management Portal</p></div>
        </div>
        {onClose ? <Button aria-label="Close navigation" className="lg:hidden" onClick={onClose} size="icon" variant="ghost"><X /></Button> : null}
      </div>
      <nav aria-label="Main navigation" className="flex-1 px-4 py-8">
        <ul className="space-y-1">
          {navigation.map((item) => { const Icon = item.icon; const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return (
            <li key={item.label}><Link aria-current={active ? "page" : undefined} className={cn("flex h-11 items-center gap-3 rounded-lg px-4 text-[13px] font-medium transition-colors", active ? "border-r-[3px] border-blue-600 bg-[#d7e6ff] font-bold text-[#075eb7]" : "hover:bg-white/70 hover:text-[#075eb7]")} href={item.href} onClick={onClose}><Icon className="size-[18px]" />{item.label}</Link></li>
          ); })}
        </ul>
      </nav>
      <div className="space-y-1 px-4 pb-6">
        <button className="flex h-11 w-full items-center gap-3 rounded-lg px-4 text-[13px] hover:bg-white/70"><HelpCircle className="size-[18px]" />Help</button>
        <button className="flex h-11 w-full items-center gap-3 rounded-lg px-4 text-[13px] hover:bg-white/70"><LogOut className="size-[18px]" />Logout</button>
      </div>
    </aside>
  );
}

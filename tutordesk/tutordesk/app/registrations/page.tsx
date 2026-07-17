"use client";

import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { ChevronRight, Search, UserPlus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Status = "PENDING" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED";
type Registration = {
  id: string;
  reference: string;
  studentFirstName: string;
  studentLastName: string;
  parentFirstName: string;
  parentLastName: string;
  yearLevel: number;
  status: Status;
  submittedAt: string;
};

const tabs: { label: string; value: "ALL" | Status }[] = [
  { label: "All", value: "ALL" },
  { label: "Pending", value: "PENDING" },
  { label: "Changes requested", value: "CHANGES_REQUESTED" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
];

const statusLabels: Record<Status, string> = {
  PENDING: "Pending",
  CHANGES_REQUESTED: "Changes requested",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const statusStyles: Record<Status, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  CHANGES_REQUESTED: "bg-blue-50 text-blue-700 ring-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

export default function RegistrationsPage() {
  const [activeTab, setActiveTab] = useState<"ALL" | Status>("ALL");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRegistrations() {
      setIsLoading(true);
      setError("");
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("status", activeTab);
      if (deferredQuery.trim()) params.set("q", deferredQuery.trim());

      try {
        const response = await fetch(`/api/registrations?${params}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Registrations could not be loaded.");
        setRegistrations(result.registrations);
        setCounts(result.counts);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }

    loadRegistrations();
    return () => controller.abort();
  }, [activeTab, deferredQuery, reloadKey]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px] space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h1 className="text-[30px] font-bold tracking-[-0.025em] text-[#10233f]">Registrations</h1><p className="mt-1 text-sm text-slate-500">Review and manage student registration requests.</p></div>
          <Button className="h-10 self-start bg-blue-600 px-4 text-white hover:bg-blue-700" nativeButton={false} render={<Link href="/registrations/new" />} size="lg"><UserPlus /> New registration</Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Summary label="Pending review" value={counts.PENDING ?? 0} tone="text-amber-600" />
          <Summary label="Approved" value={counts.APPROVED ?? 0} tone="text-emerald-600" />
          <Summary label="Total registrations" value={counts.ALL ?? 0} tone="text-blue-600" />
        </div>

        <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label="Registration status">
              {tabs.map((tab) => <button aria-selected={activeTab === tab.value} className={activeTab === tab.value ? "whitespace-nowrap rounded-lg bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700" : "whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"} key={tab.value} onClick={() => setActiveTab(tab.value)} role="tab">{tab.label}{counts[tab.value] !== undefined ? ` (${counts[tab.value]})` : ""}</button>)}
            </div>
            <div className="relative w-full lg:w-72"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input className="h-10 border-slate-200 bg-white pl-9 text-sm" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or reference..." value={query} /></div>
          </div>

          <CardContent className="px-0">
            <div className="hidden grid-cols-[minmax(190px,1.4fr)_minmax(150px,1fr)_100px_150px_140px_44px] gap-4 border-b border-slate-100 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400 md:grid"><span>Student</span><span>Parent</span><span>Year</span><span>Submitted</span><span>Status</span><span /></div>
            {error ? <div className="px-5 py-14 text-center"><p className="font-semibold text-rose-700">{error}</p><Button className="mt-4" onClick={() => setReloadKey((value) => value + 1)} variant="outline">Try again</Button></div> : null}
            {!error && isLoading ? <div className="space-y-1 p-3" aria-label="Loading registrations">{[1, 2, 3].map((item) => <div className="h-16 animate-pulse rounded-lg bg-slate-50" key={item} />)}</div> : null}
            {!error && !isLoading ? <div className="divide-y divide-slate-100">
              {registrations.map((item) => {
                const studentName = `${item.studentFirstName} ${item.studentLastName}`;
                const parentName = `${item.parentFirstName} ${item.parentLastName}`;
                const initials = `${item.studentFirstName[0] ?? ""}${item.studentLastName[0] ?? ""}`.toUpperCase();
                return <Link className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-slate-50 md:grid-cols-[minmax(190px,1.4fr)_minmax(150px,1fr)_100px_150px_140px_44px] md:items-center md:gap-4" href={`/registrations/${item.id}`} key={item.id}><span className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">{initials}</span><span><span className="block text-sm font-bold text-[#10233f]">{studentName}</span><span className="mt-0.5 block text-[11px] text-slate-400">{item.reference}</span></span></span><span className="text-sm text-slate-600"><span className="mr-1 text-[11px] font-bold uppercase text-slate-400 md:hidden">Parent:</span>{parentName}</span><span className="text-sm font-semibold text-[#10233f]">Year {item.yearLevel}</span><span className="text-xs text-slate-500">{formatDate(item.submittedAt)}</span><span><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusStyles[item.status]}`}>{statusLabels[item.status]}</span></span><span className="hidden size-8 place-items-center rounded-lg text-slate-400 md:grid"><ChevronRight className="size-4" /></span></Link>;
              })}
              {registrations.length === 0 ? <div className="px-5 py-14 text-center"><p className="font-semibold text-[#10233f]">No registrations found</p><p className="mt-1 text-sm text-slate-500">Try another search or status filter.</p></div> : null}
            </div> : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <Card className="gap-2 border-0 bg-white px-5 py-4 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><p className="text-xs font-semibold text-slate-500">{label}</p><p className={`text-3xl font-bold ${tone}`}>{value}</p></Card>;
}

"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, CircleDollarSign, Clock3, Users, X } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type BillingMethod = "MONTHLY" | "FULL_TERM";
type Fee = {
  id: string;
  studentId: string;
  sessionCount: number;
  rate: number;
  amount: number;
  dueDate: string;
  status: "PAID" | "UNPAID";
  paidAt: string | null;
  paymentNote: string | null;
  student: { id: string; firstName: string; lastName: string; yearLevel: number };
};
type FeeData = {
  batch: { id: string; name: string; isRecurring: boolean; startDate: string; endDate: string | null; feePerSession: number | null; billingMethod: BillingMethod | null; currency: string };
  periods: { id: string; label: string; periodStart: string; periodEnd: string; studentCount: number }[];
  selectedPeriod: { id: string; label: string; periodStart: string; periodEnd: string; fees: Fee[] } | null;
  today: string;
};

export default function ManageFeesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: batchId } = use(params);
  const [data, setData] = useState<FeeData | null>(null);
  const [periodId, setPeriodId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payment, setPayment] = useState<{ feeIds: string[]; title: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (requestedPeriod?: string) => {
    if (!batchId) return;
    setIsLoading(true); setError("");
    try {
      const query = requestedPeriod ? `?period=${encodeURIComponent(requestedPeriod)}` : "";
      const response = await fetch(`/api/batches/${batchId}/fees${query}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Fees could not be loaded.");
      setData(result); setPeriodId(result.selectedPeriod?.id ?? ""); setSelected(new Set());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Fees could not be loaded.");
    } finally { setIsLoading(false); }
  }, [batchId]);

  useEffect(() => {
    const timeout = window.setTimeout(load, 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  const fees = useMemo(() => data?.selectedPeriod?.fees ?? [], [data]);
  const unpaid = fees.filter((fee) => fee.status === "UNPAID");
  const paid = fees.filter((fee) => fee.status === "PAID");
  const overdue = unpaid.filter((fee) => dateOnly(fee.dueDate) < (data?.today ?? ""));
  const outstanding = unpaid.reduce((sum, fee) => sum + fee.amount, 0);

  function toggleFee(id: string) {
    setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  }

  async function markUnpaid(feeId: string) {
    await updatePayments([feeId], false, "");
  }

  async function updatePayments(feeIds: string[], isPaid: boolean, note: string) {
    setError("");
    try {
      const response = await fetch(`/api/batches/${batchId}/fees/payments`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feeIds, paid: isPaid, note }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Payment status could not be updated.");
      setPayment(null); await load(periodId);
    } catch (updateError) { setError(updateError instanceof Error ? updateError.message : "Payment status could not be updated."); }
  }

  return <AppShell><div className="mx-auto max-w-[1240px] space-y-6">
    <div>
      <Button className="-ml-3 text-slate-500 hover:text-blue-700" nativeButton={false} render={<Link href="/batches" />} variant="ghost"><ArrowLeft /> Back to batches</Button>
      <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h1 className="text-[30px] font-bold tracking-[-0.025em] text-[#10233f]">{data?.batch.name ?? "Manage fees"}</h1><p className="mt-1 text-sm text-slate-500">Track scheduled-session fees and record payments.</p></div>
        {data?.batch.feePerSession ? <div className="rounded-xl bg-white px-4 py-3 text-sm shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><span className="text-slate-500">Fee per session </span><strong className="text-[#10233f]">{money(data.batch.feePerSession, data.batch.currency)}</strong><span className="mx-2 text-slate-300">·</span><span className="font-semibold text-blue-700">{data.batch.billingMethod === "MONTHLY" ? "Monthly" : "Full term"}</span></div> : null}
      </div>
    </div>

    {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</div> : null}
    {isLoading ? <div className="h-80 animate-pulse rounded-xl bg-white" /> : null}
    {!isLoading && data?.batch.feePerSession ? <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Students" value={String(fees.length)} icon={Users} tone="bg-blue-100 text-blue-600" />
        <Summary label="Paid" value={String(paid.length)} icon={CheckCircle2} tone="bg-emerald-100 text-emerald-600" />
        <Summary label="Unpaid" value={String(unpaid.length)} icon={CircleDollarSign} tone="bg-amber-100 text-amber-600" />
        <Summary label="Overdue" value={`${overdue.length} · ${money(overdue.reduce((sum, fee) => sum + fee.amount, 0), data.batch.currency)}`} icon={Clock3} tone="bg-rose-100 text-rose-600" />
      </div>

      <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-[#10233f]">Student fees</h2><p className="mt-1 text-xs text-slate-500">{money(outstanding, data.batch.currency)} currently outstanding</p></div>
          <select aria-label="Fee period" className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-[#10233f] outline-none focus:border-blue-500" onChange={(event) => { setPeriodId(event.target.value); load(event.target.value); }} value={periodId}>{data.periods.map((period) => <option key={period.id} value={period.id}>{period.label}</option>)}</select>
        </div>
        {unpaid.length > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3"><label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600"><input checked={unpaid.every((fee) => selected.has(fee.id))} className="size-4 accent-blue-600" onChange={(event) => setSelected(event.target.checked ? new Set(unpaid.map((fee) => fee.id)) : new Set())} type="checkbox" /> Select all unpaid</label><Button className="bg-blue-600 text-white hover:bg-blue-700" disabled={selected.size === 0} onClick={() => setPayment({ feeIds: [...selected], title: `Mark ${selected.size} selected as paid` })} size="sm"><CheckCircle2 /> Mark selected paid</Button></div> : null}
        <CardContent className="px-0 py-0">
          {fees.length === 0 ? <div className="px-5 py-14 text-center"><CircleDollarSign className="mx-auto size-10 text-slate-300" /><p className="mt-3 font-semibold text-[#10233f]">No student fees for this period</p><p className="mt-1 text-sm text-slate-500">Assign students whose joining date falls within this fee period.</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400"><th className="w-12 px-5 py-3"></th><th className="px-2 py-3">Student</th><th className="px-2 py-3">Sessions</th><th className="px-2 py-3">Due date</th><th className="px-2 py-3">Amount</th><th className="px-2 py-3">Status</th><th className="px-5 py-3 text-right">Action</th></tr></thead><tbody>{fees.map((fee) => {
            const isOverdue = fee.status === "UNPAID" && dateOnly(fee.dueDate) < data.today;
            return <tr className="border-b border-slate-100 last:border-0" key={fee.id}><td className="px-5 py-4">{fee.status === "UNPAID" ? <input aria-label={`Select ${fee.student.firstName}`} checked={selected.has(fee.id)} className="size-4 accent-blue-600" onChange={() => toggleFee(fee.id)} type="checkbox" /> : null}</td><td className="px-2 py-4"><p className="text-sm font-bold text-[#10233f]">{fee.student.firstName} {fee.student.lastName}</p><p className="mt-0.5 text-xs text-slate-400">Year {fee.student.yearLevel}{fee.paymentNote ? ` · ${fee.paymentNote}` : ""}</p></td><td className="px-2 py-4 text-sm text-slate-600">{fee.sessionCount}</td><td className={isOverdue ? "px-2 py-4 text-sm font-semibold text-rose-600" : "px-2 py-4 text-sm text-slate-600"}>{formatDate(fee.dueDate)}{isOverdue ? <span className="ml-2 rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold">Overdue</span> : null}</td><td className="px-2 py-4 text-sm font-bold text-[#10233f]">{money(fee.amount, data.batch.currency)}</td><td className="px-2 py-4"><span className={fee.status === "PAID" ? "rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700" : "rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700"}>{fee.status === "PAID" ? "Paid" : "Unpaid"}</span></td><td className="px-5 py-4 text-right">{fee.status === "PAID" ? <Button className="text-slate-500" onClick={() => markUnpaid(fee.id)} size="sm" variant="ghost">Mark unpaid</Button> : <Button className="border-blue-200 text-blue-700" onClick={() => setPayment({ feeIds: [fee.id], title: `Record payment for ${fee.student.firstName}` })} size="sm" variant="outline">Mark paid</Button>}</td></tr>;
          })}</tbody></table></div>}
        </CardContent>
      </Card>
    </> : null}
    {payment ? <PaymentModal title={payment.title} onClose={() => setPayment(null)} onSave={(note) => updatePayments(payment.feeIds, true, note)} /> : null}
  </div></AppShell>;
}

function PaymentModal({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: (note: string) => Promise<void> }) {
  const [note, setNote] = useState(""); const [isSaving, setIsSaving] = useState(false);
  async function save() { setIsSaving(true); await onSave(note); setIsSaving(false); }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4" onMouseDown={onClose}><div className="w-full max-w-md rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b border-slate-100 px-6 py-5"><div><h2 className="text-lg font-bold text-[#10233f]">{title}</h2><p className="mt-1 text-sm text-slate-500">Add an optional payment note.</p></div><button aria-label="Close" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" onClick={onClose}><X className="size-5" /></button></div><div className="px-6 py-5"><label className="text-xs font-bold text-[#10233f]">Note</label><Input className="mt-2 h-10 border-slate-200" maxLength={250} onChange={(event) => setNote(event.target.value)} placeholder="e.g. Cash received" value={note} /></div><div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4"><Button disabled={isSaving} onClick={onClose} variant="outline">Cancel</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={isSaving} onClick={save}><CheckCircle2 />{isSaving ? "Saving..." : "Confirm paid"}</Button></div></div></div>;
}

function Summary({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof Users; tone: string }) { return <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardContent className="flex items-center gap-4 px-5 py-4"><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span><div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-[#10233f]">{value}</p></div></CardContent></Card>; }
function dateOnly(value: string) { return value.slice(0, 10); }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value)); }
function money(value: number, currency: string) { return new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }

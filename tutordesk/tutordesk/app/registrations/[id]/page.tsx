"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, CheckCircle2, Clock3, Mail, MapPin, Phone, X } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Status = "PENDING" | "APPROVED" | "CHANGES_REQUESTED" | "REJECTED";
type ReviewAction = "request" | "reject" | null;
type Review = { id: string; action: "APPROVED" | "REQUESTED_CHANGES" | "REJECTED"; note: string | null; reviewerName: string; createdAt: string };
type Registration = {
  id: string; reference: string; studentFirstName: string; studentLastName: string; dateOfBirth: string; yearLevel: number; school: string | null; learningNeeds: string | null;
  parentFirstName: string; parentLastName: string; relationship: string; email: string; phone: string; address: string | null; emergencyContactName: string | null; emergencyContactPhone: string | null;
  status: Status; submittedAt: string; reviews: Review[];
};

const statusLabels: Record<Status, string> = { PENDING: "Pending", APPROVED: "Approved", CHANGES_REQUESTED: "Changes requested", REJECTED: "Rejected" };
const statusStyles: Record<Status, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200", APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  CHANGES_REQUESTED: "bg-blue-50 text-blue-700 ring-blue-200", REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};
const reviewLabels = { APPROVED: "Approved registration", REQUESTED_CHANGES: "Requested changes", REJECTED: "Rejected registration" };

export default function RegistrationDetailsPage() {
  const params = useParams<{ id: string }>();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reviewAction, setReviewAction] = useState<ReviewAction>(null);
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/registrations/${params.id}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Registration could not be loaded.");
        setRegistration(result.registration);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
      } finally { if (!controller.signal.aborted) setIsLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [params.id]);

  async function saveReview(action: "APPROVE" | "REQUEST_CHANGES" | "REJECT", reviewNote = "") {
    setIsSaving(true); setError("");
    try {
      const response = await fetch(`/api/registrations/${params.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note: reviewNote }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "The review could not be saved.");
      setRegistration(result.registration);
      setReviewAction(null); setNote("");
      setMessage(action === "APPROVE" ? "Registration approved. Parent and student records were created." : action === "REQUEST_CHANGES" ? "Change request saved." : "Registration rejected.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The review could not be saved."); }
    finally { setIsSaving(false); }
  }

  if (isLoading) return <AppShell><div className="mx-auto max-w-[1120px] space-y-5"><div className="h-5 w-40 animate-pulse rounded bg-slate-200" /><div className="h-20 animate-pulse rounded-xl bg-white" /><div className="grid gap-5 lg:grid-cols-[1fr_310px]"><div className="h-96 animate-pulse rounded-xl bg-white" /><div className="h-64 animate-pulse rounded-xl bg-white" /></div></div></AppShell>;
  if (!registration) return <AppShell><div className="mx-auto max-w-lg py-20 text-center"><h1 className="text-xl font-bold text-[#10233f]">Registration unavailable</h1><p className="mt-2 text-sm text-slate-500">{error}</p><Button className="mt-5" nativeButton={false} render={<Link href="/registrations" />} variant="outline">Back to registrations</Button></div></AppShell>;

  const studentName = `${registration.studentFirstName} ${registration.studentLastName}`;
  const parentName = `${registration.parentFirstName} ${registration.parentLastName}`;
  const initials = `${registration.studentFirstName[0] ?? ""}${registration.studentLastName[0] ?? ""}`.toUpperCase();
  const canReview = registration.status === "PENDING" || registration.status === "CHANGES_REQUESTED";

  return (
    <AppShell>
      <div className="mx-auto max-w-[1120px] space-y-5">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700" href="/registrations"><ArrowLeft className="size-4" /> Back to registrations</Link>
        {message ? <Notice tone="success" onClose={() => setMessage("")}>{message}</Notice> : null}
        {error ? <Notice tone="error" onClose={() => setError("")}>{error}</Notice> : null}

        <div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-full bg-blue-100 text-base font-bold text-blue-700">{initials}</span><div><div className="flex flex-wrap items-center gap-3"><h1 className="text-[28px] font-bold tracking-[-0.025em] text-[#10233f]">{studentName}</h1><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-inset ${statusStyles[registration.status]}`}>{statusLabels[registration.status]}</span></div><p className="mt-1 text-sm text-slate-500">{registration.reference} · Submitted {formatDateTime(registration.submittedAt)}</p></div></div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <div className="space-y-5">
            <InfoCard title="Student information"><Info label="First name" value={registration.studentFirstName} /><Info label="Last name" value={registration.studentLastName} /><Info label="Date of birth" value={formatDate(registration.dateOfBirth)} /><Info label="Year level" value={`Year ${registration.yearLevel}`} /><Info label="Current school" value={registration.school} wide /><Info label="Learning needs or goals" value={registration.learningNeeds} wide /></InfoCard>
            <InfoCard title="Parent and contact details"><Info label="Parent name" value={parentName} /><Info label="Relationship" value={registration.relationship} /><Contact label="Email" icon={Mail} value={registration.email} /><Contact label="Phone" icon={Phone} value={registration.phone} /><Contact label="Address" icon={MapPin} value={registration.address} wide /><Info label="Emergency contact" value={registration.emergencyContactName && registration.emergencyContactPhone ? `${registration.emergencyContactName} · ${registration.emergencyContactPhone}` : registration.emergencyContactName || registration.emergencyContactPhone} wide /></InfoCard>
            {registration.reviews.length > 0 ? <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardHeader className="border-b border-slate-100 px-6 py-4"><CardTitle className="font-bold text-[#10233f]">Review history</CardTitle></CardHeader><CardContent className="divide-y divide-slate-100 px-6">{registration.reviews.map((review) => <div className="py-4" key={review.id}><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-[#10233f]">{reviewLabels[review.action]}</p><p className="text-xs text-slate-400">{formatDateTime(review.createdAt)}</p></div><p className="mt-1 text-xs text-slate-500">By {review.reviewerName}</p>{review.note ? <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{review.note}</p> : null}</div>)}</CardContent></Card> : null}
          </div>

          <div className="space-y-5">
            <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardHeader className="border-b border-slate-100 px-5 py-4"><CardTitle className="font-bold text-[#10233f]">Review registration</CardTitle></CardHeader><CardContent className="space-y-3 px-5 py-5">{canReview ? <><Button className="h-10 w-full bg-blue-600 text-white hover:bg-blue-700" disabled={isSaving} onClick={() => saveReview("APPROVE")}><Check /> {isSaving ? "Saving..." : "Approve registration"}</Button><Button className="h-10 w-full border-slate-200" disabled={isSaving} onClick={() => { setReviewAction("request"); setNote(""); }} variant="outline">Request changes</Button><Button className="h-10 w-full text-rose-600 hover:bg-rose-50 hover:text-rose-700" disabled={isSaving} onClick={() => { setReviewAction("reject"); setNote(""); }} variant="ghost">Reject registration</Button></> : <div className="rounded-lg bg-slate-50 p-4 text-center"><CheckCircle2 className={`mx-auto size-7 ${registration.status === "APPROVED" ? "text-emerald-600" : "text-rose-500"}`} /><p className="mt-2 text-sm font-bold text-[#10233f]">Review complete</p><p className="mt-1 text-xs text-slate-500">This decision is saved in the review history.</p></div>}</CardContent></Card>
            <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardContent className="px-5 py-5"><div className="flex gap-3"><Clock3 className="mt-0.5 size-4 shrink-0 text-slate-400" /><div><p className="text-xs font-bold text-[#10233f]">Submitted</p><p className="mt-1 text-xs leading-5 text-slate-500">{formatDateTime(registration.submittedAt)}</p></div></div></CardContent></Card>
          </div>
        </div>

        {reviewAction ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 px-4" onMouseDown={() => !isSaving && setReviewAction(null)} role="presentation"><div aria-modal="true" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(event) => event.stopPropagation()} role="dialog"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-[#10233f]">{reviewAction === "request" ? "Request changes" : "Reject registration"}</h2><p className="mt-1 text-sm text-slate-500">{reviewAction === "request" ? "Tell the parent what information needs updating." : "Add a clear reason for rejecting this request."}</p></div><button aria-label="Close" disabled={isSaving} onClick={() => setReviewAction(null)}><X className="size-5 text-slate-400" /></button></div><label className="mt-5 block text-xs font-bold text-[#10233f]" htmlFor="review-note">Message to parent</label><textarea autoFocus className="mt-2 min-h-28 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" id="review-note" onChange={(event) => setNote(event.target.value)} value={note} /><div className="mt-5 flex justify-end gap-2"><Button disabled={isSaving} onClick={() => setReviewAction(null)} variant="outline">Cancel</Button><Button className={reviewAction === "reject" ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-blue-600 text-white hover:bg-blue-700"} disabled={!note.trim() || isSaving} onClick={() => saveReview(reviewAction === "request" ? "REQUEST_CHANGES" : "REJECT", note)}>{isSaving ? "Saving..." : reviewAction === "request" ? "Send request" : "Reject registration"}</Button></div></div></div> : null}
      </div>
    </AppShell>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) { return <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardHeader className="border-b border-slate-100 px-6 py-4"><CardTitle className="font-bold text-[#10233f]">{title}</CardTitle></CardHeader><CardContent className="grid gap-x-8 gap-y-5 px-6 py-5 sm:grid-cols-2">{children}</CardContent></Card>; }
function Info({ label, value, wide = false }: { label: string; value: string | null; wide?: boolean }) { return <div className={wide ? "sm:col-span-2" : ""}><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1.5 text-sm font-medium leading-6 text-[#10233f]">{value || "Not provided"}</p></div>; }
function Contact({ label, icon: Icon, value, wide = false }: { label: string; icon: typeof Mail; value: string | null; wide?: boolean }) { return <div className={wide ? "sm:col-span-2" : ""}><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1.5 flex items-start gap-2 text-sm font-medium leading-6 text-[#10233f]"><Icon className="mt-1 size-4 shrink-0 text-slate-400" />{value || "Not provided"}</p></div>; }
function Notice({ tone, onClose, children }: { tone: "success" | "error"; onClose: () => void; children: React.ReactNode }) { return <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-700"}`}><CheckCircle2 className="mt-0.5 size-5 shrink-0" /><span className="flex-1">{children}</span><button aria-label="Dismiss" onClick={onClose}><X className="size-4" /></button></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(value)); }
function formatDateTime(value: string) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value)); }

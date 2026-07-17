"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, UserPlus } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const steps = ["Student", "Parent", "Review"];
const fieldClass = "mt-2 h-10 border-slate-200 bg-white text-sm";
const selectClass = "mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#10233f] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

type Registration = {
  studentFirstName: string;
  studentLastName: string;
  dateOfBirth: string;
  yearLevel: string;
  school: string;
  learningNeeds: string;
  parentFirstName: string;
  parentLastName: string;
  relationship: string;
  email: string;
  phone: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
};

const initialData: Registration = {
  studentFirstName: "", studentLastName: "", dateOfBirth: "", yearLevel: "", school: "", learningNeeds: "", parentFirstName: "", parentLastName: "", relationship: "", email: "", phone: "", address: "", emergencyName: "", emergencyPhone: "",
};

export default function NewRegistrationPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState(initialData);
  const [submitted, setSubmitted] = useState(false);
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function update(field: keyof Registration, value: string) {
    setData((current) => ({ ...current, [field]: value }));
  }

  async function next(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step < 2) {
      setStep((current) => current + 1);
      setSubmitError("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    try {
      const response = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration could not be submitted.");
      }

      setReference(result.registration.reference);
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Registration could not be submitted.");
    } finally {
      setIsSubmitting(false);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl py-8">
          <Card className="gap-0 border-0 bg-white py-0 text-center shadow-[0_2px_8px_rgba(15,35,65,0.09)]">
            <CardContent className="px-6 py-12 sm:px-12">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="size-8" /></span>
              <h1 className="mt-6 text-2xl font-bold text-[#10233f]">Registration submitted</h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">The registration for <strong className="text-[#10233f]">{data.studentFirstName} {data.studentLastName}</strong> has been added and is ready for review.</p>
              <div className="mx-auto mt-6 max-w-sm rounded-xl bg-slate-50 px-5 py-4 text-left"><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Reference</p><p className="mt-1 font-bold text-[#10233f]">{reference}</p><p className="mt-3 text-xs leading-5 text-slate-500">This registration has been saved and is ready for review.</p></div>
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row"><Button nativeButton={false} render={<Link href="/registrations" />} variant="outline">Back to registrations</Button><Button className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => { setData(initialData); setStep(0); setSubmitted(false); setReference(""); }}><UserPlus /> Add another</Button></div>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-5">
        <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700" href="/registrations"><ArrowLeft className="size-4" /> Back to registrations</Link>
        <div><h1 className="text-[30px] font-bold tracking-[-0.025em] text-[#10233f]">New registration</h1><p className="mt-1 text-sm text-slate-500">Enter the student and parent details below.</p></div>

        <div className="grid grid-cols-3 gap-2" aria-label="Form progress">
          {steps.map((label, index) => <div key={label}><div className={index <= step ? "h-1.5 rounded-full bg-blue-600" : "h-1.5 rounded-full bg-slate-200"} /><p className={index === step ? "mt-2 text-xs font-bold text-blue-700" : "mt-2 text-xs font-semibold text-slate-400"}>{index + 1}. {label}</p></div>)}
        </div>

        <form onSubmit={next}>
          <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]">
            <CardContent className="px-6 py-6 sm:px-8">
              {step === 0 ? <StudentStep data={data} update={update} /> : null}
              {step === 1 ? <ContactStep data={data} update={update} /> : null}
              {step === 2 ? <ReviewStep data={data} /> : null}
              {submitError ? <div className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">{submitError}</div> : null}
            </CardContent>
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 sm:px-8">
              <Button disabled={step === 0 || isSubmitting} onClick={() => setStep((current) => current - 1)} type="button" variant="outline">Back</Button>
              <Button className="bg-blue-600 px-4 text-white hover:bg-blue-700" disabled={isSubmitting} type="submit">{isSubmitting ? "Submitting..." : step === 2 ? <><Check /> Submit registration</> : <>Continue <ArrowRight /></>}</Button>
            </div>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}

function StudentStep({ data, update }: StepProps) {
  return <div><StepHeading title="Student details" description="Tell us about the student who will attend tuition." /><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="First name" required><Input className={fieldClass} onChange={(e) => update("studentFirstName", e.target.value)} placeholder="e.g. Emma" required value={data.studentFirstName} /></Field><Field label="Last name" required><Input className={fieldClass} onChange={(e) => update("studentLastName", e.target.value)} placeholder="e.g. Watson" required value={data.studentLastName} /></Field><Field label="Date of birth" required><Input className={fieldClass} onChange={(e) => update("dateOfBirth", e.target.value)} required type="date" value={data.dateOfBirth} /></Field><Field label="Year level" required><select className={selectClass} onChange={(e) => update("yearLevel", e.target.value)} required value={data.yearLevel}><option value="">Select year level</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((year) => <option key={year} value={String(year)}>Year {year}</option>)}</select></Field><Field label="Current school" wide><Input className={fieldClass} onChange={(e) => update("school", e.target.value)} placeholder="School name" value={data.school} /></Field><Field label="Learning needs or goals" wide><textarea className="mt-2 min-h-24 w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" onChange={(e) => update("learningNeeds", e.target.value)} placeholder="Optional notes about areas where support is needed" value={data.learningNeeds} /></Field></div></div>;
}

function ContactStep({ data, update }: StepProps) {
  return <div><StepHeading title="Parent and contact details" description="We will use these details for registration updates." /><div className="mt-6 grid gap-5 sm:grid-cols-2"><Field label="Parent first name" required><Input className={fieldClass} onChange={(e) => update("parentFirstName", e.target.value)} required value={data.parentFirstName} /></Field><Field label="Parent last name" required><Input className={fieldClass} onChange={(e) => update("parentLastName", e.target.value)} required value={data.parentLastName} /></Field><Field label="Relationship" required><select className={selectClass} onChange={(e) => update("relationship", e.target.value)} required value={data.relationship}><option value="">Select relationship</option><option>Mother</option><option>Father</option><option>Guardian</option><option>Other</option></select></Field><Field label="Email" required><Input className={fieldClass} onChange={(e) => update("email", e.target.value)} required type="email" value={data.email} /></Field><Field label="Phone" required><Input className={fieldClass} onChange={(e) => update("phone", e.target.value)} required type="tel" value={data.phone} /></Field><Field label="Home address"><Input className={fieldClass} onChange={(e) => update("address", e.target.value)} value={data.address} /></Field><Field label="Emergency contact name"><Input className={fieldClass} onChange={(e) => update("emergencyName", e.target.value)} value={data.emergencyName} /></Field><Field label="Emergency contact phone"><Input className={fieldClass} onChange={(e) => update("emergencyPhone", e.target.value)} type="tel" value={data.emergencyPhone} /></Field></div></div>;
}

function ReviewStep({ data }: { data: Registration }) {
  return <div><StepHeading title="Review registration" description="Check the details before submitting." /><div className="mt-6 space-y-6"><ReviewGroup title="Student"><Review label="First name" value={data.studentFirstName} /><Review label="Last name" value={data.studentLastName} /><Review label="Date of birth" value={data.dateOfBirth} /><Review label="Year level" value={data.yearLevel ? `Year ${data.yearLevel.replace(/\D/g, "")}` : ""} /><Review label="School" value={data.school} /><Review label="Learning needs" value={data.learningNeeds} /></ReviewGroup><ReviewGroup title="Parent and contact"><Review label="First name" value={data.parentFirstName} /><Review label="Last name" value={data.parentLastName} /><Review label="Relationship" value={data.relationship} /><Review label="Email" value={data.email} /><Review label="Phone" value={data.phone} /><Review label="Address" value={data.address} /></ReviewGroup><label className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-slate-600"><input className="mt-0.5 size-4 accent-blue-600" required type="checkbox" /><span>I confirm that the information provided is accurate and consent to TutorDesk storing it for registration and tuition administration.</span></label></div></div>;
}

type StepProps = { data: Registration; update: (field: keyof Registration, value: string) => void };
function StepHeading({ title, description }: { title: string; description: string }) { return <div><h2 className="text-xl font-bold text-[#10233f]">{title}</h2><p className="mt-1 text-sm text-slate-500">{description}</p></div>; }
function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) { return <label className={wide ? "sm:col-span-2" : ""}><span className="text-xs font-bold text-[#10233f]">{label}{required ? <span className="ml-1 text-rose-500">*</span> : null}</span>{children}</label>; }
function ReviewGroup({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-xl border border-slate-100 p-5"><h3 className="mb-4 text-sm font-bold text-[#10233f]">{title}</h3><div className="grid gap-4 sm:grid-cols-2">{children}</div></section>; }
function Review({ label, value, wide }: { label: string; value: string; wide?: boolean }) { return <div className={wide ? "sm:col-span-2" : ""}><p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-[#10233f]">{value || "Not provided"}</p></div>; }

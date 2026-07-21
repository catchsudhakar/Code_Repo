"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarCheck2, CalendarDays, Check, Clock3, LockKeyhole, Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Status = "PRESENT" | "ABSENT";
type Student = { id: string; firstName: string; lastName: string; yearLevel: number };
type BatchListItem = { id: string; name: string; startTime: string; isRecurring: boolean; recurringDays: string[]; students: { student: Student }[] };
type AttendanceData = { batch: { id: string; name: string; startTime: string; students: { student: Student }[] }; today: string; sessionDates: string[]; records: { studentId: string; sessionDate: string; status: Status }[] };

export default function AttendancePage() {
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/batches", { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Batches could not be loaded.");
        setBatches(result.batches);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
      } finally { if (!controller.signal.aborted) setIsLoading(false); }
    }
    load();
    return () => controller.abort();
  }, []);

  return <AppShell><div className="mx-auto max-w-[1240px] space-y-6">{selectedBatchId ? <AttendanceRegister batchId={selectedBatchId} onBack={() => setSelectedBatchId(null)} /> : <><div><h1 className="text-[30px] font-bold tracking-[-0.025em] text-[#10233f]">Attendance</h1><p className="mt-1 text-sm text-slate-500">Select a batch to mark or review attendance.</p></div>{error ? <Card className="border-rose-200 bg-rose-50 py-10 text-center text-rose-700">{error}</Card> : null}{isLoading ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map((item) => <div className="h-44 animate-pulse rounded-xl bg-white" key={item} />)}</div> : null}{!isLoading && !error && batches.length === 0 ? <Card className="border-0 bg-white py-14 text-center shadow-sm"><CalendarDays className="mx-auto size-9 text-blue-500" /><h2 className="mt-4 text-lg font-bold text-[#10233f]">No batches available</h2><p className="mt-2 text-sm text-slate-500">Create a batch before marking attendance.</p></Card> : null}{!isLoading && !error ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{batches.map((batch) => <BatchCard batch={batch} key={batch.id} onOpen={() => setSelectedBatchId(batch.id)} />)}</div> : null}</>}</div></AppShell>;
}

function BatchCard({ batch, onOpen }: { batch: BatchListItem; onOpen: () => void }) {
  const days = batch.isRecurring ? batch.recurringDays.map(titleCase).join(", ") : "Once-off";
  return <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardContent className="px-5 py-5"><div className="flex items-start justify-between"><div><h2 className="text-lg font-bold text-[#10233f]">{batch.name}</h2><p className="mt-2 text-sm font-semibold text-blue-700">{days}</p></div><span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><CalendarCheck2 className="size-5" /></span></div><div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500"><span className="flex items-center gap-2"><Clock3 className="size-4" />{formatTime(batch.startTime)}</span><span className="flex items-center gap-2"><Users className="size-4" />{batch.students.length} students</span></div><Button className="mt-5 h-9 w-full bg-blue-600 text-white hover:bg-blue-700" onClick={onOpen}>Open attendance</Button></CardContent></Card>;
}

function AttendanceRegister({ batchId, onBack }: { batchId: string; onBack: () => void }) {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [attendance, setAttendance] = useState<Record<string, Record<string, Status>>>({});
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/attendance/${batchId}`, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Attendance could not be loaded.");
        const loaded = result as AttendanceData;
        const byDate: Record<string, Record<string, Status>> = {};
        for (const record of loaded.records) {
          const date = record.sessionDate.slice(0, 10);
          byDate[date] ??= {};
          byDate[date][record.studentId] = record.status;
        }
        setData(loaded);
        setAttendance(byDate);
        setSelectedDate(loaded.sessionDates.includes(loaded.today) ? loaded.today : [...loaded.sessionDates].reverse().find((date) => date <= loaded.today) ?? loaded.sessionDates[0] ?? "");
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name !== "AbortError") setError(loadError.message);
      } finally { if (!controller.signal.aborted) setIsLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [batchId]);

  const students = useMemo(() => data?.batch.students.map(({ student }) => student) ?? [], [data]);
  const weeks = useMemo(() => groupByWeek(data?.sessionDates ?? []), [data]);
  const current = attendance[selectedDate] ?? {};
  const isFuture = Boolean(data && selectedDate > data.today);
  const markedCount = Object.keys(current).length;

  function chooseDate(date: string) { setSelectedDate(date); setSelectedStudents(new Set()); setMessage(""); setError(""); }
  function setStatus(studentId: string, status: Status) {
    if (isFuture) return;
    setAttendance((all) => { const next = { ...(all[selectedDate] ?? {}) }; if (next[studentId] === status) delete next[studentId]; else next[studentId] = status; return { ...all, [selectedDate]: next }; });
    setMessage("");
  }
  function applyBulk(status: Status, ids = selectedStudents) {
    if (isFuture) return;
    setAttendance((all) => { const next = { ...(all[selectedDate] ?? {}) }; ids.forEach((id) => { next[id] = status; }); return { ...all, [selectedDate]: next }; });
    setSelectedStudents(new Set()); setMessage("");
  }
  function selectAll() { setSelectedStudents((currentSelection) => currentSelection.size === students.length ? new Set() : new Set(students.map((student) => student.id))); }
  async function save() {
    setIsSaving(true); setError("");
    try {
      const entries = Object.entries(current).map(([studentId, status]) => ({ studentId, status }));
      const response = await fetch(`/api/attendance/${batchId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionDate: selectedDate, entries }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Attendance could not be saved.");
      setMessage(`Attendance saved for ${entries.length} student${entries.length === 1 ? "" : "s"}.`);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Attendance could not be saved."); }
    finally { setIsSaving(false); }
  }

  if (isLoading) return <div className="space-y-5"><div className="h-6 w-40 animate-pulse rounded bg-slate-200" /><div className="h-24 animate-pulse rounded-xl bg-white" /><div className="h-96 animate-pulse rounded-xl bg-white" /></div>;
  if (!data) return <div><Button onClick={onBack} variant="ghost"><ArrowLeft /> Back to batches</Button><Card className="mt-5 border-rose-200 bg-rose-50 py-10 text-center text-rose-700">{error}</Card></div>;

  return <>
    <button className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-700" onClick={onBack}><ArrowLeft className="size-4" /> Back to batches</button>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-[30px] font-bold tracking-[-0.025em] text-[#10233f]">{data.batch.name}</h1><p className="mt-1 text-sm text-slate-500">Select a session date column, then mark students present or absent.</p></div><div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-sm"><Users className="size-4 text-blue-600" /><span className="text-sm font-bold text-[#10233f]">{students.length} students</span></div></div>

    {selectedDate ? <Card className="gap-0 border-0 bg-white py-0 shadow-sm"><CardContent className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-bold text-[#10233f]">Selected: {formatLongDate(selectedDate)}</p><p className="mt-1 text-xs text-slate-500">{isFuture ? "Future session · Attendance is read-only" : `${markedCount} of ${students.length} marked`}</p></div>{!isFuture && students.length > 0 ? <div className="flex flex-wrap gap-2"><Button onClick={selectAll} size="sm" variant="outline">{selectedStudents.size === students.length ? "Clear selection" : "Select all"}</Button><Button disabled={selectedStudents.size === 0} onClick={() => applyBulk("PRESENT")} size="sm" variant="outline">Selected present</Button><Button disabled={selectedStudents.size === 0} onClick={() => applyBulk("ABSENT")} size="sm" variant="outline">Selected absent</Button><Button className="bg-emerald-600 text-white hover:bg-emerald-700" onClick={() => applyBulk("PRESENT", new Set(students.map((student) => student.id)))} size="sm"><Check /> Mark all present</Button></div> : <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500"><LockKeyhole className="size-4" />Locked until session date</span>}</CardContent></Card> : null}

    {data.sessionDates.length === 0 ? <Card className="border-0 bg-white py-12 text-center"><CalendarDays className="mx-auto size-8 text-slate-400" /><p className="mt-3 font-bold text-[#10233f]">No scheduled sessions in this period</p></Card> : <Card className="gap-0 overflow-hidden border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><div className="overflow-x-auto"><table className="w-full min-w-max border-collapse text-left"><thead><tr className="border-b border-slate-100 bg-slate-50"><th className="sticky left-0 z-20 min-w-56 border-r border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-slate-400" rowSpan={2}>Student</th>{weeks.map((week) => <th className="border-r border-slate-200 px-3 py-2 text-center text-[11px] font-bold uppercase tracking-wide text-slate-500" colSpan={week.dates.length} key={week.key}>{week.label}</th>)}</tr><tr className="border-b border-slate-200 bg-white">{weeks.flatMap((week) => week.dates.map((date) => { const future = date > data.today; const active = date === selectedDate; return <th className={`min-w-28 border-r border-slate-100 p-2 text-center ${active ? "bg-blue-50" : future ? "bg-slate-50/70" : ""}`} key={date}><button className={`w-full rounded-lg px-2 py-2 text-xs font-bold ${active ? "bg-blue-600 text-white" : future ? "text-slate-400 hover:bg-slate-100" : "text-[#10233f] hover:bg-blue-50"}`} onClick={() => chooseDate(date)}><span className="block text-[10px] font-semibold uppercase opacity-70">{date === data.today ? "Today" : future ? "Upcoming" : weekday(date)}</span>{shortDate(date)}</button></th>; }))}</tr></thead><tbody>{students.map((student) => <tr className="border-b border-slate-100 last:border-0" key={student.id}><td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-5 py-3"><div className="flex items-center gap-3">{!isFuture && selectedDate ? <input aria-label={`Select ${student.firstName} ${student.lastName}`} checked={selectedStudents.has(student.id)} className="size-4 accent-blue-600" onChange={() => setSelectedStudents((currentSelection) => { const next = new Set(currentSelection); if (next.has(student.id)) next.delete(student.id); else next.add(student.id); return next; })} type="checkbox" /> : null}<span className="grid size-9 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">{student.firstName[0]}{student.lastName[0]}</span><span><span className="block text-sm font-bold text-[#10233f]">{student.firstName} {student.lastName}</span><span className="text-xs text-slate-400">Year {student.yearLevel}</span></span></div></td>{weeks.flatMap((week) => week.dates.map((date) => { const status = attendance[date]?.[student.id]; const active = date === selectedDate; const future = date > data.today; return <td className={`border-r border-slate-100 px-2 py-3 text-center ${active ? "bg-blue-50/60" : future ? "bg-slate-50/50" : ""}`} key={date}>{active && !future ? <div className="flex justify-center gap-1"><MiniStatus active={status === "PRESENT"} label="P" onClick={() => setStatus(student.id, "PRESENT")} tone="present" /><MiniStatus active={status === "ABSENT"} label="A" onClick={() => setStatus(student.id, "ABSENT")} tone="absent" /></div> : <StatusMark status={status} future={future} />}</td>; }))}</tr>)}{students.length === 0 ? <tr><td className="px-5 py-12 text-center text-sm text-slate-500" colSpan={data.sessionDates.length + 1}>No students are assigned to this batch.</td></tr> : null}</tbody></table></div>{selectedDate && !isFuture && students.length > 0 ? <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div>{message ? <p className="text-sm font-semibold text-emerald-700">{message}</p> : error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : <p className="text-xs text-slate-500">P = Present · A = Absent · Blank = Unmarked</p>}</div><Button className="bg-blue-600 px-5 text-white hover:bg-blue-700" disabled={isSaving} onClick={save}>{isSaving ? "Saving..." : "Save attendance"}</Button></div> : null}</Card>}
  </>;
}

function MiniStatus({ active, label, tone, onClick }: { active: boolean; label: string; tone: "present" | "absent"; onClick: () => void }) { const activeClass = tone === "present" ? "border-emerald-600 bg-emerald-600 text-white shadow-sm" : "border-red-600 bg-red-600 text-white shadow-sm"; return <button aria-label={tone === "present" ? "Mark present" : "Mark absent"} className={`grid size-8 place-items-center rounded-lg border text-xs font-extrabold transition-colors ${active ? activeClass : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50"}`} onClick={onClick}>{label}</button>; }
function StatusMark({ status, future }: { status?: Status; future: boolean }) { if (future) return <LockKeyhole className="mx-auto size-3.5 text-slate-300" />; if (status === "PRESENT") return <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">Present</span>; if (status === "ABSENT") return <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700">Absent</span>; return <span className="text-slate-300">—</span>; }
function groupByWeek(dates: string[]) { const groups = new Map<string, string[]>(); for (const date of dates) { const parsed = new Date(`${date}T00:00:00.000Z`); const offset = (parsed.getUTCDay() + 6) % 7; parsed.setUTCDate(parsed.getUTCDate() - offset); const key = parsed.toISOString().slice(0, 10); groups.set(key, [...(groups.get(key) ?? []), date]); } return [...groups].map(([key, weekDates]) => ({ key, dates: weekDates, label: `Week of ${shortDate(key)}` })); }
function titleCase(value: string) { return value[0] + value.slice(1).toLowerCase(); }
function weekday(value: string) { return new Intl.DateTimeFormat("en-AU", { weekday: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`)); }
function shortDate(value: string) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`)); }
function formatLongDate(value: string) { return new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`)); }
function formatTime(value: string) { const [hours, minutes] = value.split(":").map(Number); return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes)); }

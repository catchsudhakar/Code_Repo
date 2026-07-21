import Link from "next/link";
import { CalendarDays, ClipboardCheck, ReceiptText, UserPlus, Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isScheduledSession, todayInTimeZone } from "@/lib/batch-schedule";
import { FeeStatus, RegistrationStatus, StudentStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const actions = [
  { label: "New registration", icon: UserPlus, href: "/registrations/new" },
  { label: "Create batch", icon: Users, href: "/batches" },
  { label: "Attendance", icon: ClipboardCheck, href: "/attendance" },
  { label: "Manage fees", icon: ReceiptText, href: "/batches" },
];

export default async function Home() {
  const user = await requireUser();
  if (!user) return null;

  const business = await prisma.business.findUnique({ where: { id: user.businessId }, select: { currency: true, timeZone: true } });
  const timeZone = business?.timeZone ?? "Australia/Sydney";
  const currency = business?.currency ?? "AUD";
  const today = todayInTimeZone(timeZone);
  const todayDate = new Date(`${today}T00:00:00.000Z`);

  const [activeStudents, pendingRegistrations, outstanding, batches, registrations, payments, attendance] = await Promise.all([
    prisma.student.count({ where: { businessId: user.businessId, status: StudentStatus.ACTIVE } }),
    prisma.registration.count({ where: { businessId: user.businessId, status: RegistrationStatus.PENDING } }),
    prisma.studentFee.aggregate({ where: { businessId: user.businessId, status: FeeStatus.UNPAID }, _sum: { amount: true } }),
    prisma.batch.findMany({
      where: { businessId: user.businessId, startDate: { lte: todayDate }, OR: [{ endDate: null }, { endDate: { gte: todayDate } }] },
      orderBy: { startTime: "asc" },
      include: { students: { where: { removedAt: null }, select: { studentId: true } } },
    }),
    prisma.registration.findMany({ where: { businessId: user.businessId }, orderBy: { submittedAt: "desc" }, take: 5, select: { id: true, studentFirstName: true, studentLastName: true, yearLevel: true, status: true, submittedAt: true } }),
    prisma.studentFee.findMany({ where: { businessId: user.businessId, status: FeeStatus.PAID, paidAt: { not: null } }, orderBy: { paidAt: "desc" }, take: 5, select: { id: true, amount: true, paidAt: true, student: { select: { firstName: true, lastName: true } }, feePeriod: { select: { batch: { select: { id: true, name: true } } } } } }),
    prisma.attendanceRecord.findMany({ where: { businessId: user.businessId }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, status: true, sessionDate: true, updatedAt: true, student: { select: { firstName: true, lastName: true } }, batch: { select: { name: true } } } }),
  ]);

  const schedule = batches.filter((batch) => isScheduledSession(batch, today));
  const stats = [
    { label: "Active students", value: String(activeStudents), icon: Users, tone: "bg-blue-100 text-blue-600" },
    { label: "Today’s classes", value: String(schedule.length), icon: CalendarDays, tone: "bg-emerald-100 text-emerald-600" },
    { label: "Pending reg.", value: String(pendingRegistrations), icon: ClipboardCheck, tone: "bg-orange-100 text-orange-500" },
    { label: "Outstanding fees", value: money(Number(outstanding._sum.amount ?? 0), currency), icon: ReceiptText, tone: "bg-rose-100 text-rose-500" },
  ];
  const activities = [
    ...registrations.map((registration) => ({ id: `registration-${registration.id}`, timestamp: registration.submittedAt, initials: initials(registration.studentFirstName, registration.studentLastName), text: `${registration.studentFirstName} ${registration.studentLastName} submitted a Year ${registration.yearLevel} registration.`, meta: registration.status === RegistrationStatus.PENDING ? "Awaiting review" : titleCase(registration.status), href: `/registrations/${registration.id}`, action: "View", tone: "bg-orange-100 text-orange-600" })),
    ...payments.map((payment) => ({ id: `payment-${payment.id}`, timestamp: payment.paidAt!, initials: initials(payment.student.firstName, payment.student.lastName), text: `${payment.student.firstName} ${payment.student.lastName}'s ${money(Number(payment.amount), currency)} fee was marked paid.`, meta: payment.feePeriod.batch.name, href: `/batches/${payment.feePeriod.batch.id}/fees`, action: "View", tone: "bg-emerald-100 text-emerald-600" })),
    ...attendance.map((record) => ({ id: `attendance-${record.id}`, timestamp: record.updatedAt, initials: initials(record.student.firstName, record.student.lastName), text: `${record.student.firstName} ${record.student.lastName} was marked ${record.status.toLowerCase()}.`, meta: `${record.batch.name} · ${formatShortDate(record.sessionDate)}`, href: "/attendance", action: "View", tone: "bg-blue-100 text-blue-600" })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 6);

  const firstName = user.name?.trim().split(/\s+/)[0] || "there";
  return <AppShell userName={user.name ?? undefined}><div className="mx-auto max-w-[1240px] space-y-7">
    <div><h1 className="text-[30px] font-bold tracking-[-0.025em] text-[#10233f] sm:text-[34px]">Good {greeting(timeZone)}, {firstName}</h1><p className="mt-1 text-[15px] text-slate-500">Here is what&apos;s happening today, {formatLongDate(todayDate)}.</p></div>

    <section aria-label="Overview" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => { const Icon = stat.icon; return <Card className="min-h-36 gap-0 border-0 bg-white py-5 shadow-[0_2px_5px_rgba(15,35,65,0.08)]" key={stat.label}><CardContent className="px-5"><div className="flex items-center gap-3"><span className={`grid size-10 place-items-center rounded-lg ${stat.tone}`}><Icon className="size-5" /></span><p className="text-[11px] font-bold uppercase leading-3 tracking-wide text-slate-500">{stat.label}</p></div><p className="mt-4 text-[42px] font-bold leading-none tracking-[-0.04em] text-[#10233f]">{stat.value}</p></CardContent></Card>; })}</section>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(260px,1fr)]">
      <Card className="gap-0 overflow-hidden border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardHeader className="flex-row items-center justify-between border-b border-slate-100 px-6 py-5"><CardTitle className="text-lg font-bold text-[#10233f]">Today&apos;s Schedule</CardTitle><Link className="text-xs font-bold text-blue-600 hover:text-blue-700" href="/attendance">Open attendance</Link></CardHeader><CardContent className="divide-y divide-slate-100 px-0">{schedule.length === 0 ? <EmptyState text="No classes scheduled for today." /> : schedule.map((batch) => <div className="grid min-h-[92px] items-center gap-4 px-6 py-4 sm:grid-cols-[82px_minmax(0,1fr)_auto]" key={batch.id}><p className="text-xl font-bold text-[#10233f]">{formatTime(batch.startTime)}</p><div><p className="text-base font-bold text-[#10233f]">{batch.name}</p><p className="mt-1 text-xs text-slate-500">{batch.students.length} student{batch.students.length === 1 ? "" : "s"}</p></div><Link className="w-fit rounded-lg border border-slate-300 px-4 py-2 text-[11px] font-bold text-[#10233f] shadow-sm hover:bg-slate-50" href="/attendance">Mark attendance</Link></div>)}</CardContent></Card>

      <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardHeader className="px-5 py-5"><CardTitle className="text-lg font-bold text-[#10233f]">Quick Actions</CardTitle></CardHeader><CardContent className="grid grid-cols-2 gap-3 px-5 pb-5">{actions.map((action) => { const Icon = action.icon; return <Link className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl bg-[#eef4ff] text-[#10233f] transition-colors hover:bg-blue-100" href={action.href} key={action.label}><Icon className="size-7 text-blue-600" /><span className="text-[11px] font-bold">{action.label}</span></Link>; })}</CardContent></Card>
    </div>

    <Card className="gap-0 overflow-hidden border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]"><CardHeader className="px-6 py-5"><CardTitle className="text-lg font-bold text-[#10233f]">Recent Activity</CardTitle></CardHeader><CardContent className="divide-y divide-slate-100 px-6">{activities.length === 0 ? <EmptyState text="Activity will appear here as you use TutorDesk." /> : activities.map((activity) => <div className="flex items-center gap-4 py-4" key={activity.id}><span className={`grid size-9 shrink-0 place-items-center rounded-full text-[10px] font-bold ${activity.tone}`}>{activity.initials}</span><div className="min-w-0 flex-1"><p className="text-xs font-medium text-slate-600">{activity.text}</p><p className="mt-1 text-[11px] text-slate-400">{activity.meta} · {relativeTime(activity.timestamp)}</p></div><Link className="text-[11px] font-bold text-blue-600" href={activity.href}>{activity.action}</Link></div>)}</CardContent></Card>
  </div></AppShell>;
}

function EmptyState({ text }: { text: string }) { return <div className="px-6 py-12 text-center text-sm text-slate-500">{text}</div>; }
function initials(firstName: string, lastName: string) { return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase(); }
function titleCase(value: string) { return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); }
function formatLongDate(date: Date) { return new Intl.DateTimeFormat("en-AU", { weekday: "long", day: "numeric", month: "long" , timeZone: "UTC" }).format(date); }
function formatShortDate(date: Date) { return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", timeZone: "UTC" }).format(date); }
function formatTime(value: string) { const [hours, minutes] = value.split(":").map(Number); return new Intl.DateTimeFormat("en-AU", { hour: "numeric", minute: "2-digit" }).format(new Date(2000, 0, 1, hours, minutes)); }
function money(value: number, currency: string) { return new Intl.NumberFormat("en-AU", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }
function greeting(timeZone: string) { const hour = Number(new Intl.DateTimeFormat("en-AU", { hour: "2-digit", hourCycle: "h23", timeZone }).format(new Date())); return hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening"; }
function relativeTime(date: Date) { const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000)); if (seconds < 60) return "just now"; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes} min ago`; const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours} hr ago`; const days = Math.floor(hours / 24); return days === 1 ? "yesterday" : `${days} days ago`; }

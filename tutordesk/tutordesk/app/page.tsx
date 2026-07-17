import {
  CalendarDays,
  ClipboardCheck,
  FileText,
  ReceiptText,
  UserPlus,
  Users,
} from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  { label: "Active students", value: "42", icon: Users, tone: "bg-blue-100 text-blue-600" },
  { label: "Today’s classes", value: "5", icon: CalendarDays, tone: "bg-emerald-100 text-emerald-600" },
  { label: "Pending reg.", value: "3", icon: ClipboardCheck, tone: "bg-orange-100 text-orange-500" },
  { label: "Outstanding fees", value: "$1,200", icon: ReceiptText, tone: "bg-rose-100 text-rose-500" },
];

const schedule = [
  { time: "14:00", duration: "60 Min", title: "Year 10 Advanced Math", detail: "Batch A   •   12 Students", action: "Starting Soon", status: true },
  { time: "15:30", duration: "90 Min", title: "HSC Physics Prep", detail: "Intensive   •   8 Students", action: "Mark Attendance" },
  { time: "17:15", duration: "45 Min", title: "1-on-1 Chemistry", detail: "Liam Smith", action: "View Notes" },
];

const actions = [
  { label: "Add Student", icon: UserPlus },
  { label: "Create Batch", icon: Users },
  { label: "Attendance", icon: ClipboardCheck },
  { label: "Raise Fee", icon: FileText },
];

const activities = [
  { initials: "EW", text: <><strong>Emma Watson</strong> submitted a new registration form for Year 9 English.</>, time: "10 minutes ago", action: "Review", tone: "bg-orange-100 text-orange-500" },
  { initials: "MD", text: <>Message from <strong>Mrs. Davis</strong> regarding Liam&apos;s homework progress.</>, time: "2 hours ago", action: "Reply", tone: "bg-blue-100 text-blue-600" },
];

export default function Home() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1240px] space-y-7">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.025em] text-[#10233f] sm:text-[34px]">Good Morning, Sarah</h1>
          <p className="mt-1 text-[15px] text-slate-500">Here is what&apos;s happening today, October 24th.</p>
        </div>

        <section aria-label="Overview" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card className="min-h-36 gap-0 border-0 bg-white py-5 shadow-[0_2px_5px_rgba(15,35,65,0.08)]" key={stat.label}>
                <CardContent className="px-5">
                  <div className="flex items-center gap-3">
                    <span className={`grid size-10 place-items-center rounded-lg ${stat.tone}`}><Icon className="size-5" /></span>
                    <p className="text-[11px] font-bold uppercase leading-3 tracking-wide text-slate-500">{stat.label}</p>
                  </div>
                  <p className="mt-4 text-[42px] font-bold leading-none tracking-[-0.04em] text-[#10233f]">{stat.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(260px,1fr)]">
          <Card className="gap-0 overflow-hidden border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]">
            <CardHeader className="flex-row items-center justify-between border-b border-slate-100 px-6 py-5">
              <CardTitle className="text-lg font-bold text-[#10233f]">Today&apos;s Schedule</CardTitle>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700">View Calendar</button>
            </CardHeader>
            <CardContent className="divide-y divide-slate-100 px-0">
              {schedule.map((item) => (
                <div className="grid min-h-[100px] items-center gap-4 px-6 py-4 sm:grid-cols-[82px_minmax(0,1fr)_auto]" key={item.time}>
                  <div><p className="text-xl font-bold text-[#10233f]">{item.time}</p><p className="mt-1 text-[11px] font-semibold text-slate-500">{item.duration}</p></div>
                  <div><p className="text-lg font-bold text-[#10233f]">{item.title}</p><p className="mt-1 text-xs text-slate-500">♟ {item.detail}</p></div>
                  <button className={item.status ? "w-fit rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-600" : "w-fit rounded-lg border border-slate-300 px-4 py-2 text-[11px] font-bold text-[#10233f] shadow-sm"}>{item.action}</button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="gap-0 border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]">
            <CardHeader className="px-5 py-5"><CardTitle className="text-lg font-bold text-[#10233f]">Quick Actions</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 px-5 pb-5">
              {actions.map((action) => { const Icon = action.icon; return (
                <button className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-xl bg-[#eef4ff] text-[#10233f] transition-colors hover:bg-blue-100" key={action.label}>
                  <Icon className="size-7 text-blue-600" /><span className="text-[11px] font-bold">{action.label}</span>
                </button>
              ); })}
            </CardContent>
          </Card>
        </div>

        <Card className="gap-0 overflow-hidden border-0 bg-white py-0 shadow-[0_2px_5px_rgba(15,35,65,0.08)]">
          <CardHeader className="px-6 py-5"><CardTitle className="text-lg font-bold text-[#10233f]">Recent Activity</CardTitle></CardHeader>
          <CardContent className="divide-y divide-slate-100 px-6">
            {activities.map((activity) => (
              <div className="flex items-center gap-4 py-4" key={activity.initials}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-full text-[10px] font-bold ${activity.tone}`}>{activity.initials}</span>
                <div className="min-w-0 flex-1"><p className="text-xs text-slate-600">{activity.text}</p><p className="mt-1 text-[11px] text-slate-400">{activity.time}</p></div>
                <button className="text-[11px] font-bold text-blue-600">{activity.action}</button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

import { z } from "zod";

import { AttendanceStatus, StudentStatus } from "@/lib/generated/prisma/enums";
import { getAttendanceWindowSessions, isScheduledSession, parseDate, todayInTimeZone } from "@/lib/batch-schedule";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const attendanceSchema = z.object({
  sessionDate: z.iso.date(),
  entries: z.array(z.object({ studentId: z.string().min(1), status: z.enum(AttendanceStatus) })),
});

export async function GET(_request: Request, context: RouteContext<"/api/attendance/[batchId]">) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { batchId } = await context.params;
    const batch = await prisma.batch.findFirst({
      where: { id: batchId, businessId: user.businessId },
      include: {
        business: { select: { timeZone: true } },
        students: { where: { removedAt: null, student: { status: StudentStatus.ACTIVE } }, orderBy: { student: { firstName: "asc" } }, select: { student: { select: { id: true, firstName: true, lastName: true, yearLevel: true } } } },
      },
    });
    if (!batch) return Response.json({ error: "Batch not found." }, { status: 404 });

    const today = todayInTimeZone(batch.business.timeZone);
    const sessionDates = getAttendanceWindowSessions(batch, today);
    const records = await prisma.attendanceRecord.findMany({
      where: { businessId: user.businessId, batchId, sessionDate: { in: sessionDates.map(parseDate) } },
      select: { studentId: true, sessionDate: true, status: true },
    });
    return Response.json({ batch: { id: batch.id, name: batch.name, startTime: batch.startTime, students: batch.students }, today, sessionDates, records });
  } catch (error) {
    console.error("Failed to load attendance", error);
    return Response.json({ error: "Attendance could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext<"/api/attendance/[batchId]">) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { batchId } = await context.params;
    const parsed = attendanceSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Check the attendance entries." }, { status: 400 });
    const batch = await prisma.batch.findFirst({ where: { id: batchId, businessId: user.businessId }, include: { business: { select: { timeZone: true } }, students: { where: { removedAt: null }, select: { studentId: true } } } });
    if (!batch) return Response.json({ error: "Batch not found." }, { status: 404 });
    const today = todayInTimeZone(batch.business.timeZone);
    if (parsed.data.sessionDate > today) return Response.json({ error: "Future attendance cannot be edited." }, { status: 400 });
    if (!isScheduledSession(batch, parsed.data.sessionDate)) return Response.json({ error: "This date is not a scheduled batch session." }, { status: 400 });

    const assignedIds = new Set(batch.students.map((item) => item.studentId));
    const uniqueEntries = new Map(parsed.data.entries.map((entry) => [entry.studentId, entry.status]));
    if ([...uniqueEntries.keys()].some((id) => !assignedIds.has(id))) return Response.json({ error: "One or more students are not assigned to this batch." }, { status: 400 });
    const sessionDate = parseDate(parsed.data.sessionDate);
    await prisma.$transaction(async (transaction) => {
      await transaction.attendanceRecord.deleteMany({ where: { batchId, sessionDate } });
      if (uniqueEntries.size > 0) await transaction.attendanceRecord.createMany({ data: [...uniqueEntries].map(([studentId, status]) => ({ businessId: user.businessId, batchId, studentId, sessionDate, status, markedById: user.id })) });
    });
    return Response.json({ success: true, saved: uniqueEntries.size });
  } catch (error) {
    console.error("Failed to save attendance", error);
    return Response.json({ error: "Attendance could not be saved." }, { status: 500 });
  }
}

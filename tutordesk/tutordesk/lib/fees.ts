import { BillingMethod, FeeStatus } from "@/lib/generated/prisma/enums";
import { getScheduledDates, parseDate, todayInTimeZone, toDateString } from "@/lib/batch-schedule";
import { prisma } from "@/lib/prisma";

function laterDate(...values: string[]) { return values.sort().at(-1)!; }
function earlierDate(...values: string[]) { return values.sort()[0]; }
function monthStart(value: string) { return `${value.slice(0, 7)}-01`; }
function monthEnd(value: string) { const date = parseDate(monthStart(value)); date.setUTCMonth(date.getUTCMonth() + 1); date.setUTCDate(0); return toDateString(date); }
function addMonths(value: string, count: number) { const date = parseDate(monthStart(value)); date.setUTCMonth(date.getUTCMonth() + count); return toDateString(date); }
function monthLabel(value: string) { return new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }).format(parseDate(value)); }

export async function syncBatchFees(batchId: string, businessId: string) {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, businessId },
    include: { business: { select: { timeZone: true } }, students: { include: { student: { select: { id: true } } } } },
  });
  if (!batch?.feePerSession || !batch.billingMethod) return;
  if (batch.isRecurring && !batch.endDate) return;

  const batchStart = toDateString(batch.startDate);
  const batchEnd = batch.endDate ? toDateString(batch.endDate) : batchStart;
  const today = todayInTimeZone(batch.business.timeZone);
  const periods: { label: string; start: string; end: string }[] = [];

  if (batch.billingMethod === BillingMethod.FULL_TERM || !batch.isRecurring) {
    periods.push({ label: batch.isRecurring ? "Full term" : "Once-off", start: batchStart, end: batchEnd });
  } else {
    const finalMonth = earlierDate(batchEnd, monthEnd(addMonths(today, 1)));
    for (let cursor = monthStart(batchStart); cursor <= finalMonth; cursor = addMonths(cursor, 1)) {
      const start = laterDate(cursor, batchStart);
      const end = earlierDate(monthEnd(cursor), batchEnd);
      if (start <= end) periods.push({ label: monthLabel(cursor), start, end });
    }
  }

  for (const definition of periods) {
    const period = await prisma.feePeriod.upsert({
      where: { batchId_periodStart_periodEnd: { batchId, periodStart: parseDate(definition.start), periodEnd: parseDate(definition.end) } },
      update: { label: definition.label },
      create: { businessId, batchId, label: definition.label, periodStart: parseDate(definition.start), periodEnd: parseDate(definition.end) },
    });
    const eligibleStudentIds: string[] = [];

    for (const membership of batch.students) {
      const joined = toDateString(membership.addedAt);
      const removed = membership.removedAt ? toDateString(membership.removedAt) : definition.end;
      const from = laterDate(definition.start, batchStart, joined);
      const to = earlierDate(definition.end, batchEnd, removed);
      if (from > to) continue;
      const sessions = getScheduledDates(batch, from, to);
      if (sessions.length === 0) continue;
      eligibleStudentIds.push(membership.student.id);
      const rate = Number(batch.feePerSession);
      const amount = rate * sessions.length;
      const existing = await prisma.studentFee.findUnique({ where: { feePeriodId_studentId: { feePeriodId: period.id, studentId: membership.student.id } } });
      if (!existing) {
        await prisma.studentFee.create({ data: { businessId, feePeriodId: period.id, studentId: membership.student.id, sessionCount: sessions.length, rate, amount, dueDate: parseDate(sessions[0]) } });
      } else if (existing.status === FeeStatus.UNPAID) {
        await prisma.studentFee.update({ where: { id: existing.id }, data: { sessionCount: sessions.length, rate, amount, dueDate: parseDate(sessions[0]) } });
      }
    }

    await prisma.studentFee.deleteMany({ where: { feePeriodId: period.id, status: FeeStatus.UNPAID, ...(eligibleStudentIds.length ? { studentId: { notIn: eligibleStudentIds } } : {}) } });
  }
}

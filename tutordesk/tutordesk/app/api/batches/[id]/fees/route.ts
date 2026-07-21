import { todayInTimeZone } from "@/lib/batch-schedule";
import { syncBatchFees } from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function GET(request: Request, context: RouteContext<"/api/batches/[id]/fees">) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await context.params;
    await syncBatchFees(id, user.businessId);
    const batch = await prisma.batch.findFirst({ where: { id, businessId: user.businessId }, include: { business: { select: { currency: true, timeZone: true } } } });
    if (!batch) return Response.json({ error: "Batch not found." }, { status: 404 });
    const periods = await prisma.feePeriod.findMany({
      where: { batchId: id, businessId: user.businessId },
      orderBy: { periodStart: "desc" },
      include: { studentFees: { include: { student: { select: { id: true, firstName: true, lastName: true, yearLevel: true } } }, orderBy: { student: { firstName: "asc" } } } },
    });
    const requestedPeriod = new URL(request.url).searchParams.get("period");
    const today = todayInTimeZone(batch.business.timeZone);
    const selected = periods.find((period) => period.id === requestedPeriod) ?? periods.find((period) => period.periodStart.toISOString().slice(0, 10) <= today && period.periodEnd.toISOString().slice(0, 10) >= today) ?? periods[0] ?? null;
    return Response.json({
      batch: { id: batch.id, name: batch.name, isRecurring: batch.isRecurring, startDate: batch.startDate, endDate: batch.endDate, feePerSession: batch.feePerSession ? Number(batch.feePerSession) : null, billingMethod: batch.billingMethod, currency: batch.business.currency },
      periods: periods.map((period) => ({ id: period.id, label: period.label, periodStart: period.periodStart, periodEnd: period.periodEnd, studentCount: period.studentFees.length })),
      selectedPeriod: selected ? { id: selected.id, label: selected.label, periodStart: selected.periodStart, periodEnd: selected.periodEnd, fees: selected.studentFees.map((fee) => ({ ...fee, rate: Number(fee.rate), amount: Number(fee.amount) })) } : null,
      today,
    });
  } catch (error) {
    console.error("Failed to load fees", error);
    return Response.json({ error: "Fees could not be loaded." }, { status: 500 });
  }
}

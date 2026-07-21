import { z } from "zod";

import { BillingMethod, FeeStatus, StudentStatus, UserRole, Weekday } from "@/lib/generated/prisma/enums";
import { todayInTimeZone } from "@/lib/batch-schedule";
import { syncBatchFees } from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const batchSchema = z.object({
  name: z.string().trim().min(2).max(120),
  startDate: z.iso.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  isRecurring: z.boolean(),
  recurringDays: z.array(z.enum(Weekday)).default([]),
  endDate: z.union([z.iso.date(), z.literal("")]).optional().default(""),
  feePerSession: z.coerce.number().positive("Fee per session must be greater than zero.").max(10000),
  billingMethod: z.enum(BillingMethod),
}).superRefine((data, context) => {
  if (data.isRecurring && data.recurringDays.length === 0) context.addIssue({ code: "custom", message: "Select at least one recurring day.", path: ["recurringDays"] });
  if (data.isRecurring && !data.endDate) context.addIssue({ code: "custom", message: "End date is required for recurring batches.", path: ["endDate"] });
  if (data.endDate && data.endDate < data.startDate) context.addIssue({ code: "custom", message: "End date cannot be before the start date.", path: ["endDate"] });
});

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

    const [batches, students, business] = await Promise.all([
      prisma.batch.findMany({
        where: { businessId: user.businessId },
        orderBy: [{ startDate: "asc" }, { startTime: "asc" }],
        include: {
          students: {
            where: { removedAt: null },
            orderBy: { student: { firstName: "asc" } },
            select: { student: { select: { id: true, firstName: true, lastName: true, yearLevel: true } } },
          },
        },
      }),
      prisma.student.findMany({
        where: { businessId: user.businessId, status: StudentStatus.ACTIVE },
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: { id: true, firstName: true, lastName: true, yearLevel: true },
      }),
      prisma.business.findUnique({ where: { id: user.businessId }, select: { currency: true, timeZone: true } }),
    ]);
    await Promise.all(batches.filter((batch) => batch.feePerSession && batch.billingMethod).map((batch) => syncBatchFees(batch.id, user.businessId)));
    const unpaidFees = await prisma.studentFee.findMany({ where: { businessId: user.businessId, status: FeeStatus.UNPAID }, select: { amount: true, dueDate: true, feePeriod: { select: { batchId: true } } } });
    const today = todayInTimeZone(business?.timeZone ?? "Australia/Sydney");
    const summaries = new Map<string, { unpaidCount: number; overdueCount: number; overdueAmount: number }>();
    for (const fee of unpaidFees) {
      const summary = summaries.get(fee.feePeriod.batchId) ?? { unpaidCount: 0, overdueCount: 0, overdueAmount: 0 };
      summary.unpaidCount += 1;
      if (fee.dueDate.toISOString().slice(0, 10) < today) { summary.overdueCount += 1; summary.overdueAmount += Number(fee.amount); }
      summaries.set(fee.feePeriod.batchId, summary);
    }
    const enrichedBatches = batches.map((batch) => ({ ...batch, currency: business?.currency ?? "AUD", feePerSession: batch.feePerSession ? Number(batch.feePerSession) : null, feeSummary: summaries.get(batch.id) ?? { unpaidCount: 0, overdueCount: 0, overdueAmount: 0 } }));
    const totalOverdue = [...summaries.values()].reduce((total, summary) => total + summary.overdueAmount, 0);
    return Response.json({ batches: enrichedBatches, students, totals: { totalOverdue, currency: business?.currency ?? "AUD" } });
  } catch (error) {
    console.error("Failed to load batches", error);
    return Response.json({ error: "Batches could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) return Response.json({ error: "You do not have permission to create batches." }, { status: 403 });

    const parsed = batchSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Check the batch details." }, { status: 400 });
    const data = parsed.data;
    const batch = await prisma.batch.create({
      data: {
        businessId: user.businessId,
        name: data.name,
        startDate: new Date(`${data.startDate}T00:00:00.000Z`),
        startTime: data.startTime,
        isRecurring: data.isRecurring,
        recurringDays: data.isRecurring ? [...new Set(data.recurringDays)] : [],
        endDate: data.isRecurring && data.endDate ? new Date(`${data.endDate}T00:00:00.000Z`) : null,
        feePerSession: data.feePerSession,
        billingMethod: data.isRecurring ? data.billingMethod : BillingMethod.FULL_TERM,
      },
      include: { students: { where: { removedAt: null }, select: { student: { select: { id: true, firstName: true, lastName: true, yearLevel: true } } } } },
    });
    return Response.json({ batch }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "P2002") return Response.json({ error: "A batch with this name already exists." }, { status: 409 });
    console.error("Failed to create batch", error);
    return Response.json({ error: "The batch could not be created." }, { status: 500 });
  }
}

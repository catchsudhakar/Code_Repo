import { z } from "zod";

import { FeeStatus, UserRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

const paymentSchema = z.object({ feeIds: z.array(z.string().min(1)).min(1).max(1000), paid: z.boolean(), note: z.string().trim().max(250).optional().default("") });

export async function PUT(request: Request, context: RouteContext<"/api/batches/[id]/fees/payments">) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) return Response.json({ error: "You do not have permission to update payments." }, { status: 403 });
    const { id } = await context.params;
    const parsed = paymentSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Check the selected fees and payment note." }, { status: 400 });
    const feeIds = [...new Set(parsed.data.feeIds)];
    const validCount = await prisma.studentFee.count({ where: { id: { in: feeIds }, businessId: user.businessId, feePeriod: { batchId: id } } });
    if (validCount !== feeIds.length) return Response.json({ error: "One or more fees are unavailable." }, { status: 400 });
    await prisma.studentFee.updateMany({ where: { id: { in: feeIds } }, data: parsed.data.paid ? { status: FeeStatus.PAID, paidAt: new Date(), paymentNote: parsed.data.note || null, markedById: user.id } : { status: FeeStatus.UNPAID, paidAt: null, paymentNote: null, markedById: null } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to update payment", error);
    return Response.json({ error: "Payment status could not be updated." }, { status: 500 });
  }
}

import { z } from "zod";

import { StudentStatus, UserRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { syncBatchFees } from "@/lib/fees";

const assignmentSchema = z.object({ studentIds: z.array(z.string().min(1)).max(1000) });

export async function PUT(request: Request, context: RouteContext<"/api/batches/[id]/students">) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) return Response.json({ error: "You do not have permission to assign students." }, { status: 403 });
    const { id } = await context.params;
    const parsed = assignmentSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: "Invalid student selection." }, { status: 400 });
    const studentIds = [...new Set(parsed.data.studentIds)];

    const batch = await prisma.batch.findFirst({ where: { id, businessId: user.businessId }, select: { id: true } });
    if (!batch) return Response.json({ error: "Batch not found." }, { status: 404 });
    const validStudents = await prisma.student.findMany({ where: { id: { in: studentIds }, businessId: user.businessId, status: StudentStatus.ACTIVE }, select: { id: true } });
    if (validStudents.length !== studentIds.length) return Response.json({ error: "One or more students are unavailable." }, { status: 400 });

    await prisma.$transaction(async (transaction) => {
      await transaction.batchStudent.updateMany({ where: { batchId: id, removedAt: null, ...(studentIds.length ? { studentId: { notIn: studentIds } } : {}) }, data: { removedAt: new Date() } });
      for (const studentId of studentIds) {
        await transaction.batchStudent.upsert({ where: { batchId_studentId: { batchId: id, studentId } }, update: { addedAt: new Date(), removedAt: null }, create: { batchId: id, studentId } });
      }
    });
    await syncBatchFees(id, user.businessId);

    const updatedBatch = await prisma.batch.findUnique({
      where: { id },
      include: { students: { where: { removedAt: null }, orderBy: { student: { firstName: "asc" } }, select: { student: { select: { id: true, firstName: true, lastName: true, yearLevel: true } } } } },
    });
    return Response.json({ batch: updatedBatch });
  } catch (error) {
    console.error("Failed to assign students", error);
    return Response.json({ error: "Student assignments could not be saved." }, { status: 500 });
  }
}

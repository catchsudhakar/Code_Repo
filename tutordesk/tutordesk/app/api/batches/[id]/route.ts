import { UserRole } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function DELETE(_request: Request, context: RouteContext<"/api/batches/[id]">) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) return Response.json({ error: "You do not have permission to delete batches." }, { status: 403 });

    const { id } = await context.params;
    const batch = await prisma.batch.findFirst({ where: { id, businessId: user.businessId }, select: { id: true } });
    if (!batch) return Response.json({ error: "Batch not found." }, { status: 404 });

    await prisma.batch.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete batch", error);
    return Response.json({ error: "The batch could not be deleted." }, { status: 500 });
  }
}

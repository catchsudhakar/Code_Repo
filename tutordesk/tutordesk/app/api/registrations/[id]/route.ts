import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function GET(_request: Request, context: RouteContext<"/api/registrations/[id]">) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const { id } = await context.params;
    const registration = await prisma.registration.findFirst({
      where: { id, businessId: user.businessId },
      include: {
        reviews: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!registration) {
      return Response.json({ error: "Registration not found." }, { status: 404 });
    }

    return Response.json({ registration });
  } catch (error) {
    console.error("Failed to load registration", error);
    return Response.json({ error: "Registration could not be loaded." }, { status: 500 });
  }
}

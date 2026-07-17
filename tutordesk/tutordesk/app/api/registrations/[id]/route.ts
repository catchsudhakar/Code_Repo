import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, context: RouteContext<"/api/registrations/[id]">) {
  try {
    const { id } = await context.params;
    const registration = await prisma.registration.findFirst({
      where: { id, business: { slug: "tutordesk-demo" } },
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

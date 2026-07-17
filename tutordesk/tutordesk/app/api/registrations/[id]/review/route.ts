import { z } from "zod";

import { ReviewAction, RegistrationStatus } from "@/lib/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const reviewSchema = z.object({
  action: z.enum(["APPROVE", "REQUEST_CHANGES", "REJECT"]),
  note: z.string().trim().max(2000).optional().default(""),
}).refine((data) => data.action === "APPROVE" || data.note.length > 0, {
  message: "A message is required for this decision.",
  path: ["note"],
});

export async function POST(request: Request, context: RouteContext<"/api/registrations/[id]/review">) {
  try {
    const { id } = await context.params;
    const parsed = reviewSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message ?? "Invalid review." }, { status: 400 });

    const registration = await prisma.registration.findFirst({
      where: { id, business: { slug: "tutordesk-demo" } },
    });
    if (!registration) return Response.json({ error: "Registration not found." }, { status: 404 });
    if (registration.status === RegistrationStatus.APPROVED || registration.status === RegistrationStatus.REJECTED) {
      return Response.json({ error: "This registration has already been reviewed." }, { status: 409 });
    }

    const result = await prisma.$transaction(async (transaction) => {
      if (parsed.data.action === "APPROVE") {
        const parent = await transaction.parent.upsert({
          where: { businessId_email: { businessId: registration.businessId, email: registration.email } },
          update: {
            firstName: registration.parentFirstName,
            lastName: registration.parentLastName,
            relationship: registration.relationship,
            phone: registration.phone,
            address: registration.address,
          },
          create: {
            businessId: registration.businessId,
            firstName: registration.parentFirstName,
            lastName: registration.parentLastName,
            relationship: registration.relationship,
            email: registration.email,
            phone: registration.phone,
            address: registration.address,
          },
        });
        const student = await transaction.student.create({
          data: {
            businessId: registration.businessId,
            parentId: parent.id,
            firstName: registration.studentFirstName,
            lastName: registration.studentLastName,
            dateOfBirth: registration.dateOfBirth,
            yearLevel: registration.yearLevel,
            school: registration.school,
            learningNeeds: registration.learningNeeds,
          },
        });
        await transaction.registrationReview.create({ data: { registrationId: id, action: ReviewAction.APPROVED, reviewerName: "Sarah Manager" } });
        return transaction.registration.update({
          where: { id },
          data: { status: RegistrationStatus.APPROVED, reviewedAt: new Date(), parentId: parent.id, studentId: student.id },
          include: { reviews: { orderBy: { createdAt: "desc" } } },
        });
      }

      const status = parsed.data.action === "REQUEST_CHANGES" ? RegistrationStatus.CHANGES_REQUESTED : RegistrationStatus.REJECTED;
      const action = parsed.data.action === "REQUEST_CHANGES" ? ReviewAction.REQUESTED_CHANGES : ReviewAction.REJECTED;
      await transaction.registrationReview.create({ data: { registrationId: id, action, note: parsed.data.note, reviewerName: "Sarah Manager" } });
      return transaction.registration.update({
        where: { id },
        data: { status, reviewedAt: new Date() },
        include: { reviews: { orderBy: { createdAt: "desc" } } },
      });
    });

    return Response.json({ registration: result });
  } catch (error) {
    console.error("Failed to review registration", error);
    return Response.json({ error: "The review could not be saved." }, { status: 500 });
  }
}

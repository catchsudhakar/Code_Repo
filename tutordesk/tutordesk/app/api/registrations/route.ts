import { randomUUID } from "node:crypto";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { RegistrationStatus } from "@/lib/generated/prisma/enums";
import { requireUser } from "@/lib/require-user";

const registrationSchema = z.object({
  studentFirstName: z.string().trim().min(1).max(80),
  studentLastName: z.string().trim().min(1).max(80),
  dateOfBirth: z.iso.date(),
  yearLevel: z.preprocess(
    (value) => typeof value === "string" ? Number(value.replace(/\D/g, "")) : value,
    z.number().int().min(1).max(12),
  ),
  school: z.string().trim().max(160).optional().default(""),
  learningNeeds: z.string().trim().max(2000).optional().default(""),
  parentFirstName: z.string().trim().min(1).max(80),
  parentLastName: z.string().trim().min(1).max(80),
  relationship: z.string().trim().min(1).max(40),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().max(300).optional().default(""),
  emergencyName: z.string().trim().max(160).optional().default(""),
  emergencyPhone: z.string().trim().max(30).optional().default(""),
});

function optional(value: string) {
  return value || null;
}

const validStatuses = new Set(Object.values(RegistrationStatus));

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const requestedStatus = url.searchParams.get("status");
    const status = requestedStatus && validStatuses.has(requestedStatus as RegistrationStatus)
      ? requestedStatus as RegistrationStatus
      : undefined;

    const where = {
      businessId: user.businessId,
      ...(status ? { status } : {}),
      ...(query ? {
        OR: [
          { reference: { contains: query, mode: "insensitive" as const } },
          { studentFirstName: { contains: query, mode: "insensitive" as const } },
          { studentLastName: { contains: query, mode: "insensitive" as const } },
          { parentFirstName: { contains: query, mode: "insensitive" as const } },
          { parentLastName: { contains: query, mode: "insensitive" as const } },
          { email: { contains: query, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const [registrations, groupedCounts, total] = await Promise.all([
      prisma.registration.findMany({
        where,
        orderBy: { submittedAt: "desc" },
        select: {
          id: true,
          reference: true,
          studentFirstName: true,
          studentLastName: true,
          parentFirstName: true,
          parentLastName: true,
          yearLevel: true,
          status: true,
          submittedAt: true,
        },
      }),
      prisma.registration.groupBy({
        by: ["status"],
        where: { businessId: user.businessId },
        _count: { _all: true },
      }),
      prisma.registration.count({ where: { businessId: user.businessId } }),
    ]);

    const counts = Object.fromEntries(groupedCounts.map((item) => [item.status, item._count._all]));
    return Response.json({ registrations, counts: { ...counts, ALL: total } });
  } catch (error) {
    console.error("Failed to load registrations", error);
    return Response.json({ error: "Registrations could not be loaded." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });
    const parsed = registrationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return Response.json(
        { error: "Please check the registration details and try again." },
        { status: 400 },
      );
    }

    const data = parsed.data;
    const reference = `REG-${new Date().getFullYear()}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const registration = await prisma.registration.create({
      data: {
        reference,
        businessId: user.businessId,
        studentFirstName: data.studentFirstName,
        studentLastName: data.studentLastName,
        dateOfBirth: new Date(`${data.dateOfBirth}T00:00:00.000Z`),
        yearLevel: data.yearLevel,
        school: optional(data.school),
        learningNeeds: optional(data.learningNeeds),
        parentFirstName: data.parentFirstName,
        parentLastName: data.parentLastName,
        relationship: data.relationship,
        email: data.email,
        phone: data.phone,
        address: optional(data.address),
        emergencyContactName: optional(data.emergencyName),
        emergencyContactPhone: optional(data.emergencyPhone),
      },
      select: { id: true, reference: true, status: true, submittedAt: true },
    });

    return Response.json({ registration }, { status: 201 });
  } catch (error) {
    console.error("Failed to create registration", error);
    return Response.json(
      { error: "We could not submit the registration. Please try again." },
      { status: 500 },
    );
  }
}

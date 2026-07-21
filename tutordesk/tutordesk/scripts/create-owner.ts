import "dotenv/config";
import { hash } from "bcryptjs";

import { UserRole } from "../lib/generated/prisma/enums";
import { prisma } from "../lib/prisma";

async function main() {
  const email = process.env.OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.OWNER_PASSWORD;
  const name = process.env.OWNER_NAME?.trim() || "TutorDesk Owner";
  if (!email || !password || password.length < 12) throw new Error("Set OWNER_EMAIL and an OWNER_PASSWORD of at least 12 characters in .env");

  const business = await prisma.business.findUnique({ where: { slug: "tutordesk-demo" } });
  if (!business) throw new Error("TutorDesk Demo business not found. Run npm run db:test first.");
  const passwordHash = await hash(password, 12);
  const user = await prisma.user.upsert({ where: { email }, update: { name, passwordHash, businessId: business.id, role: UserRole.OWNER, active: true }, create: { email, name, passwordHash, businessId: business.id, role: UserRole.OWNER } });
  console.log(`Owner account ready: ${user.email}`);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());

import "dotenv/config";

import { prisma } from "../lib/prisma";

async function main() {
  const business = await prisma.business.upsert({
    where: { slug: "tutordesk-demo" },
    update: {},
    create: {
      name: "TutorDesk Demo",
      slug: "tutordesk-demo",
      countryCode: "AU",
      currency: "AUD",
    },
  });

  const registration = await prisma.registration.upsert({
    where: { reference: "REG-TEST-001" },
    update: {
      studentFirstName: "Test",
      studentLastName: "Student",
    },
    create: {
      reference: "REG-TEST-001",
      businessId: business.id,
      studentFirstName: "Test",
      studentLastName: "Student",
      dateOfBirth: new Date("2014-05-10T00:00:00.000Z"),
      yearLevel: 6,
      school: "TutorDesk Test School",
      learningNeeds: "Database connection test",
      parentFirstName: "Test",
      parentLastName: "Parent",
      relationship: "Guardian",
      email: "test.parent@example.com",
      phone: "+61 400 000 000",
    },
  });

  const registrationCount = await prisma.registration.count({
    where: { businessId: business.id },
  });

  console.log("Database connection successful");
  console.log(`Business: ${business.name}`);
  console.log(`Test registration: ${registration.reference}`);
  console.log(`Registration count: ${registrationCount}`);
}

main()
  .catch((error) => {
    console.error("Database test failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

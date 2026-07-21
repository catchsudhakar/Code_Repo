import "dotenv/config";

import { prisma } from "../lib/prisma";

async function main() {
  const batches = await prisma.batch.findMany({ where: { isRecurring: true, endDate: null }, select: { id: true, name: true, startDate: true } });
  for (const batch of batches) {
    const endDate = new Date(batch.startDate);
    endDate.setUTCMonth(endDate.getUTCMonth() + 3);
    await prisma.batch.update({ where: { id: batch.id }, data: { endDate } });
    console.log(`${batch.name}: ${batch.startDate.toISOString().slice(0, 10)} → ${endDate.toISOString().slice(0, 10)}`);
  }
  console.log(`Updated ${batches.length} recurring batch${batches.length === 1 ? "" : "es"}.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());

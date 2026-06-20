import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const records = await prisma.runnerRecord.findMany({ where: { eventId: '67cb17a3-77c3-470e-a90e-f77b9eb581ac' } });
  console.log('Records for Testtt123:', records);
}
main().finally(() => prisma.$disconnect());

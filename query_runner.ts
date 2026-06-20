import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const runner = await prisma.runnerStatus.findFirst({ where: { name: { contains: 'Bima Arya' } } });
  console.log('Runner:', runner);
}
main().finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DB CHECK ---');
  
  // Check active events
  const events = await prisma.event.findMany({ where: { isActive: true } });
  console.log('Active Events:', events.map(e => e.id));
  
  // Check RunnerStatus for the EPC
  const epc1 = '30395DFA82F8958006462040';
  const epc2 = 'E2806894000040345BE43244';
  
  const runners1 = await prisma.runnerStatus.findMany({ where: { epc: epc1 } });
  console.log(`RunnerStatus for ${epc1}:`, runners1);

  const runners2 = await prisma.runnerStatus.findMany({ where: { epc: epc2 } });
  console.log(`RunnerStatus for ${epc2}:`, runners2);
  
  const allRunners = await prisma.runnerStatus.findMany({ take: 5 });
  console.log('Sample of registered EPCs in DB:', allRunners.map(r => r.epc));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());

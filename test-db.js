const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const mf = await prisma.manualFinish.findMany();
  console.log("ManualFinish:", mf);
  const ms = await prisma.manualStartBib.findMany();
  console.log("ManualStartBib:", ms);
  process.exit(0);
}
run();

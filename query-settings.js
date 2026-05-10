
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.systemSetting.findMany();
  console.log(settings);
}
main().finally(() => prisma.\$disconnect\());


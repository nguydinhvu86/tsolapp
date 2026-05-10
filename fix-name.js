
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.systemSetting.upsert({
    where: { key: 'COMPANY_NAME' },
    update: { value: 'Công Ty TNHH Công Ngh? Tr?nh Gia' },
    create: { key: 'COMPANY_NAME', value: 'Công Ty TNHH Công Ngh? Tr?nh Gia' }
  });
  console.log('Done');
}
main();


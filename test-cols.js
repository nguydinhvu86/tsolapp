const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRaw`SHOW COLUMNS FROM salesorder`;
  console.log('salesorder columns:', cols.map(c => c.Field).join(', '));
}

main().finally(() => prisma.$disconnect());

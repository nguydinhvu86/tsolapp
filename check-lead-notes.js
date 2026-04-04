const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const notes = await prisma.leadNote.findMany({
    where: { attachment: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  console.log(JSON.stringify(notes, null, 2));
}

main().finally(() => prisma.$disconnect());

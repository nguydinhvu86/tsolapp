const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const comments = await prisma.comment.findMany({
    where: { content: { contains: '<img' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { content: true, user: { select: { name: true } } }
  });
  console.log(JSON.stringify(comments, null, 2));

  // Also query LeadNote just in case it's stored in 'content' inside LeadNote!
  const leadnotes = await prisma.leadNote.findMany({
    where: { content: { contains: '<img' } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { content: true, user: { select: { name: true } } }
  });
  console.log('Lead notes:', JSON.stringify(leadnotes, null, 2));
}

main().finally(() => prisma.$disconnect());

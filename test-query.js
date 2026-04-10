const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const logs = await prisma.callLog.findMany({
        where: { phone: { contains: '0989646861' } },
        orderBy: { startedAt: 'desc' },
        take: 10
    });
    console.log(JSON.stringify(logs, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());

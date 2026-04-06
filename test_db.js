const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { extension: { not: null } },
        select: { id: true, name: true, extension: true, email: true }
    });
    console.log('Users with extension:', users);
    
    // Also check if any call logs were saved
    const logs = await prisma.callLog.findMany({
        orderBy: { startedAt: 'desc' },
        take: 5
    });
    console.log('Recent CallLogs:', logs);
}

main().catch(console.error).finally(() => prisma.$disconnect());

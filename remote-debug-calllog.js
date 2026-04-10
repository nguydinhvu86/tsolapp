const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("=== LATEST 3 CALL LOGS ===");
    const logs = await prisma.callLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: {
            customer: { select: { name: true, phone: true } },
            lead: { select: { name: true, phone: true } },
            user: { select: { name: true, extension: true } }
        }
    });
    
    console.dir(logs, { depth: null });
}

main().catch(console.error).finally(() => prisma.$disconnect());

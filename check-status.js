const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const stats = await prisma.salesEstimate.groupBy({
        by: ['status'],
        _count: { id: true }
    });
    console.log(stats);
}
main().catch(console.error).finally(() => prisma.$disconnect());

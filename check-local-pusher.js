const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkPusher() {
    try {
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: { startsWith: 'PUSHER_' }
            }
        });
        console.log("SETTINGS FOUND:", JSON.stringify(settings, null, 2));
    } catch (e) {
        console.error("Prisma error:", e);
    } finally {
        await prisma.$disconnect();
    }
}

checkPusher();

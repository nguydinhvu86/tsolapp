require('dotenv').config(); // Loads .env (which should point to mysql://tsolapp... on 3307)
const { PrismaClient } = require('@prisma/client');

// Explicitly instantiate Prisma to use the forwarded port 3307
const prisma = new PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        },
    },
});

async function checkPusher() {
    try {
        console.log("Using DB URL:", process.env.DATABASE_URL.replace(/:[^:]*@/, ':***@'));
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

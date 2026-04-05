const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const customer = await prisma.customer.findFirst({
            include: { managers: true, activityLogs: true }
        });
        console.log("SUCCESS:", !!customer);
    } catch (e) {
        console.error("PRISMA ERROR:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();

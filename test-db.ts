import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        await prisma.$connect();
        console.log('SUCCESS: Connected to MySQL database.');
        const provider = (prisma as any)._engineConfig?.activeProvider || 'unknown';
        console.log('Provider:', provider);

        const count = await prisma.user.count();
        console.log('User count in DB:', count);

        const supplierCount = await prisma.supplier.count();
        console.log('Supplier count in DB:', supplierCount);
    } catch (error) {
        console.error('ERROR: Failed to connect to database.', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();

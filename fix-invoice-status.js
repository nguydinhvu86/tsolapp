const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Migrating older fully processed invoices from INVENTORY_IMPORTED to COMPLETED...");
    const res = await prisma.supplierInvoice.updateMany({
        where: {
            status: 'INVENTORY_IMPORTED'
        },
        data: {
            status: 'COMPLETED'
        }
    });
    console.log(`Successfully migrated ${res.count} invoices to COMPLETED status.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

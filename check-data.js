const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
    try {
        console.log(`Users: ${await prisma.user.count()}`);
        console.log(`Suppliers: ${await prisma.supplier.count()}`);
        console.log(`Customers: ${await prisma.customer.count()}`);
        console.log(`Leads: ${await prisma.lead.count()}`);
        console.log(`Tasks: ${await prisma.task.count()}`);
        console.log(`Inventory: ${await prisma.inventory.count()}`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
checkData();

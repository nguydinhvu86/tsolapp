const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const actions = await prisma.salesInvoiceActivityLog.findMany({
        where: { details: { contains: 'gửi email' } }
    });
    console.log('Email Activity Logs:', actions.length);
    if (actions.length > 0) {
        console.log('Sample Action:', actions[actions.length - 1]);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

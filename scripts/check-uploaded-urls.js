const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const taskAtts = await prisma.taskAttachment.findMany({ take: 10 });
    console.log('TaskAttachments:');
    taskAtts.forEach(t => console.log(`  - [${t.fileName}] -> ${t.fileUrl}`));

    const sysAtts = await prisma.systemAttachment.findMany({ take: 10 });
    console.log('\nSystemAttachments:');
    sysAtts.forEach(s => console.log(`  - [${s.fileName}] (${s.entityType}) -> ${s.fileUrl}`));

    const invs = await prisma.salesInvoice.findMany({ where: { attachment: { not: null } }, select: { code: true, attachment: true }, take: 5 });
    console.log('\nSalesInvoice attachments:');
    invs.forEach(i => console.log(`  - ${i.code}: ${i.attachment}`));

    const bills = await prisma.purchaseBill.findMany({ where: { attachment: { not: null } }, select: { code: true, attachment: true }, take: 5 });
    console.log('\nPurchaseBill attachments:');
    bills.forEach(b => console.log(`  - ${b.code}: ${b.attachment}`));
}

run().finally(() => prisma.$disconnect());

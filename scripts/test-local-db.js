const { PrismaClient } = require('@prisma/client');

async function test() {
    const prisma = new PrismaClient({ datasources: { db: { url: 'mysql://root:@localhost:3306/erp_tsoldev' } } });
    const t = await prisma.emailTemplate.findFirst({ where: { module: 'CUSTOMER' } });
    console.log('✅ Local CUSTOMER Subject:', t.subject);
    console.log('✅ Local CUSTOMER Body preview:\n', t.body.substring(0, 450));
    await prisma.$disconnect();
}
test();

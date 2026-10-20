const { PrismaClient } = require('@prisma/client');

async function test() {
    const prisma = new PrismaClient({ datasources: { db: { url: 'mysql://root:@localhost:3306/erp_tsoldev' } } });
    const templates = await prisma.emailTemplate.findMany();
    console.log(`=== TỔNG SỐ TEMPLATE: ${templates.length} ===`);
    templates.forEach((t, i) => {
        const hasBgColor = t.body.includes('background-color: #');
        const headerSnippet = t.body.substring(t.body.indexOf('<div style="background'), t.body.indexOf('</h2>') + 5);
        console.log(`\n[${i + 1}] [${t.module}] ${t.name}`);
        console.log(`    - Has background-color fallback: ${hasBgColor ? '✅ YES' : '❌ NO'}`);
        console.log(`    - Header snippet: ${headerSnippet.replace(/\n\s*/g, ' ')}`);
    });
    await prisma.$disconnect();
}
test();

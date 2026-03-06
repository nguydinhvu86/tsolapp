const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const leads = await prisma.lead.groupBy({
        by: ['email'],
        having: {
            email: {
                _count: { gt: 1 }
            }
        }
    });
    console.log('Duplicates:', JSON.stringify(leads.filter(c => c.email !== null), null, 2));
}

main().catch(e => console.error(e)).finally(async () => {
    await prisma.$disconnect()
});

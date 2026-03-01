import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const quotes = await prisma.quote.findMany();
    for (const q of quotes) {
        console.log("quote:", q.id, "status:", q.status);
        const vars = JSON.parse(q.variables || '{}');
        console.log("KEYS:", Object.keys(vars).filter(k => !k.startsWith('TABLE_')));
        for (const key of Object.keys(vars)) {
            if (!key.startsWith('TABLE_')) {
                console.log(`  ${key}:`, vars[key]);
            }
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

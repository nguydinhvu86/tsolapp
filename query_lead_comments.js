const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    try {
        const comments = await prisma.leadComment.findMany({
            where: {
                content: {
                    contains: '<img'
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: { id: true, content: true, createdAt: true }
        });
        
        fs.writeFileSync('/tmp/comments.json', JSON.stringify(comments, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}
main();

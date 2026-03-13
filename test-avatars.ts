const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            avatar: true
        }
    });
    fs.writeFileSync('test-avatars.json', JSON.stringify(users, null, 2));
}

main()
    .catch(e => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

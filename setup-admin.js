const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('admin123', 10);
    const user = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            password: password,
            role: 'ADMIN',
        },
        create: {
            email: 'admin@example.com',
            name: 'Admin User',
            password: password,
            role: 'ADMIN',
        },
    });
    console.log('✅ Admin user ready:', user.email);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

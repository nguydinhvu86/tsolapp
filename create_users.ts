import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');
    const passwordHash = await bcrypt.hash('admin123', 10);

    const admin = await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            password: passwordHash,
            role: 'ADMIN',
        },
        create: {
            email: 'admin@example.com',
            name: 'Admin User',
            password: passwordHash,
            role: 'ADMIN',
            permissions: '[]',
            dashboardConfig: '{}',
            sidebarOrder: '[]',
            customerMenuOrder: '[]',
        }
    });

    const testUser = await prisma.user.upsert({
        where: { email: 'test@example.com' },
        update: {
            password: passwordHash,
            role: 'USER',
        },
        create: {
            email: 'test@example.com',
            name: 'Test User',
            password: passwordHash,
            role: 'USER',
            permissions: '[]',
            dashboardConfig: '{}',
            sidebarOrder: '[]',
            customerMenuOrder: '[]',
        }
    });

    console.log('Created admin:', admin.email, 'Role:', admin.role);
    console.log('Created test user:', testUser.email, 'Role:', testUser.role);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

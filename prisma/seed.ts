import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // 1. SYSTEM SETTINGS
    console.log('Tạo dữ liệu Cấu hình hệ thống (System Settings)...');
    await prisma.systemSetting.createMany({
        data: [
            { key: 'COMPANY_NAME', value: 'Công ty TNHH Phần mềm Trường Thịnh' },
            { key: 'COMPANY_PHONE', value: '0901 234 567' },
            { key: 'COMPANY_EMAIL', value: 'contact@truongthinh.com' },
            { key: 'COMPANY_ADDRESS', value: '123 Đường Nam Kỳ Khởi Nghĩa, Quận 3, TP.HCM' },
            { key: 'COMPANY_TAX', value: '0312000123' }
        ]
    });

    // 2. USERS
    console.log('Tạo dữ liệu User (Admin & User)...');
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedUserPassword = await bcrypt.hash('user123', 10);

    await prisma.user.create({
        data: {
            email: 'admin@example.com',
            password: hashedAdminPassword,
            name: 'Nguyễn Văn Admin',
            role: 'ADMIN',
        },
    });

    await prisma.user.create({
        data: {
            email: 'user@example.com',
            password: hashedUserPassword,
            name: 'Trần Thị User',
            role: 'USER',
        },
    });

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

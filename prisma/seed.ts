import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PermissionHelper, RESOURCES, ACTIONS } from '../lib/permissions';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // 1. SYSTEM SETTINGS
    console.log('Tạo dữ liệu Cấu hình hệ thống (System Settings)...');
    try {
        await prisma.systemSetting.createMany({
            data: [
                { key: 'COMPANY_NAME', value: 'Công ty TNHH Phần mềm Trường Thịnh' },
                { key: 'COMPANY_PHONE', value: '0901 234 567' },
                { key: 'COMPANY_EMAIL', value: 'contact@truongthinh.com' },
                { key: 'COMPANY_ADDRESS', value: '123 Đường Nam Kỳ Khởi Nghĩa, Quận 3, TP.HCM' },
                { key: 'COMPANY_TAX', value: '0312000123' }
            ],
            skipDuplicates: true
        });
    } catch (e) { console.log('Bỏ qua tạo cài đặt vì đã tồn tại'); }

    // 1.5 PERMISSION GROUPS
    console.log('Tạo dữ liệu Nhóm quyền mặc định...');
    const allPerms = PermissionHelper.getAllPermissions();

    // Admin gets everything
    const adminPerms = allPerms;

    // Manager gets VIEW, CREATE, EDIT on everything, plus dashboard
    const managerPerms = [PermissionHelper.VIEW_DASHBOARD];
    RESOURCES.forEach(r => {
        managerPerms.push(PermissionHelper.generateCode(r.id, 'VIEW'));
        managerPerms.push(PermissionHelper.generateCode(r.id, 'CREATE'));
        managerPerms.push(PermissionHelper.generateCode(r.id, 'EDIT'));
    });

    // User gets only VIEW and dashboard
    const userPerms = [PermissionHelper.VIEW_DASHBOARD];
    RESOURCES.forEach(r => {
        userPerms.push(PermissionHelper.generateCode(r.id, 'VIEW'));
    });

    const adminGroup = await prisma.permissionGroup.upsert({
        where: { name: 'Admin' },
        update: {},
        create: {
            name: 'Admin',
            description: 'Toàn quyền hệ thống',
            permissions: JSON.stringify(adminPerms),
            isSystem: true
        }
    });

    const managerGroup = await prisma.permissionGroup.upsert({
        where: { name: 'Quản lý' },
        update: {},
        create: {
            name: 'Quản lý',
            description: 'Quyền quản lý nội dung (không có xóa)',
            permissions: JSON.stringify(managerPerms),
            isSystem: true
        }
    });

    const userGroup = await prisma.permissionGroup.upsert({
        where: { name: 'Người dùng' },
        update: {},
        create: {
            name: 'Người dùng',
            description: 'Chỉ xem dữ liệu',
            permissions: JSON.stringify(userPerms),
            isSystem: true
        }
    });

    // 2. USERS
    console.log('Tạo dữ liệu User (Admin & User)...');
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const hashedUserPassword = await bcrypt.hash('user123', 10);

    await prisma.user.upsert({
        where: { email: 'admin@example.com' },
        update: {
            permissionGroupId: adminGroup.id
        },
        create: {
            email: 'admin@example.com',
            password: hashedAdminPassword,
            name: 'Nguyễn Văn Admin',
            role: 'ADMIN',
            permissionGroupId: adminGroup.id,
            permissions: '[]',
            dashboardConfig: '[]',
            sidebarOrder: '[]',
            customerMenuOrder: '[]'
        },
    });

    await prisma.user.upsert({
        where: { email: 'user@example.com' },
        update: {
            permissionGroupId: userGroup.id
        },
        create: {
            email: 'user@example.com',
            password: hashedUserPassword,
            name: 'Trần Thị User',
            role: 'USER',
            permissionGroupId: userGroup.id,
            permissions: '[]',
            dashboardConfig: '[]',
            sidebarOrder: '[]',
            customerMenuOrder: '[]'
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

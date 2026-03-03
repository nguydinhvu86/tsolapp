import { PrismaClient } from '@prisma/client';
import { PermissionHelper, RESOURCES } from '../lib/permissions';

const prisma = new PrismaClient();

async function main() {
    console.log('Cập nhật quyền cho các nhóm mặc định...');

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

    // Update Admin
    await prisma.permissionGroup.updateMany({
        where: { name: 'Admin' },
        data: { permissions: JSON.stringify(adminPerms) }
    });
    console.log('✅ Đã cập nhật quyền cho nhóm Admin');

    // Update Quản lý
    await prisma.permissionGroup.updateMany({
        where: { name: 'Quản lý' },
        data: { permissions: JSON.stringify(managerPerms) }
    });
    console.log('✅ Đã cập nhật quyền cho nhóm Quản lý');

    // Update Người dùng
    await prisma.permissionGroup.updateMany({
        where: { name: 'Người dùng' },
        data: { permissions: JSON.stringify(userPerms) }
    });
    console.log('✅ Đã cập nhật quyền cho nhóm Người dùng');

    console.log('🎉 Hoàn thành cập nhật!');
}

main()
    .catch((e) => {
        console.error('Lỗi xảy ra:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

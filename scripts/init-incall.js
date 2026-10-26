const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const RESOURCES = [
    'USERS', 'CONTRACTS', 'CUSTOMERS', 'QUOTES', 'HANDOVERS', 'PAYMENTS',
    'DISPATCHES', 'TEMPLATES', 'TASKS', 'PRODUCTS', 'WAREHOUSES', 'INVENTORY_TX',
    'SUPPLIERS', 'PURCHASE_REQUISITIONS', 'PURCHASE_ORDERS', 'PURCHASE_BILLS',
    'PURCHASE_PAYMENTS', 'SALES_ESTIMATES', 'SALES_ORDERS', 'SALES_INVOICES',
    'SALES_PAYMENTS', 'SALES_EXPENSES', 'CALL_CENTER', 'ACCOUNTING', 'SETTINGS',
    'PROJECTS', 'ROLES', 'ATTENDANCE', 'EMPLOYEES', 'PAYROLL', 'RECRUITMENT',
    'MONITORING', 'MARKETING'
];

const ACTIONS = ['VIEW_ALL', 'VIEW_OWN', 'CREATE', 'EDIT', 'DELETE'];

function getAllPermissions() {
    const perms = ['VIEW_DASHBOARD', 'VIEW_EXECUTIVE_BI', 'USE_SOFTPHONE'];
    for (const r of RESOURCES) {
        for (const a of ACTIONS) {
            perms.push(`${r}_${a}`);
        }
    }
    return perms;
}

async function main() {
    console.log('🚀 [INIT] Khởi tạo dữ liệu gốc cho INCALL VIỆT NAM...');

    // 1. SYSTEM SETTINGS
    const brandSettings = [
        { key: 'COMPANY_NAME', value: 'INCALL VIỆT NAM' },
        { key: 'COMPANY_DISPLAY_NAME', value: 'INCALL VIỆT NAM' },
        { key: 'COMPANY_FULL_NAME', value: 'CÔNG TY CỔ PHẦN CÔNG NGHỆ INCALL VIỆT NAM' },
        { key: 'WATERMARK_TEXT', value: 'INCALL VIỆT NAM' },
        { key: 'WATERMARK_ENABLED', value: 'true' },
        { key: 'COMPANY_WEBSITE', value: 'erp.incall.vn' },
        { key: 'COMPANY_EMAIL', value: 'contact@incall.vn' },
        { key: 'COMPANY_PHONE', value: '1900 0000' },
        { key: 'COMPANY_ADDRESS', value: 'Việt Nam' },
        { key: 'ESTIMATE_CODE_FORMAT', value: 'QO-INCALL-{SEQ}/{MM}/{YYYY}' },
        { key: 'INVOICE_CODE_FORMAT', value: 'INV-INCALL-{SEQ}/{MM}/{YYYY}' },
        { key: 'ESTIMATE_START_SEQ', value: '1001' },
        { key: 'INVOICE_START_SEQ', value: '1001' }
    ];

    for (const s of brandSettings) {
        await prisma.systemSetting.upsert({
            where: { key: s.key },
            update: { value: s.value },
            create: { key: s.key, value: s.value }
        });
    }
    console.log('✅ Cập nhật Cấu hình Thương hiệu: INCALL VIỆT NAM');

    // 2. PERMISSION GROUPS
    const allPerms = getAllPermissions();
    const adminGroup = await prisma.permissionGroup.upsert({
        where: { name: 'Admin' },
        update: { permissions: JSON.stringify(allPerms) },
        create: {
            name: 'Admin',
            description: 'Toàn quyền quản trị hệ thống',
            permissions: JSON.stringify(allPerms),
            isSystem: true
        }
    });

    const managerPerms = ['VIEW_DASHBOARD', 'VIEW_EXECUTIVE_BI'];
    RESOURCES.forEach(r => {
        managerPerms.push(`${r}_VIEW_ALL`, `${r}_CREATE`, `${r}_EDIT`);
    });
    await prisma.permissionGroup.upsert({
        where: { name: 'Quản lý' },
        update: { permissions: JSON.stringify(managerPerms) },
        create: {
            name: 'Quản lý',
            description: 'Quyền quản lý nội dung',
            permissions: JSON.stringify(managerPerms),
            isSystem: true
        }
    });

    const userPerms = ['VIEW_DASHBOARD'];
    RESOURCES.forEach(r => {
        userPerms.push(`${r}_VIEW_ALL`);
    });
    await prisma.permissionGroup.upsert({
        where: { name: 'Người dùng' },
        update: { permissions: JSON.stringify(userPerms) },
        create: {
            name: 'Người dùng',
            description: 'Chỉ xem dữ liệu',
            permissions: JSON.stringify(userPerms),
            isSystem: true
        }
    });
    console.log('✅ Khởi tạo Nhóm quyền thành công (Admin, Quản lý, Người dùng)');

    // 3. ADMIN USERS
    const defaultPassword = await bcrypt.hash('admin123', 10);
    const adminAccounts = [
        { email: 'admin@incall.vn', name: 'Quản trị viên INCALL' },
        { email: 'admin@example.com', name: 'Admin Backup' }
    ];

    for (const acc of adminAccounts) {
        await prisma.user.upsert({
            where: { email: acc.email },
            update: {
                name: acc.name,
                password: defaultPassword,
                role: 'ADMIN',
                permissionGroupId: adminGroup.id
            },
            create: {
                email: acc.email,
                name: acc.name,
                password: defaultPassword,
                role: 'ADMIN',
                permissionGroupId: adminGroup.id,
                permissions: '[]',
                dashboardConfig: '[]',
                sidebarOrder: '[]',
                customerMenuOrder: '[]'
            }
        });
        console.log(`✅ Tài khoản Quản trị: ${acc.email} / admin123`);
    }

    console.log('🎉 [DONE] Hoàn tất nạp dữ liệu khởi tạo cho INCALL VIỆT NAM!');
}

main()
    .catch(e => {
        console.error('❌ Lỗi khi khởi tạo:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

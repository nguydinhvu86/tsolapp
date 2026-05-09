const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const RESOURCES = [
    'USERS', 'CONTRACTS', 'CUSTOMERS', 'QUOTES', 'HANDOVERS', 'PAYMENTS', 'DISPATCHES',
    'TEMPLATES', 'TASKS', 'PRODUCTS', 'WAREHOUSES', 'INVENTORY_TX', 'SUPPLIERS',
    'PURCHASE_REQUISITIONS', 'PURCHASE_ORDERS', 'PURCHASE_BILLS', 'PURCHASE_PAYMENTS',
    'SALES_ESTIMATES', 'SALES_ORDERS', 'SALES_INVOICES', 'SALES_PAYMENTS', 'SALES_EXPENSES',
    'CALL_CENTER', 'ACCOUNTING', 'SETTINGS', 'PROJECTS', 'ROLES', 'ATTENDANCE',
    'EMPLOYEES', 'PAYROLL', 'RECRUITMENT', 'MONITORING', 'MARKETING'
];
const ACTIONS = ['VIEW_ALL', 'VIEW_OWN', 'CREATE', 'EDIT', 'DELETE'];

async function main() {
    try {
        let perms = ['VIEW_DASHBOARD', 'USE_SOFTPHONE'];
        for(const r of RESOURCES) {
            for(const a of ACTIONS) {
                perms.push(`${r}_${a}`);
            }
        }
        
        const permsStr = JSON.stringify(perms);

        const adminGroup = await prisma.permissionGroup.findFirst({ where: { name: 'Admin' } });
        if (adminGroup) {
            await prisma.permissionGroup.update({
                where: { id: adminGroup.id },
                data: { permissions: permsStr }
            });
            console.log("Updated Admin PermissionGroup permissions.");
        }

        const result = await prisma.user.updateMany({
            where: { role: 'ADMIN' },
            data: { permissions: permsStr }
        });

        console.log(`Updated ${result.count} ADMIN users successfully.`);
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();

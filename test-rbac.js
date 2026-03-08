const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRBAC() {
    // 1. Fetch the user Nguy Dinh Vu (which was in the screenshot, or fetch all users)
    const users = await prisma.user.findMany({
        where: {},
        include: { permissionGroup: true }
    });

    for (const u of users) {
        console.log(`\n--- User: ${u.name} (${u.email}) ---`);
        console.log(`Role: ${u.role}`);
        const userPerms = JSON.parse(u.permissions || "[]");
        console.log(`Direct Perms:`, userPerms.filter(p => p.includes('SALES_ESTIMATES')));

        const groupPerms = u.permissionGroup ? JSON.parse(u.permissionGroup.permissions || "[]") : [];
        console.log(`Group Perms (${u.permissionGroup?.name}):`, groupPerms.filter(p => p.includes('SALES_ESTIMATES')));

        const rawPerms = Array.from(new Set([...userPerms, ...groupPerms]));
        console.log(`Raw Merged Perms:`, rawPerms.filter(p => p.includes('SALES_ESTIMATES')));

        const upgradedPerms = new Set();
        for (const p of rawPerms) {
            if (p.endsWith('_VIEW')) {
                upgradedPerms.add(p + '_ALL');
                upgradedPerms.add(p + '_OWN');
            } else {
                upgradedPerms.add(p);
            }
        }
        console.log(`Upgraded Session Perms:`, Array.from(upgradedPerms).filter(p => typeof p === 'string' && p.includes('SALES_ESTIMATES')));
    }
}

checkRBAC().finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { email: 'admin@tsol.vn' },
                { email: 'vu.nd@tsol.vn' },
                { name: { contains: 'Vũ' } }
            ]
        },
        include: { permissionGroup: true }
    });

    for (let u of users) {
        console.log(`\n===============\nUser: ${u.name} | Role: ${u.role}\n===============\n`);
        const groupPerms = u.permissionGroup ? JSON.parse(u.permissionGroup.permissions || "[]") : [];
        console.log('--- Group Perms (' + u.permissionGroup?.name + ') ---');
        console.table(groupPerms.filter(p => typeof p === 'string' && p.includes('SALES_ESTIMATES')));

        const upgradedPerms = new Set();
        for (const p of groupPerms) {
            if (typeof p === 'string' && p.endsWith('_VIEW')) {
                upgradedPerms.add(p + '_ALL');
                upgradedPerms.add(p + '_OWN');
            } else {
                upgradedPerms.add(p);
            }
        }

        console.log('--- Processed authOptions (Token Logic) ---');
        console.table(Array.from(upgradedPerms).filter(p => typeof p === 'string' && p.includes('SALES_ESTIMATES')));
    }
}
checkUsers().finally(() => prisma.$disconnect());

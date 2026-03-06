const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
    const users = await prisma.user.findMany({
        include: { permissionGroup: true }
    });
    fs.writeFileSync('perms_output.json', JSON.stringify(users.map(u => ({
        email: u.email,
        role: u.role,
        group: u.permissionGroup?.name,
        groupPerms: u.permissionGroup?.permissions,
        userPerms: u.permissions
    })), null, 2), 'utf8');
}
main().finally(() => prisma.$disconnect());

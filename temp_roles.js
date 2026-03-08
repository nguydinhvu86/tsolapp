const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const groups = await prisma.permissionGroup.findMany();
    console.log(JSON.stringify(groups, null, 2));
    const users = await prisma.user.findMany({ select: { name: true, permissionGroupId: true, permissions: true } });
    console.log("Users:", JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

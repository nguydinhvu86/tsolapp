const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Setting MySQL GLOBAL max_allowed_packet to 1GB...");
    await prisma.$executeRawUnsafe('SET GLOBAL max_allowed_packet=1073741824;');
    console.log("Successfully increased max_allowed_packet. Please restart your MySQL server or the connection for the changes to fully apply in all sessions just in case.");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

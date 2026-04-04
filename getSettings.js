const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
async function main() {
    const settings = await prisma.systemSetting.findMany();
    fs.writeFileSync('settings_dump.utf8.json', JSON.stringify(settings, null, 2), 'utf8');
}
main();

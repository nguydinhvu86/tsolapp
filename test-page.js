const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    try {
        console.log("Fetching Projects...");
        const projects = await prisma.project.findMany({
            where: { status: { notIn: ['CANCELLED'] } },
            select: { id: true, title: true, code: true }
        });
        console.log("Projects found:", projects.length);
    } catch(e) {
        fs.writeFileSync('error.txt', e.message, 'utf8');
        console.error("Written to error.txt");
    } finally {
        await prisma.$disconnect();
    }
}
main();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
    try {
        let cat = await prisma.expenseCategory.findFirst();
        if(!cat) {
           cat = await prisma.expenseCategory.create({ data: { name: 'Test' } });
        }
        let user = await prisma.user.findFirst();

        const expense = await prisma.expense.create({
            data: {
                code: "EXP-TEST-002",
                amount: 1000,
                description: "Test",
                categoryId: cat.id,
                creatorId: user.id,
                status: 'COMPLETED'
            }
        });
        console.log("Success:", expense.id);
    } catch(e) {
        fs.writeFileSync('error.txt', e.stack, 'utf8');
        console.error("Error creating:", e.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();

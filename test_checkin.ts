import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const users = await prisma.user.findMany({ select: { id: true, email: true } })
    console.log("Available Users:", users)

    if (users.length > 0) {
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);

        try {
            const record = await prisma.attendanceRecord.create({
                data: {
                    userId: users[0].id,
                    date: todayDate,
                    checkInTime: new Date(),
                    status: 'PRESENT'
                }
            })
            console.log("Created successfully:", record.id)
        } catch (e: any) {
            console.error("Failed to create record:", e.message)
        }
    }
}
main().finally(() => prisma.$disconnect())

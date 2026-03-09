import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const admin = await prisma.user.findFirst({ where: { email: 'admin@example.com' } });
    if (admin) {
        await prisma.leaveRequest.create({
            data: {
                userId: admin.id,
                type: 'ANNUAL_LEAVE',
                startDate: new Date('2026-03-20'),
                endDate: new Date('2026-03-21'),
                reason: 'Test filter and reject note',
                status: 'PENDING',
                imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
            }
        });
        console.log('Created test leave request with image');
    }
}
main().catch(console.error).finally(() => prisma.$disconnect());

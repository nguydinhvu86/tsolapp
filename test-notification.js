const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (admin) {
    await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Th? nghi?m h? th?ng',
        message: 'Ðây là thông báo test d? ki?m tra UI ',
        type: 'SUCCESS',
        link: '/tasks'
      }
    });
    console.log('Test notification created!');
  }
}
main().finally(() => prisma.$disconnect());

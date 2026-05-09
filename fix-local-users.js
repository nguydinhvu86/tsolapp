const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Tìm nhóm quyền Admin...");
    let adminGroup = await prisma.permissionGroup.findFirst({
        where: { name: 'Admin' }
    });

    if (!adminGroup) {
        console.log("Không tìm thấy nhóm Admin, vui lòng chạy node run-seed.js trước.");
        return;
    }

    console.log("Cập nhật tất cả user hiện tại thành ADMIN...");
    const result = await prisma.user.updateMany({
        data: {
            role: 'ADMIN',
            permissionGroupId: adminGroup.id
        }
    });

    console.log(`Đã cập nhật thành công ${result.count} tài khoản thành quyền Admin.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

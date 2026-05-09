const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Đang đảm bảo tồn tại nhóm quyền Admin...");
    
    // Create or find Admin group directly
    let adminGroup = await prisma.permissionGroup.findFirst({
        where: { name: 'Admin' }
    });

    if (!adminGroup) {
        adminGroup = await prisma.permissionGroup.create({
            data: {
                name: 'Admin',
                description: 'Toàn quyền hệ thống (Local Fix)',
                permissions: JSON.stringify(["*"]), // Just stringified array if any strict checks exist
                isSystem: true
            }
        });
        console.log("Đã tạo nhóm quyền Admin khôi phục.");
    }

    console.log("Đang cập nhật toàn bộ tài khoản thành ADMIN...");
    const result = await prisma.user.updateMany({
        data: {
            role: 'ADMIN',
            permissionGroupId: adminGroup.id,
            permissions: JSON.stringify([]) 
        }
    });

    console.log(`Đã cập nhật thành công ${result.count} tài khoản thành quyền Admin.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

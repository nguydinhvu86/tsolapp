const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      permissionGroup: {
        select: {
          name: true,
          isSystem: true
        }
      }
    }
  });
  console.log("USERS:", JSON.stringify(users, null, 2));

  const groups = await prisma.permissionGroup.findMany({
    select: {
      name: true,
      isSystem: true,
      permissions: true
    }
  });
  console.log("GROUPS:", JSON.stringify(groups, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const sql = `
        CREATE TABLE IF NOT EXISTS company_announcements (
            id VARCHAR(191) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
            isUrgent BOOLEAN NOT NULL DEFAULT FALSE,
            isPinned BOOLEAN NOT NULL DEFAULT FALSE,
            authorId VARCHAR(191) NULL,
            authorName VARCHAR(191) NULL,
            viewsCount INT NOT NULL DEFAULT 0,
            createdAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            updatedAt DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            INDEX idx_urgent_created (isUrgent, createdAt)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;
    await prisma.$executeRawUnsafe(sql);
    console.log('company_announcements table created or already exists!');

    // Check count
    const count = await prisma.$queryRawUnsafe('SELECT COUNT(*) as cnt FROM company_announcements');
    console.log('Row count:', count);
}

main().catch(console.error).finally(() => prisma.$disconnect());

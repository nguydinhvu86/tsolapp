const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Đang kiểm tra và áp dụng cập nhật Database cho Leaderboard & Social Wall ---');

    try {
        // 1. Create LeaderboardPost table if not exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS \`LeaderboardPost\` (
                \`id\` VARCHAR(191) NOT NULL,
                \`authorId\` VARCHAR(191) NOT NULL,
                \`content\` TEXT NOT NULL,
                \`images\` TEXT NULL,
                \`type\` VARCHAR(191) NOT NULL DEFAULT 'USER_POST',
                \`isPinned\` BOOLEAN NOT NULL DEFAULT false,
                \`metadata\` TEXT NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updatedAt\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`LeaderboardPost_authorId_idx\`(\`authorId\`),
                INDEX \`LeaderboardPost_createdAt_idx\`(\`createdAt\`),
                INDEX \`LeaderboardPost_isPinned_idx\`(\`isPinned\`),
                CONSTRAINT \`LeaderboardPost_authorId_fkey\` FOREIGN KEY (\`authorId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Bảng LeaderboardPost đã sẵn sàng.');

        // 2. Create LeaderboardReaction table if not exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS \`LeaderboardReaction\` (
                \`id\` VARCHAR(191) NOT NULL,
                \`postId\` VARCHAR(191) NOT NULL,
                \`userId\` VARCHAR(191) NOT NULL,
                \`emoji\` VARCHAR(191) NOT NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (\`id\`),
                UNIQUE INDEX \`LeaderboardReaction_postId_userId_emoji_key\`(\`postId\`, \`userId\`, \`emoji\`),
                INDEX \`LeaderboardReaction_postId_idx\`(\`postId\`),
                INDEX \`LeaderboardReaction_userId_idx\`(\`userId\`),
                CONSTRAINT \`LeaderboardReaction_postId_fkey\` FOREIGN KEY (\`postId\`) REFERENCES \`LeaderboardPost\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`LeaderboardReaction_userId_fkey\` FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Bảng LeaderboardReaction đã sẵn sàng.');

        // 3. Create LeaderboardComment table if not exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS \`LeaderboardComment\` (
                \`id\` VARCHAR(191) NOT NULL,
                \`postId\` VARCHAR(191) NOT NULL,
                \`authorId\` VARCHAR(191) NOT NULL,
                \`parentId\` VARCHAR(191) NULL,
                \`content\` TEXT NOT NULL,
                \`image\` TEXT NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                \`updatedAt\` DATETIME(3) NOT NULL,
                PRIMARY KEY (\`id\`),
                INDEX \`LeaderboardComment_postId_idx\`(\`postId\`),
                INDEX \`LeaderboardComment_authorId_idx\`(\`authorId\`),
                INDEX \`LeaderboardComment_parentId_idx\`(\`parentId\`),
                CONSTRAINT \`LeaderboardComment_postId_fkey\` FOREIGN KEY (\`postId\`) REFERENCES \`LeaderboardPost\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`LeaderboardComment_authorId_fkey\` FOREIGN KEY (\`authorId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`LeaderboardComment_parentId_fkey\` FOREIGN KEY (\`parentId\`) REFERENCES \`LeaderboardComment\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Bảng LeaderboardComment đã sẵn sàng.');

        // 4. Create LeaderboardMention table if not exists
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS \`LeaderboardMention\` (
                \`id\` VARCHAR(191) NOT NULL,
                \`postId\` VARCHAR(191) NULL,
                \`commentId\` VARCHAR(191) NULL,
                \`mentionedUserId\` VARCHAR(191) NOT NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                PRIMARY KEY (\`id\`),
                INDEX \`LeaderboardMention_mentionedUserId_idx\`(\`mentionedUserId\`),
                INDEX \`LeaderboardMention_postId_idx\`(\`postId\`),
                INDEX \`LeaderboardMention_commentId_idx\`(\`commentId\`),
                CONSTRAINT \`LeaderboardMention_postId_fkey\` FOREIGN KEY (\`postId\`) REFERENCES \`LeaderboardPost\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`LeaderboardMention_commentId_fkey\` FOREIGN KEY (\`commentId\`) REFERENCES \`LeaderboardComment\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT \`LeaderboardMention_mentionedUserId_fkey\` FOREIGN KEY (\`mentionedUserId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
        console.log('✅ Bảng LeaderboardMention đã sẵn sàng.');

        console.log('🎉 Toàn bộ cơ sở dữ liệu cho Leaderboard đã được thiết lập an toàn.');
    } catch (err) {
        console.error('❌ Lỗi khi cập nhật cơ sở dữ liệu:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();

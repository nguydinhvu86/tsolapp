CREATE TABLE IF NOT EXISTS `PurchaseBillActivityLog` (
    `id` VARCHAR(191) NOT NULL,
    `billId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `details` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`),
    CONSTRAINT `PurchaseBillActivityLog_billId_fkey` FOREIGN KEY (`billId`) REFERENCES `PurchaseBill`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `PurchaseBillActivityLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

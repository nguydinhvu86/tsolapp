/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Customer` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resetToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customerMenuOrder` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sidebarOrder` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `contract` ADD COLUMN `creatorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `handover` ADD COLUMN `creatorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `lead` ADD COLUMN `creatorId` VARCHAR(191) NULL,
    ADD COLUMN `sourceId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `paymentrequest` ADD COLUMN `creatorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `permissiongroup` ALTER COLUMN `permissions` DROP DEFAULT;

-- AlterTable
ALTER TABLE `quote` ADD COLUMN `creatorId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `salesestimate` ADD COLUMN `leadId` VARCHAR(191) NULL,
    ADD COLUMN `salespersonId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `salesinvoice` ADD COLUMN `salespersonId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `task` ADD COLUMN `estimatedDuration` VARCHAR(191) NULL,
    ADD COLUMN `estimatedValue` DOUBLE NULL DEFAULT 0,
    ADD COLUMN `isProject` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `startDate` DATETIME(3) NULL,
    ADD COLUMN `tags` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `taskattachment` MODIFY `fileUrl` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `taskcomment` MODIFY `content` LONGTEXT NOT NULL,
    MODIFY `images` LONGTEXT NULL,
    MODIFY `files` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `user` ADD COLUMN `currentPlatform` VARCHAR(191) NULL,
    ADD COLUMN `customerMenuOrder` TEXT NOT NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lastActiveAt` DATETIME(3) NULL,
    ADD COLUMN `lastLoginAt` DATETIME(3) NULL,
    ADD COLUMN `resetToken` VARCHAR(191) NULL,
    ADD COLUMN `resetTokenExpiry` DATETIME(3) NULL,
    ADD COLUMN `shiftConfigId` VARCHAR(191) NULL,
    ADD COLUMN `sidebarOrder` TEXT NOT NULL,
    ALTER COLUMN `permissions` DROP DEFAULT,
    ALTER COLUMN `dashboardConfig` DROP DEFAULT;

-- CreateTable
CREATE TABLE `CustomerContact` (
    `id` VARCHAR(191) NOT NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `position` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `otherPhone` VARCHAR(191) NULL,
    `birthday` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadAssignee` (
    `leadId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`leadId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadComment` (
    `id` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `leadId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `images` LONGTEXT NULL,
    `files` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadSource` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `customerId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LeadSource_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadForm` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `source` VARCHAR(191) NOT NULL DEFAULT 'Website',
    `successMessage` VARCHAR(191) NULL,
    `assigneeId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatRoom` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `isGroup` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `lastRead` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ChatParticipant_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ChatMessage` (
    `id` VARCHAR(191) NOT NULL,
    `roomId` VARCHAR(191) NOT NULL,
    `senderId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `attachmentUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ShiftConfig` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `startTime` VARCHAR(191) NOT NULL DEFAULT '08:00',
    `endTime` VARCHAR(191) NOT NULL DEFAULT '17:00',
    `lunchStart` VARCHAR(191) NOT NULL DEFAULT '12:00',
    `lunchEnd` VARCHAR(191) NOT NULL DEFAULT '13:00',
    `lateThreshold` INTEGER NOT NULL DEFAULT 0,
    `earlyThreshold` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendanceRecord` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `checkInTime` DATETIME(3) NULL,
    `checkInPhotoUrl` LONGTEXT NULL,
    `checkInLocation` VARCHAR(191) NULL,
    `checkOutTime` DATETIME(3) NULL,
    `checkOutPhotoUrl` LONGTEXT NULL,
    `checkOutLocation` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PRESENT',
    `notes` VARCHAR(191) NULL,
    `totalWorkMinutes` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `AttendanceRecord_userId_date_key`(`userId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeaveRequest` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `imageUrl` LONGTEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
    `approverId` VARCHAR(191) NULL,
    `approverNote` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentCategory` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `fileUrl` TEXT NULL,
    `fileType` VARCHAR(191) NULL,
    `thumbnail` TEXT NULL,
    `size` INTEGER NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `categoryId` VARCHAR(191) NULL,
    `creatorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentComment` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DocumentNote` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `pageNumber` INTEGER NULL,
    `videoTime` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LoginLog` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `platform` VARCHAR(191) NULL,
    `loginAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_CustomerManagers` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_CustomerManagers_AB_unique`(`A`, `B`),
    INDEX `_CustomerManagers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_DispatchManagers` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_DispatchManagers_AB_unique`(`A`, `B`),
    INDEX `_DispatchManagers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_SalesEstimateManagers` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SalesEstimateManagers_AB_unique`(`A`, `B`),
    INDEX `_SalesEstimateManagers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_SalesInvoiceManagers` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_SalesInvoiceManagers_AB_unique`(`A`, `B`),
    INDEX `_SalesInvoiceManagers_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Customer_email_key` ON `Customer`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `Lead_email_key` ON `Lead`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `User_resetToken_key` ON `User`(`resetToken`);

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_shiftConfigId_fkey` FOREIGN KEY (`shiftConfigId`) REFERENCES `ShiftConfig`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomerContact` ADD CONSTRAINT `CustomerContact_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contract` ADD CONSTRAINT `Contract_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Quote` ADD CONSTRAINT `Quote_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Handover` ADD CONSTRAINT `Handover_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PaymentRequest` ADD CONSTRAINT `PaymentRequest_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesEstimate` ADD CONSTRAINT `SalesEstimate_salespersonId_fkey` FOREIGN KEY (`salespersonId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesEstimate` ADD CONSTRAINT `SalesEstimate_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SalesInvoice` ADD CONSTRAINT `SalesInvoice_salespersonId_fkey` FOREIGN KEY (`salespersonId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `LeadSource`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Lead` ADD CONSTRAINT `Lead_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadAssignee` ADD CONSTRAINT `LeadAssignee_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadAssignee` ADD CONSTRAINT `LeadAssignee_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadComment` ADD CONSTRAINT `LeadComment_leadId_fkey` FOREIGN KEY (`leadId`) REFERENCES `Lead`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadComment` ADD CONSTRAINT `LeadComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadSource` ADD CONSTRAINT `LeadSource_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `Customer`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeadForm` ADD CONSTRAINT `LeadForm_assigneeId_fkey` FOREIGN KEY (`assigneeId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatParticipant` ADD CONSTRAINT `ChatParticipant_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatParticipant` ADD CONSTRAINT `ChatParticipant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `ChatRoom`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ChatMessage` ADD CONSTRAINT `ChatMessage_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceRecord` ADD CONSTRAINT `AttendanceRecord_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LeaveRequest` ADD CONSTRAINT `LeaveRequest_approverId_fkey` FOREIGN KEY (`approverId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentCategory` ADD CONSTRAINT `DocumentCategory_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `DocumentCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `DocumentCategory`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_creatorId_fkey` FOREIGN KEY (`creatorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentComment` ADD CONSTRAINT `DocumentComment_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentComment` ADD CONSTRAINT `DocumentComment_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentComment` ADD CONSTRAINT `DocumentComment_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `DocumentComment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentNote` ADD CONSTRAINT `DocumentNote_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `Document`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DocumentNote` ADD CONSTRAINT `DocumentNote_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LoginLog` ADD CONSTRAINT `LoginLog_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CustomerManagers` ADD CONSTRAINT `_CustomerManagers_A_fkey` FOREIGN KEY (`A`) REFERENCES `Customer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_CustomerManagers` ADD CONSTRAINT `_CustomerManagers_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DispatchManagers` ADD CONSTRAINT `_DispatchManagers_A_fkey` FOREIGN KEY (`A`) REFERENCES `Dispatch`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_DispatchManagers` ADD CONSTRAINT `_DispatchManagers_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SalesEstimateManagers` ADD CONSTRAINT `_SalesEstimateManagers_A_fkey` FOREIGN KEY (`A`) REFERENCES `SalesEstimate`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SalesEstimateManagers` ADD CONSTRAINT `_SalesEstimateManagers_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SalesInvoiceManagers` ADD CONSTRAINT `_SalesInvoiceManagers_A_fkey` FOREIGN KEY (`A`) REFERENCES `SalesInvoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_SalesInvoiceManagers` ADD CONSTRAINT `_SalesInvoiceManagers_B_fkey` FOREIGN KEY (`B`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

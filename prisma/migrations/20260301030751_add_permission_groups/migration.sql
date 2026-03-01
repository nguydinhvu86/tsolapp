-- AlterTable
ALTER TABLE `user` ADD COLUMN `permissionGroupId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `PermissionGroup` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `permissions` VARCHAR(191) NOT NULL DEFAULT '[]',
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PermissionGroup_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `User` ADD CONSTRAINT `User_permissionGroupId_fkey` FOREIGN KEY (`permissionGroupId`) REFERENCES `PermissionGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

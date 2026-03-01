-- AlterTable
ALTER TABLE `contract` MODIFY `content` LONGTEXT NOT NULL,
    MODIFY `variables` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `contractappendix` MODIFY `content` LONGTEXT NOT NULL,
    MODIFY `variables` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `contractappendixtemplate` MODIFY `description` TEXT NULL,
    MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `contracttemplate` MODIFY `description` TEXT NULL,
    MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `dispatch` MODIFY `content` LONGTEXT NOT NULL,
    MODIFY `variables` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `dispatchtemplate` MODIFY `description` TEXT NULL,
    MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `handover` MODIFY `content` LONGTEXT NOT NULL,
    MODIFY `variables` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `handovertemplate` MODIFY `description` TEXT NULL,
    MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `inventorytransaction` MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `paymentrequest` MODIFY `content` LONGTEXT NOT NULL,
    MODIFY `variables` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `paymentrequesttemplate` MODIFY `description` TEXT NULL,
    MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `permissiongroup` MODIFY `description` TEXT NULL,
    MODIFY `permissions` TEXT NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE `product` MODIFY `description` TEXT NULL,
    MODIFY `notes` TEXT NULL;

-- AlterTable
ALTER TABLE `quote` MODIFY `content` LONGTEXT NOT NULL,
    MODIFY `variables` TEXT NOT NULL;

-- AlterTable
ALTER TABLE `quotetemplate` MODIFY `description` TEXT NULL,
    MODIFY `content` LONGTEXT NOT NULL;

-- AlterTable
ALTER TABLE `systemsetting` MODIFY `value` TEXT NOT NULL,
    MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `task` MODIFY `description` TEXT NULL;

-- AlterTable
ALTER TABLE `taskactivitylog` MODIFY `details` TEXT NULL;

-- AlterTable
ALTER TABLE `taskcomment` MODIFY `content` TEXT NOT NULL,
    MODIFY `images` TEXT NULL,
    MODIFY `files` TEXT NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `permissions` TEXT NOT NULL DEFAULT '[]';

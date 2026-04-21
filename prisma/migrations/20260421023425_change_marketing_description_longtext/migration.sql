-- AlterTable
ALTER TABLE `marketingcampaign` ADD COLUMN `eventTime` TEXT NULL,
    ADD COLUMN `location` TEXT NULL,
    MODIFY `description` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `marketingcategory` MODIFY `description` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `marketingform` MODIFY `description` LONGTEXT NULL,
    ALTER COLUMN `fieldsConfig` DROP DEFAULT;

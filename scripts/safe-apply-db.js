const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumnIfNotExists(table, column, definition) {
    try {
        const checkSql = `
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = '${table}' 
              AND COLUMN_NAME = '${column}';
        `;
        const result = await prisma.$queryRawUnsafe(checkSql);
        if (result && result.length > 0) {
            console.log(`- Cột ${table}.${column} đã tồn tại.`);
            return;
        }

        const alterSql = `ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition};`;
        await prisma.$executeRawUnsafe(alterSql);
        console.log(`✅ Đã thêm cột ${table}.${column} thành công.`);
    } catch (err) {
        console.error(`❌ Lỗi khi thêm cột ${table}.${column}:`, err.message);
    }
}

async function addUniqueIndexIfNotExists(table, column, indexName) {
    try {
        const checkSql = `
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = '${table}' 
              AND INDEX_NAME = '${indexName}';
        `;
        const result = await prisma.$queryRawUnsafe(checkSql);
        if (result && result.length > 0) {
            console.log(`- Index ${indexName} đã tồn tại trên bảng ${table}.`);
            return;
        }

        const createIndexSql = `CREATE UNIQUE INDEX \`${indexName}\` ON \`${table}\`(\`${column}\`);`;
        await prisma.$executeRawUnsafe(createIndexSql);
        console.log(`✅ Đã tạo unique index ${indexName} trên ${table}.${column}.`);
    } catch (err) {
        console.warn(`⚠️ Chú ý về index ${indexName}:`, err.message);
    }
}

async function main() {
    console.log('--- Đang kiểm tra và áp dụng cập nhật Database (Bảo toàn 100% dữ liệu hiện có) ---');
    
    // 1. Create PurchaseBillActivityLog table if not exists
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`PurchaseBillActivityLog\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`billId\` VARCHAR(191) NOT NULL,
            \`userId\` VARCHAR(191) NOT NULL,
            \`action\` VARCHAR(191) NOT NULL,
            \`details\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`PurchaseBillActivityLog_billId_idx\` (\`billId\`),
            INDEX \`PurchaseBillActivityLog_userId_idx\` (\`userId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // 1b. Create SalesEstimateNote table if not exists
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`SalesEstimateNote\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`estimateId\` VARCHAR(191) NOT NULL,
            \`userId\` VARCHAR(191) NOT NULL,
            \`content\` TEXT NOT NULL,
            \`attachment\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`SalesEstimateNote_estimateId_idx\` (\`estimateId\`),
            INDEX \`SalesEstimateNote_userId_idx\` (\`userId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // 2. Create Project tables if not exist
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`Project\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`code\` VARCHAR(191) NOT NULL,
            \`name\` VARCHAR(191) NOT NULL,
            \`description\` TEXT NULL,
            \`type\` VARCHAR(191) NOT NULL DEFAULT 'IMPLEMENTATION',
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'PLANNING',
            \`priority\` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
            \`startDate\` DATETIME(3) NULL,
            \`dueDate\` DATETIME(3) NULL,
            \`estimatedValue\` DOUBLE NOT NULL DEFAULT 0,
            \`estimatedDuration\` VARCHAR(191) NULL,
            \`budget\` DOUBLE NOT NULL DEFAULT 0,
            \`tags\` VARCHAR(191) NULL,
            \`customerId\` VARCHAR(191) NULL,
            \`contractId\` VARCHAR(191) NULL,
            \`quoteId\` VARCHAR(191) NULL,
            \`invoiceId\` VARCHAR(191) NULL,
            \`salesEstimateId\` VARCHAR(191) NULL,
            \`salesOrderId\` VARCHAR(191) NULL,
            \`creatorId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            UNIQUE INDEX \`Project_code_key\` (\`code\`),
            PRIMARY KEY (\`id\`),
            INDEX \`Project_status_idx\` (\`status\`),
            INDEX \`Project_customerId_idx\` (\`customerId\`),
            INDEX \`Project_creatorId_idx\` (\`creatorId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProjectTopic\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`projectId\` VARCHAR(191) NOT NULL,
            \`creatorId\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(191) NOT NULL,
            \`content\` LONGTEXT NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProjectComment\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`projectId\` VARCHAR(191) NOT NULL,
            \`topicId\` VARCHAR(191) NULL,
            \`userId\` VARCHAR(191) NOT NULL,
            \`content\` LONGTEXT NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProjectCommentReaction\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`commentId\` VARCHAR(191) NOT NULL,
            \`userId\` VARCHAR(191) NOT NULL,
            \`emoji\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX \`ProjectCommentReaction_commentId_userId_emoji_key\` (\`commentId\`, \`userId\`, \`emoji\`),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProjectAttachment\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`projectId\` VARCHAR(191) NOT NULL,
            \`fileName\` VARCHAR(191) NOT NULL,
            \`fileUrl\` LONGTEXT NOT NULL,
            \`fileType\` VARCHAR(191) NULL,
            \`uploadedById\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProjectMember\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`projectId\` VARCHAR(191) NOT NULL,
            \`userId\` VARCHAR(191) NOT NULL,
            \`role\` VARCHAR(191) NOT NULL DEFAULT 'MEMBER',
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX \`ProjectMember_projectId_userId_key\` (\`projectId\`, \`userId\`),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`Milestone\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`name\` VARCHAR(191) NOT NULL,
            \`description\` TEXT NULL,
            \`dueDate\` DATETIME(3) NULL,
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
            \`projectId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProjectRisk\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`projectId\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(191) NOT NULL,
            \`description\` TEXT NULL,
            \`probability\` INT NOT NULL DEFAULT 50,
            \`impact\` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
            \`creatorId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProjectActivityLog\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`projectId\` VARCHAR(191) NOT NULL,
            \`userId\` VARCHAR(191) NOT NULL,
            \`action\` VARCHAR(191) NOT NULL,
            \`details\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProjectIssue\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`projectId\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(191) NOT NULL,
            \`description\` TEXT NULL,
            \`severity\` VARCHAR(191) NOT NULL DEFAULT 'AMBER',
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'OPEN',
            \`mitigationPlan\` TEXT NULL,
            \`reportedById\` VARCHAR(191) NOT NULL,
            \`assignedToId\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Các bảng Project Module đã sẵn sàng.');

    // 2.1 Create SystemAttachment and UnifiedActivityLog tables
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`SystemAttachment\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`fileName\` VARCHAR(191) NOT NULL,
            \`fileUrl\` LONGTEXT NOT NULL,
            \`fileType\` VARCHAR(191) NULL,
            \`fileSize\` INT NULL DEFAULT 0,
            \`entityType\` VARCHAR(191) NOT NULL,
            \`entityId\` VARCHAR(191) NOT NULL,
            \`notes\` TEXT NULL,
            \`uploadedById\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`SystemAttachment_entityType_entityId_idx\` (\`entityType\`, \`entityId\`),
            INDEX \`SystemAttachment_uploadedById_idx\` (\`uploadedById\`),
            INDEX \`SystemAttachment_createdAt_idx\` (\`createdAt\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`UnifiedActivityLog\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`entityType\` VARCHAR(191) NOT NULL,
            \`entityId\` VARCHAR(191) NOT NULL,
            \`userId\` VARCHAR(191) NULL,
            \`action\` VARCHAR(191) NOT NULL,
            \`details\` TEXT NULL,
            \`oldData\` LONGTEXT NULL,
            \`newData\` LONGTEXT NULL,
            \`ipAddress\` VARCHAR(191) NULL,
            \`userAgent\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`UnifiedActivityLog_entityType_entityId_createdAt_idx\` (\`entityType\`, \`entityId\`, \`createdAt\`),
            INDEX \`UnifiedActivityLog_userId_createdAt_idx\` (\`userId\`, \`createdAt\`),
            INDEX \`UnifiedActivityLog_action_idx\` (\`action\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProductUnitConversion\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`productId\` VARCHAR(191) NOT NULL,
            \`unitName\` VARCHAR(191) NOT NULL,
            \`conversionRate\` DOUBLE NOT NULL,
            \`isBaseUnit\` BOOLEAN NOT NULL DEFAULT false,
            \`salePrice\` DOUBLE NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`ProductUnitConversion_productId_unitName_key\` (\`productId\`, \`unitName\`),
            INDEX \`ProductUnitConversion_productId_idx\` (\`productId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ProductSerial\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`productId\` VARCHAR(191) NOT NULL,
            \`serialNumber\` VARCHAR(191) NOT NULL,
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'IN_STOCK',
            \`warehouseId\` VARCHAR(191) NULL,
            \`purchaseBillId\` VARCHAR(191) NULL,
            \`salesInvoiceId\` VARCHAR(191) NULL,
            \`customerId\` VARCHAR(191) NULL,
            \`warrantyEndDate\` DATETIME(3) NULL,
            \`notes\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`ProductSerial_serialNumber_key\` (\`serialNumber\`),
            INDEX \`ProductSerial_productId_status_idx\` (\`productId\`, \`status\`),
            INDEX \`ProductSerial_customerId_idx\` (\`customerId\`),
            INDEX \`ProductSerial_salesInvoiceId_idx\` (\`salesInvoiceId\`),
            INDEX \`ProductSerial_purchaseBillId_idx\` (\`purchaseBillId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // 2.2 Create Double-Entry Accounting & Approval Workflow tables
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ChartOfAccount\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`code\` VARCHAR(191) NOT NULL,
            \`name\` VARCHAR(191) NOT NULL,
            \`type\` VARCHAR(191) NOT NULL,
            \`parentCode\` VARCHAR(191) NULL,
            \`level\` INT NOT NULL DEFAULT 1,
            \`balance\` DOUBLE NOT NULL DEFAULT 0,
            \`isActive\` BOOLEAN NOT NULL DEFAULT true,
            \`description\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`ChartOfAccount_code_key\` (\`code\`),
            INDEX \`ChartOfAccount_type_idx\` (\`type\`),
            INDEX \`ChartOfAccount_parentCode_idx\` (\`parentCode\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`JournalEntry\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`entryNumber\` VARCHAR(191) NOT NULL,
            \`date\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`description\` TEXT NOT NULL,
            \`refType\` VARCHAR(191) NULL,
            \`refId\` VARCHAR(191) NULL,
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'POSTED',
            \`totalDebit\` DOUBLE NOT NULL DEFAULT 0,
            \`totalCredit\` DOUBLE NOT NULL DEFAULT 0,
            \`creatorId\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`JournalEntry_entryNumber_key\` (\`entryNumber\`),
            INDEX \`JournalEntry_refType_refId_idx\` (\`refType\`, \`refId\`),
            INDEX \`JournalEntry_status_idx\` (\`status\`),
            INDEX \`JournalEntry_date_idx\` (\`date\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`JournalEntryLine\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`entryId\` VARCHAR(191) NOT NULL,
            \`accountCode\` VARCHAR(191) NOT NULL,
            \`debitAmount\` DOUBLE NOT NULL DEFAULT 0,
            \`creditAmount\` DOUBLE NOT NULL DEFAULT 0,
            \`description\` TEXT NULL,
            \`partnerType\` VARCHAR(191) NULL,
            \`partnerId\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`JournalEntryLine_entryId_idx\` (\`entryId\`),
            INDEX \`JournalEntryLine_accountCode_idx\` (\`accountCode\`),
            INDEX \`JournalEntryLine_partnerType_partnerId_idx\` (\`partnerType\`, \`partnerId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ApprovalRule\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`name\` VARCHAR(191) NOT NULL,
            \`entityType\` VARCHAR(191) NOT NULL,
            \`minAmount\` DOUBLE NOT NULL DEFAULT 0,
            \`maxAmount\` DOUBLE NULL,
            \`requiredRole\` VARCHAR(191) NOT NULL,
            \`stepOrder\` INT NOT NULL DEFAULT 1,
            \`isEnabled\` BOOLEAN NOT NULL DEFAULT true,
            \`description\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`ApprovalRule_entityType_isEnabled_idx\` (\`entityType\`, \`isEnabled\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ApprovalRequest\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`entityType\` VARCHAR(191) NOT NULL,
            \`entityId\` VARCHAR(191) NOT NULL,
            \`title\` VARCHAR(191) NOT NULL,
            \`requestedAmount\` DOUBLE NOT NULL DEFAULT 0,
            \`currentStep\` INT NOT NULL DEFAULT 1,
            \`totalSteps\` INT NOT NULL DEFAULT 1,
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
            \`requestedById\` VARCHAR(191) NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`ApprovalRequest_entityType_entityId_idx\` (\`entityType\`, \`entityId\`),
            INDEX \`ApprovalRequest_status_idx\` (\`status\`),
            INDEX \`ApprovalRequest_requestedById_idx\` (\`requestedById\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ApprovalStepLog\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`requestId\` VARCHAR(191) NOT NULL,
            \`stepOrder\` INT NOT NULL,
            \`approverId\` VARCHAR(191) NULL,
            \`status\` VARCHAR(191) NOT NULL,
            \`notes\` TEXT NULL,
            \`actedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`ApprovalStepLog_requestId_idx\` (\`requestId\`),
            INDEX \`ApprovalStepLog_approverId_idx\` (\`approverId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // 2.3 Create Omni-Channel CRM & Zalo ZNS tables
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ZnsTemplate\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`templateId\` VARCHAR(191) NOT NULL,
            \`templateName\` VARCHAR(191) NOT NULL,
            \`templateType\` VARCHAR(191) NOT NULL DEFAULT 'TRANSACTIONAL',
            \`content\` TEXT NOT NULL,
            \`pricePerMessage\` DOUBLE NOT NULL DEFAULT 300,
            \`isEnabled\` BOOLEAN NOT NULL DEFAULT true,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`ZnsTemplate_templateId_key\` (\`templateId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`ZnsLog\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`recipientPhone\` VARCHAR(191) NOT NULL,
            \`recipientName\` VARCHAR(191) NULL,
            \`templateId\` VARCHAR(191) NOT NULL,
            \`dataPayload\` TEXT NOT NULL,
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'DELIVERED',
            \`trackingId\` VARCHAR(191) NULL,
            \`errorCode\` VARCHAR(191) NULL,
            \`errorMessage\` TEXT NULL,
            \`sentAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            UNIQUE INDEX \`ZnsLog_trackingId_key\` (\`trackingId\`),
            INDEX \`ZnsLog_recipientPhone_idx\` (\`recipientPhone\`),
            INDEX \`ZnsLog_status_idx\` (\`status\`),
            INDEX \`ZnsLog_sentAt_idx\` (\`sentAt\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
    console.log('✅ Các bảng Storage Vault, WMS, Accounting, Workflow & Omni-Channel CRM đã sẵn sàng.');

    // 3. Customer fields
    await addColumnIfNotExists('Customer', 'code', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'shortName', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'internationalName', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'taxStatus', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'contactName', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'website', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'businessType', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'bankAccount', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'bankName', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'bankBranch', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'billingAddress', 'VARCHAR(500) NULL');
    await addColumnIfNotExists('Customer', 'shippingAddress', 'VARCHAR(500) NULL');
    await addColumnIfNotExists('Customer', 'paymentTerms', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Customer', 'creditLimit', 'DOUBLE NULL DEFAULT 0');
    await addColumnIfNotExists('Customer', 'internalNotes', 'TEXT NULL');

    // 4. Supplier fields
    await addColumnIfNotExists('Supplier', 'shortName', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'internationalName', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'taxStatus', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'bankBranch', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'billingAddress', 'VARCHAR(500) NULL');
    await addColumnIfNotExists('Supplier', 'shippingAddress', 'VARCHAR(500) NULL');
    await addColumnIfNotExists('Supplier', 'paymentTerms', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'creditLimit', 'DOUBLE NULL DEFAULT 0');

    // 4.1. PurchasePayment fields
    await addColumnIfNotExists('PurchasePayment', 'status', "VARCHAR(191) NOT NULL DEFAULT 'COMPLETED'");

    // 4b. LeaveRequest extended fields
    await addColumnIfNotExists('LeaveRequest', 'duration', "VARCHAR(191) NOT NULL DEFAULT 'FULL_DAY'");
    await addColumnIfNotExists('LeaveRequest', 'totalDays', "DOUBLE NOT NULL DEFAULT 1");
    await addColumnIfNotExists('LeaveRequest', 'handoverTo', "VARCHAR(191) NULL");
    await addColumnIfNotExists('LeaveRequest', 'handoverUserId', "VARCHAR(191) NULL");
    await addColumnIfNotExists('LeaveRequest', 'contactPhone', "VARCHAR(191) NULL");

    // 4b. Payroll table additions
    await addColumnIfNotExists('Payroll', 'allowances', "DOUBLE NOT NULL DEFAULT 0");
    await addColumnIfNotExists('Payroll', 'commissionBonus', "DOUBLE NOT NULL DEFAULT 0");
    await addColumnIfNotExists('Payroll', 'otSalary', "DOUBLE NOT NULL DEFAULT 0");
    await addColumnIfNotExists('Payroll', 'advancePayment', "DOUBLE NOT NULL DEFAULT 0");
    await addColumnIfNotExists('Payroll', 'insuranceDeduction', "DOUBLE NOT NULL DEFAULT 0");
    await addColumnIfNotExists('Payroll', 'taxDeduction', "DOUBLE NOT NULL DEFAULT 0");
    await addColumnIfNotExists('Payroll', 'notes', "TEXT NULL");
    await addColumnIfNotExists('Payroll', 'paymentDate', "DATETIME(3) NULL");
    await addColumnIfNotExists('Payroll', 'paidByUserId', "VARCHAR(191) NULL");

    // 4b. EmployeeProfile extended fields
    await addColumnIfNotExists('EmployeeProfile', 'employeeCode', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'identityDate', "DATETIME(3) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'identityPlace', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'bankBranch', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'placeOfOrigin', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'permanentAddress', "TEXT NULL");
    await addColumnIfNotExists('EmployeeProfile', 'currentAddress', "TEXT NULL");
    await addColumnIfNotExists('EmployeeProfile', 'personalEmail', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'nationality', "VARCHAR(191) NOT NULL DEFAULT 'Việt Nam'");
    await addColumnIfNotExists('EmployeeProfile', 'ethnicity', "VARCHAR(191) NOT NULL DEFAULT 'Kinh'");
    await addColumnIfNotExists('EmployeeProfile', 'maritalStatus', "VARCHAR(191) NOT NULL DEFAULT 'SINGLE'");
    await addColumnIfNotExists('EmployeeProfile', 'emergencyContact', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'emergencyPhone', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'employmentStatus', "VARCHAR(191) NOT NULL DEFAULT 'OFFICIAL'");
    await addColumnIfNotExists('EmployeeProfile', 'workLocation', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'probationEndDate', "DATETIME(3) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'officialStartDate', "DATETIME(3) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'resignationDate', "DATETIME(3) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'insuranceSalary', "DOUBLE NOT NULL DEFAULT 0");
    await addColumnIfNotExists('EmployeeProfile', 'allowances', "DOUBLE NOT NULL DEFAULT 0");
    await addColumnIfNotExists('EmployeeProfile', 'socialInsuranceNumber', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'healthInsuranceCardNumber', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'healthInsurancePlace', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'educationLevel', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'major', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'schoolName', "VARCHAR(191) NULL");
    await addColumnIfNotExists('EmployeeProfile', 'graduationYear', "INT NULL");

    // 4c. Task fields
    await addColumnIfNotExists('Task', 'purchaseOrderId', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Task', 'purchaseBillId', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Task', 'purchasePaymentId', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Task', 'salesEstimateId', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Task', 'salesOrderId', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Task', 'salesInvoiceId', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Task', 'salesPaymentId', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Task', 'marketingCampaignId', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Task', 'ecatalogId', 'VARCHAR(191) NULL');

    // 5. Auto-populate customer codes for existing customers without code
    const existingCustomers = await prisma.customer.findMany({ where: { code: null } });
    if (existingCustomers.length > 0) {
        console.log(`Tìm thấy ${existingCustomers.length} khách hàng chưa có mã. Đang tạo mã KH-xxxx...`);
        for (let i = 0; i < existingCustomers.length; i++) {
            const cust = existingCustomers[i];
            const newCode = `KH-${(i + 1).toString().padStart(4, '0')}`;
            await prisma.customer.update({
                where: { id: cust.id },
                data: { code: newCode }
            });
        }
    }

    // 6. Add unique index for Customer.code
    await addUniqueIndexIfNotExists('Customer', 'code', 'Customer_code_key');

    // 7. FinanceAccount & CashTransaction tables (Accounting Module)
    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`FinanceAccount\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`code\` VARCHAR(191) NOT NULL,
            \`name\` VARCHAR(191) NOT NULL,
            \`type\` VARCHAR(191) NOT NULL DEFAULT 'BANK',
            \`accountNumber\` VARCHAR(191) NULL,
            \`bankName\` VARCHAR(191) NULL,
            \`branch\` VARCHAR(191) NULL,
            \`currency\` VARCHAR(191) NOT NULL DEFAULT 'VND',
            \`initialBalance\` DOUBLE NOT NULL DEFAULT 0,
            \`currentBalance\` DOUBLE NOT NULL DEFAULT 0,
            \`description\` TEXT NULL,
            \`isActive\` BOOLEAN NOT NULL DEFAULT true,
            \`isDefault\` BOOLEAN NOT NULL DEFAULT false,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            UNIQUE INDEX \`FinanceAccount_code_key\`(\`code\`),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`CashTransaction\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`code\` VARCHAR(191) NOT NULL,
            \`type\` VARCHAR(191) NOT NULL,
            \`category\` VARCHAR(191) NOT NULL DEFAULT 'OTHER',
            \`transactionDate\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`amount\` DOUBLE NOT NULL DEFAULT 0,
            \`payerReceiver\` VARCHAR(191) NOT NULL,
            \`phone\` VARCHAR(191) NULL,
            \`address\` VARCHAR(191) NULL,
            \`reason\` TEXT NULL,
            \`paymentMethod\` VARCHAR(191) NOT NULL DEFAULT 'CASH',
            \`financeAccountId\` VARCHAR(191) NULL,
            \`customerId\` VARCHAR(191) NULL,
            \`supplierId\` VARCHAR(191) NULL,
            \`projectId\` VARCHAR(191) NULL,
            \`createdById\` VARCHAR(191) NULL,
            \`status\` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED',
            \`attachments\` TEXT NULL,
            \`notes\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            UNIQUE INDEX \`CashTransaction_code_key\`(\`code\`),
            PRIMARY KEY (\`id\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // Seed default finance accounts if none exist
    const financeAccCount = await prisma.financeAccount.count().catch(() => 0);
    if (financeAccCount === 0) {
        console.log('Khởi tạo 2 tài khoản quỹ mặc định...');
        try {
            await prisma.$executeRawUnsafe(`
                INSERT INTO \`FinanceAccount\` (\`id\`, \`code\`, \`name\`, \`type\`, \`currency\`, \`initialBalance\`, \`currentBalance\`, \`description\`, \`isDefault\`, \`createdAt\`, \`updatedAt\`)
                VALUES 
                ('fa_cash_vnd', 'TM-VND', 'Quỹ Tiền Mặt (VND)', 'CASH', 'VND', 0, 0, 'Quỹ tiền mặt tại công ty', 1, NOW(), NOW()),
                ('fa_bank_vcb', 'VCB-01', 'Ngân hàng TMCP Ngoại thương (Vietcombank)', 'BANK', 'VND', 0, 0, 'Tài khoản thanh toán chính', 0, NOW(), NOW())
                ON DUPLICATE KEY UPDATE \`name\` = \`name\`;
            `);
            console.log('✅ Đã tạo tài khoản quỹ mặc định.');
        } catch (seedErr) {
            console.warn('Seed note:', seedErr.message);
        }
    }

    // 8. Leaderboard & Internal Social Wall Tables (Bảo toàn 100% dữ liệu)
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
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`LeaderboardPost_authorId_idx\` (\`authorId\`),
            INDEX \`LeaderboardPost_createdAt_idx\` (\`createdAt\`),
            INDEX \`LeaderboardPost_isPinned_idx\` (\`isPinned\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`LeaderboardReaction\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`postId\` VARCHAR(191) NOT NULL,
            \`userId\` VARCHAR(191) NOT NULL,
            \`emoji\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            UNIQUE INDEX \`LeaderboardReaction_postId_userId_emoji_key\` (\`postId\`, \`userId\`, \`emoji\`),
            PRIMARY KEY (\`id\`),
            INDEX \`LeaderboardReaction_postId_idx\` (\`postId\`),
            INDEX \`LeaderboardReaction_userId_idx\` (\`userId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`LeaderboardComment\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`postId\` VARCHAR(191) NOT NULL,
            \`authorId\` VARCHAR(191) NOT NULL,
            \`parentId\` VARCHAR(191) NULL,
            \`content\` TEXT NOT NULL,
            \`image\` TEXT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            \`updatedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`LeaderboardComment_postId_idx\` (\`postId\`),
            INDEX \`LeaderboardComment_authorId_idx\` (\`authorId\`),
            INDEX \`LeaderboardComment_parentId_idx\` (\`parentId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS \`LeaderboardMention\` (
            \`id\` VARCHAR(191) NOT NULL,
            \`postId\` VARCHAR(191) NULL,
            \`commentId\` VARCHAR(191) NULL,
            \`mentionedUserId\` VARCHAR(191) NOT NULL,
            \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
            PRIMARY KEY (\`id\`),
            INDEX \`LeaderboardMention_mentionedUserId_idx\` (\`mentionedUserId\`),
            INDEX \`LeaderboardMention_postId_idx\` (\`postId\`),
            INDEX \`LeaderboardMention_commentId_idx\` (\`commentId\`)
        ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);

    // 9. Ensure all signature columns exist
    await addColumnIfNotExists('SalesPayment', 'customerSignature', 'LONGTEXT NULL');
    await addColumnIfNotExists('SalesPayment', 'customerSignedAt', 'DATETIME(3) NULL');
    await addColumnIfNotExists('SalesPayment', 'customerSignIP', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('SalesPayment', 'customerSignDevice', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('SalesPayment', 'customerSignLocation', 'VARCHAR(191) NULL');

    await addColumnIfNotExists('CashTransaction', 'payerSignature', 'LONGTEXT NULL');
    await addColumnIfNotExists('CashTransaction', 'payerSignedAt', 'DATETIME(3) NULL');
    await addColumnIfNotExists('CashTransaction', 'payerSignIP', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('CashTransaction', 'payerSignDevice', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('CashTransaction', 'payerSignLocation', 'VARCHAR(191) NULL');

    await addColumnIfNotExists('PurchasePayment', 'supplierSignature', 'LONGTEXT NULL');
    await addColumnIfNotExists('PurchasePayment', 'supplierSignedAt', 'DATETIME(3) NULL');
    await addColumnIfNotExists('PurchasePayment', 'supplierSignIP', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('PurchasePayment', 'supplierSignDevice', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('PurchasePayment', 'supplierSignLocation', 'VARCHAR(191) NULL');

    // 4d. Lead scoring & temperature fields
    await addColumnIfNotExists('Lead', 'score', 'INT NOT NULL DEFAULT 0');
    await addColumnIfNotExists('Lead', 'temperature', "VARCHAR(191) NOT NULL DEFAULT 'COLD'");

    // 9b. Seed enterprise business email templates (12 templates)
    try {
        const { seedBusinessEmailTemplates } = require('./seed-business-email-templates');
        await seedBusinessEmailTemplates(prisma);
    } catch (tmplErr) {
        console.warn('⚠️ Chú ý khi seed email templates:', tmplErr.message);
    }

    // 9c. Seed ZNS templates
    try {
        const defaultZnsTemplates = [
            {
                templateId: 'ZNS_ORDER_CONFIRMED',
                templateName: 'Thông báo xác nhận đơn hàng thành công',
                templateType: 'TRANSACTIONAL',
                content: 'Kính chào Quý khách {{customer_name}}, đơn hàng {{order_code}} trị giá {{total_amount}} đ đã được xác nhận thành công. Xem chi tiết tại: {{tracking_link}}',
                pricePerMessage: 300
            },
            {
                templateId: 'ZNS_PAYMENT_REMINDER',
                templateName: 'Thông báo đề nghị thanh toán hóa đơn',
                templateType: 'TRANSACTIONAL',
                content: 'Kính gửi Quý khách {{customer_name}}, hóa đơn {{invoice_code}} số tiền {{amount_due}} đ đã đến hạn thanh toán vào ngày {{due_date}}. Vui lòng xem hóa đơn tại: {{invoice_link}}',
                pricePerMessage: 300
            },
            {
                templateId: 'ZNS_ESTIMATE_READY',
                templateName: 'Thông báo báo giá giải pháp mới',
                templateType: 'TRANSACTIONAL',
                content: 'Kính gửi Quý khách {{customer_name}}, TSOL xin gửi báo giá {{estimate_code}} cho dự án {{project_name}}. Xem và duyệt báo giá trực tuyến tại: {{estimate_link}}',
                pricePerMessage: 300
            },
            {
                templateId: 'ZNS_E_SIGN_INVITE',
                templateName: 'Mời ký hợp đồng / biên bản điện tử',
                templateType: 'TRANSACTIONAL',
                content: 'Kính gửi Quý khách {{customer_name}}, tài liệu {{doc_title}} đã sẵn sàng để ký điện tử. Quý khách vui lòng truy cập: {{sign_link}} để hoàn tất chữ ký.',
                pricePerMessage: 300
            }
        ];

        for (const t of defaultZnsTemplates) {
            await prisma.znsTemplate.upsert({
                where: { templateId: t.templateId },
                update: {
                    templateName: t.templateName,
                    templateType: t.templateType,
                    content: t.content,
                    pricePerMessage: t.pricePerMessage,
                    isEnabled: true
                },
                create: {
                    templateId: t.templateId,
                    templateName: t.templateName,
                    templateType: t.templateType,
                    content: t.content,
                    pricePerMessage: t.pricePerMessage,
                    isEnabled: true
                }
            });
        }
        console.log('✅ Đã khởi tạo danh mục mẫu tin Zalo ZNS tiêu chuẩn.');
    } catch (znsErr) {
        console.warn('⚠️ Chú ý khi seed ZNS templates:', znsErr.message);
    }

    // 10. Verification and record counts
    const taskCount = await prisma.task.count();
    const todoCount = await prisma.todo.count();
    const projectCount = await prisma.project.count();
    const leadCount = await prisma.lead.count();
    const billCount = await prisma.purchaseBill.count();
    const invoiceCount = await prisma.salesInvoice.count();
    const customerCount = await prisma.customer.count();
    const supplierCount = await prisma.supplier.count();
    const productCount = await prisma.product.count();
    const emailTemplateCount = await prisma.emailTemplate.count();
    const znsTemplateCount = await prisma.znsTemplate.count();
    const znsLogCount = await prisma.znsLog.count();
    const systemAttachmentCount = await prisma.systemAttachment.count();
    const unifiedLogCount = await prisma.unifiedActivityLog.count();
    const unitConversionCount = await prisma.productUnitConversion.count();
    const serialCount = await prisma.productSerial.count();
    const accountCount = await prisma.chartOfAccount.count();
    const journalCount = await prisma.journalEntry.count();
    const approvalCount = await prisma.approvalRequest.count();

    console.log('\n--- Kiểm tra tính toàn vẹn của dữ liệu ---');
    console.log(`- Việc cần làm / Nhiệm vụ (Tasks): ${taskCount} bản ghi`);
    console.log(`- To-Do cá nhân (Todos): ${todoCount} bản ghi`);
    console.log(`- Dự án (Projects): ${projectCount} bản ghi`);
    console.log(`- Cơ hội bán hàng (Leads): ${leadCount} bản ghi`);
    console.log(`- Hóa đơn mua hàng (Purchase Bills): ${billCount} bản ghi`);
    console.log(`- Hóa đơn bán hàng (Sales Invoices): ${invoiceCount} bản ghi`);
    console.log(`- Khách hàng (Customers): ${customerCount} bản ghi`);
    console.log(`- Nhà cung cấp (Suppliers): ${supplierCount} bản ghi`);
    console.log(`- Sản phẩm (Products): ${productCount} bản ghi`);
    console.log(`- Mẫu Email (Email Templates): ${emailTemplateCount} bản ghi`);
    console.log(`- Mẫu tin Zalo ZNS (ZNS Templates): ${znsTemplateCount} mẫu`);
    console.log(`- Nhật ký tin Zalo ZNS (ZNS Logs): ${znsLogCount} bản ghi`);
    console.log(`- Tệp đính kèm tập trung (System Attachments): ${systemAttachmentCount} bản ghi`);
    console.log(`- Nhật ký kiểm toán hợp nhất (Unified Audit Logs): ${unifiedLogCount} bản ghi`);
    console.log(`- Đơn vị tính quy đổi (Unit Conversions): ${unitConversionCount} bản ghi`);
    console.log(`- Mã định danh Serial/IMEI: ${serialCount} bản ghi`);
    console.log(`- Hệ thống tài khoản kế toán (Chart of Accounts): ${accountCount} tài khoản`);
    console.log(`- Sổ nhật ký bút toán kép (Journal Entries): ${journalCount} bút toán`);
    console.log(`- Yêu cầu phê duyệt chi tiêu (Approval Requests): ${approvalCount} yêu cầu`);
    console.log('--------------------------------------------------\n');
}

main()
    .catch((err) => {
        console.error('❌ Lỗi:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

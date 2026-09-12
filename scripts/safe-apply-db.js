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

    // 7. Verification and record counts
    const projectCount = await prisma.project.count();
    const billCount = await prisma.purchaseBill.count();
    const invoiceCount = await prisma.salesInvoice.count();
    const customerCount = await prisma.customer.count();
    const supplierCount = await prisma.supplier.count();
    const productCount = await prisma.product.count();

    console.log('\n--- Kiểm tra tính toàn vẹn của dữ liệu ---');
    console.log(`- Dự án (Projects): ${projectCount} bản ghi`);
    console.log(`- Hóa đơn mua hàng (Purchase Bills): ${billCount} bản ghi`);
    console.log(`- Hóa đơn bán hàng (Sales Invoices): ${invoiceCount} bản ghi`);
    console.log(`- Khách hàng (Customers): ${customerCount} bản ghi`);
    console.log(`- Nhà cung cấp (Suppliers): ${supplierCount} bản ghi`);
    console.log(`- Sản phẩm (Products): ${productCount} bản ghi`);
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

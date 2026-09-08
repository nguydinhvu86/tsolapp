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
    const createTableSql = `
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
    `;
    await prisma.$executeRawUnsafe(createTableSql);
    console.log('✅ Bảng PurchaseBillActivityLog đã sẵn sàng.');

    // 2. Customer fields
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

    // 3. Supplier fields
    await addColumnIfNotExists('Supplier', 'shortName', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'internationalName', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'taxStatus', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'bankBranch', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'billingAddress', 'VARCHAR(500) NULL');
    await addColumnIfNotExists('Supplier', 'shippingAddress', 'VARCHAR(500) NULL');
    await addColumnIfNotExists('Supplier', 'paymentTerms', 'VARCHAR(191) NULL');
    await addColumnIfNotExists('Supplier', 'creditLimit', 'DOUBLE NULL DEFAULT 0');

    // 4. Auto-populate customer codes for existing customers without code
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

    // 5. Add unique index for Customer.code
    await addUniqueIndexIfNotExists('Customer', 'code', 'Customer_code_key');

    // 6. Verification and record counts
    const billCount = await prisma.purchaseBill.count();
    const invoiceCount = await prisma.salesInvoice.count();
    const customerCount = await prisma.customer.count();
    const supplierCount = await prisma.supplier.count();
    const productCount = await prisma.product.count();

    console.log('\n--- Kiểm tra tính toàn vẹn của dữ liệu ---');
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

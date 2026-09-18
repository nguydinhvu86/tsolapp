const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Inspecting Database Columns ---');

    // Helper to safely add column if not exists
    async function ensureColumn(tableName, columnName, columnDefinition) {
        try {
            const cols = await prisma.$queryRawUnsafe(`
                SELECT COLUMN_NAME 
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = '${tableName}' 
                  AND COLUMN_NAME = '${columnName}'
            `);

            if (cols.length === 0) {
                console.log(`Adding missing column ${columnName} to ${tableName}...`);
                await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`);
                console.log(`Added ${columnName} to ${tableName} successfully.`);
            } else {
                console.log(`Column ${columnName} already exists in ${tableName}.`);
            }
        } catch (err) {
            console.error(`Error checking/adding column ${columnName} on ${tableName}:`, err.message);
        }
    }

    // Check SalesPayment signature columns
    await ensureColumn('SalesPayment', 'customerSignature', 'LONGTEXT NULL');
    await ensureColumn('SalesPayment', 'customerSignedAt', 'DATETIME(3) NULL');
    await ensureColumn('SalesPayment', 'customerSignIP', 'VARCHAR(191) NULL');
    await ensureColumn('SalesPayment', 'customerSignDevice', 'VARCHAR(191) NULL');
    await ensureColumn('SalesPayment', 'customerSignLocation', 'VARCHAR(191) NULL');

    // Check SalesEstimate signature columns
    await ensureColumn('SalesEstimate', 'customerSignature', 'LONGTEXT NULL');
    await ensureColumn('SalesEstimate', 'customerSignedAt', 'DATETIME(3) NULL');
    await ensureColumn('SalesEstimate', 'customerSignIP', 'VARCHAR(191) NULL');
    await ensureColumn('SalesEstimate', 'customerSignDevice', 'VARCHAR(191) NULL');
    await ensureColumn('SalesEstimate', 'customerSignLocation', 'TEXT NULL');
    await ensureColumn('SalesEstimate', 'companySignature', 'LONGTEXT NULL');
    await ensureColumn('SalesEstimate', 'companySignedAt', 'DATETIME(3) NULL');
    await ensureColumn('SalesEstimate', 'companySignerId', 'VARCHAR(191) NULL');

    // Check SalesOrder signature columns
    await ensureColumn('SalesOrder', 'customerSignature', 'LONGTEXT NULL');
    await ensureColumn('SalesOrder', 'customerSignedAt', 'DATETIME(3) NULL');
    await ensureColumn('SalesOrder', 'customerSignIP', 'VARCHAR(191) NULL');
    await ensureColumn('SalesOrder', 'customerSignDevice', 'VARCHAR(191) NULL');
    await ensureColumn('SalesOrder', 'customerSignLocation', 'TEXT NULL');
    await ensureColumn('SalesOrder', 'companySignature', 'LONGTEXT NULL');
    await ensureColumn('SalesOrder', 'companySignedAt', 'DATETIME(3) NULL');
    await ensureColumn('SalesOrder', 'companySignerId', 'VARCHAR(191) NULL');

    // Check SalesInvoice signature columns
    await ensureColumn('SalesInvoice', 'customerSignature', 'LONGTEXT NULL');
    await ensureColumn('SalesInvoice', 'customerSignedAt', 'DATETIME(3) NULL');
    await ensureColumn('SalesInvoice', 'customerSignIP', 'VARCHAR(191) NULL');
    await ensureColumn('SalesInvoice', 'customerSignDevice', 'VARCHAR(191) NULL');
    await ensureColumn('SalesInvoice', 'customerSignLocation', 'TEXT NULL');
    await ensureColumn('SalesInvoice', 'companySignature', 'LONGTEXT NULL');
    await ensureColumn('SalesInvoice', 'companySignedAt', 'DATETIME(3) NULL');
    await ensureColumn('SalesInvoice', 'companySignerId', 'VARCHAR(191) NULL');

    // Check PurchasingPayment if exists
    await ensureColumn('PurchasingPayment', 'supplierSignature', 'LONGTEXT NULL');
    await ensureColumn('PurchasingPayment', 'supplierSignedAt', 'DATETIME(3) NULL');
    await ensureColumn('PurchasingPayment', 'staffSignature', 'LONGTEXT NULL');
    await ensureColumn('PurchasingPayment', 'staffSignedAt', 'DATETIME(3) NULL');

    // Check Transaction signature columns
    await ensureColumn('Transaction', 'creatorSignature', 'LONGTEXT NULL');
    await ensureColumn('Transaction', 'recipientSignature', 'LONGTEXT NULL');
    await ensureColumn('Transaction', 'managerSignature', 'LONGTEXT NULL');

    console.log('--- Column sync completed ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

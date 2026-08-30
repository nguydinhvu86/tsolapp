const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- Đang kiểm tra và áp dụng cập nhật Database (Không xóa dữ liệu) ---');
    
    // Create PurchaseBillActivityLog table if not exists
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
    console.log('✅ Bảng PurchaseBillActivityLog đã sẵn sàng và được bảo toàn 100% dữ liệu hiện có!');

    // Check count of records in relevant tables
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

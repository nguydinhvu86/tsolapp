import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.count();
        const customers = await prisma.customer.count();
        const products = await prisma.product.count();
        const salesInvoices = await prisma.salesInvoice.count();

        console.log('--- KẾT QUẢ KIỂM TRA HẠ TẦNG VÀ DỮ LIỆU ---');
        console.log('✅ Kết nối Database: Thành công');
        console.log(`📊 Tổng số Users: ${users}`);
        console.log(`📊 Tổng số Khách Hàng: ${customers}`);
        console.log(`📊 Tổng số Sản Phẩm (Kho): ${products}`);
        console.log(`📊 Tổng số Hóa Đơn Bán Hàng: ${salesInvoices}`);
        console.log('-------------------------------------------');
    } catch (err) {
        console.error('❌ Lỗi kết nối CSDL:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();

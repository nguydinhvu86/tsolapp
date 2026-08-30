const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncAllCustomerDebts() {
    console.log("=== BẮT ĐẦU ĐỒNG BỘ CÔNG NỢ KHÁCH HÀNG (DATABASE) ===");
    const customers = await prisma.customer.findMany({
        include: {
            salesInvoices: {
                where: { status: { notIn: ['DRAFT', 'CANCELLED'] } }
            },
            salesPayments: {
                where: { status: { notIn: ['CANCELLED', 'FAILED'] } }
            }
        }
    });

    let fixedCount = 0;

    for (const customer of customers) {
        // Tổng tiền hóa đơn bán hợp lệ
        const totalInvoiced = customer.salesInvoices.reduce((sum, inv) => sum + (Number(inv.totalAmount) || 0), 0);
        // Tổng tiền đã thanh toán ghi nhận trên hóa đơn hoặc phiếu thu
        const totalPaidOnInvoices = customer.salesInvoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
        const totalPaidFromPayments = customer.salesPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        
        // Tiền đã thanh toán thực tế (lấy giá trị lớn hơn giữa tổng paidAmount trên invoices và tổng phiếu thu thực tế)
        const totalPaid = Math.max(totalPaidOnInvoices, totalPaidFromPayments);
        
        // Công nợ thực tế còn phải thu = Tổng hóa đơn - Tổng thanh toán
        const correctDebt = totalInvoiced - totalPaid;

        if (customer.totalDebt !== correctDebt) {
            console.log(`[CẬP NHẬT] Khách hàng: ${customer.name}`);
            console.log(`  - Giá trị cũ trong DB: ${customer.totalDebt}`);
            console.log(`  - Hóa đơn (${customer.salesInvoices.length}): ${totalInvoiced} đ`);
            console.log(`  - Đã thanh toán: ${totalPaid} đ`);
            console.log(`  - Công nợ chính xác: ${correctDebt} đ`);

            await prisma.customer.update({
                where: { id: customer.id },
                data: { totalDebt: correctDebt }
            });
            fixedCount++;
        }
    }

    console.log(`=== ĐỒNG BỘ HOÀN TẤT: Đã cập nhật ${fixedCount}/${customers.length} khách hàng ===\n`);
}

syncAllCustomerDebts()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

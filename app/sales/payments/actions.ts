'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function submitSalesPayment(creatorId: string, formData: any) {
    // 1. Lưu Payment
    // 2. Trừ công nợ Khách hàng
    // 3. Phân bổ payment vào Invoice (giảm nợ cho hóa đơn đó)
    try {
        if (!formData.code || !formData.customerId || !formData.amount) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.salesPayment.create({
                data: {
                    code: formData.code,
                    date: new Date(formData.date),
                    amount: formData.amount,
                    paymentMethod: formData.paymentMethod || 'CASH',
                    reference: formData.reference,
                    notes: formData.notes,
                    customerId: formData.customerId,
                    creatorId: creatorId,
                    allocations: { // optional: linked to a specific invoice
                        ...(formData.invoiceId ? {
                            create: [{ invoiceId: formData.invoiceId, amount: formData.amount }]
                        } : {})
                    }
                }
            });

            // Giảm dư nợ khách hàng
            await tx.customer.update({
                where: { id: formData.customerId },
                data: { totalDebt: { decrement: formData.amount } }
            });

            // Nếu thanh toán cho 1 hóa đơn cụ thể, cập nhật lại số tiền đã thanh toán của hóa đơn đó
            if (formData.invoiceId) {
                const inv = await tx.salesInvoice.update({
                    where: { id: formData.invoiceId },
                    data: { paidAmount: { increment: formData.amount } }
                });

                // Tự động đẩy trạng thái nếu cần (Ví dụ: PARTIAL_PAID -> PAID)
                const newStatus = (inv.paidAmount >= inv.totalAmount) ? 'PAID' : 'PARTIAL_PAID';
                if (inv.status !== newStatus && inv.status !== 'DRAFT') {
                    await tx.salesInvoice.update({
                        where: { id: inv.id },
                        data: { status: newStatus }
                    });
                }
            }

            return payment;
        });

        revalidatePath('/sales/payments');
        revalidatePath('/sales/invoices');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Lỗi khi Phiếu Thu:", error);
        return { success: false, error: error.message };
    }
}

export async function getSalesPayments() {
    try {
        return await prisma.salesPayment.findMany({
            include: {
                customer: true,
                creator: true,
                allocations: {
                    include: { invoice: true }
                }
            },
            orderBy: { date: 'desc' }
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách Phiếu Theo:", error);
        return [];
    }
}

export async function getNextPaymentCode() {
    const last = await prisma.salesPayment.findFirst({
        orderBy: { code: 'desc' }
    });
    if (!last) return 'PAY0001';
    const numPart = parseInt(last.code.replace('PAY', ''), 10);
    return `PAY${String(numPart + 1).padStart(4, '0')}`;
}

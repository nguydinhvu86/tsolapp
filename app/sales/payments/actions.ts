'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import { logCustomerActivity } from '@/lib/customerLogger';
import { sendEmailWithTracking } from '@/lib/mailer';

async function getUser() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        throw new Error('Unauthorized');
    }
    return session.user;
}

export async function getSalesPayments() {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.salesPayment.findMany({
        include: {
            customer: true,
            creator: true,
            allocations: {
                include: { invoice: true }
            }
        },
        orderBy: { date: 'desc' }
    });
}

export async function createSalesPayment(data: any) {
    const user = await getUser();

    return prisma.$transaction(async (tx: any) => {
        let code = data.code;
        if (!code) {
            const count = await tx.salesPayment.count();
            code = `PAY-${(count + 1).toString().padStart(6, '0')}`;
        }

        const customer = await tx.customer.findUnique({ where: { id: data.customerId } });
        if (!customer) throw new Error("Khách hàng không tồn tại");

        let allocationsData = [];
        let totalAllocated = 0;

        // Ensure allocations array exists
        const providedAllocations = data.allocations || [];

        for (const alloc of providedAllocations) {
            if (alloc.amount > 0) {
                // Verify invoice
                const invoice = await tx.salesInvoice.findUnique({ where: { id: alloc.invoiceId } });
                if (!invoice) throw new Error(`Hóa đơn ${alloc.invoiceId} không tồn tại`);

                const remainingOnInvoice = invoice.totalAmount - invoice.paidAmount;
                if (alloc.amount > remainingOnInvoice + 0.01) { // Add small tolerance for float issues
                    throw new Error(`Số tiền phân bổ cho hóa đơn ${invoice.code} vượt quá số tiền còn lại phải thu`);
                }

                allocationsData.push({
                    invoiceId: alloc.invoiceId,
                    amount: alloc.amount
                });
                totalAllocated += alloc.amount;

                // Update invoice paid amount and status
                const newPaidAmount = invoice.paidAmount + alloc.amount;
                const newStatus = (newPaidAmount >= invoice.totalAmount - 0.01) ? 'PAID' : 'PARTIAL_PAID';

                await tx.salesInvoice.update({
                    where: { id: invoice.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus
                    }
                });
            }
        }

        // Validate total payment amount against allocations if allocations are provided explicitly
        if (providedAllocations.length > 0 && Math.abs(data.amount - totalAllocated) > 0.01) {
            // Unallocated amounts could be saved as customer advance/credit. We leave it as is for simplicity.
        }

        // 1. Create Payment
        const payment = await tx.salesPayment.create({
            data: {
                code,
                date: data.date ? new Date(data.date) : new Date(),
                amount: data.amount,
                paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
                reference: data.reference,
                notes: data.notes,
                attachment: data.attachment,
                customerId: data.customerId,
                creatorId: user.id,
                allocations: {
                    create: allocationsData
                }
            }
        });

        // 2. Reduce Customer Debt
        await tx.customer.update({
            where: { id: data.customerId },
            data: { totalDebt: customer.totalDebt - data.amount } // totalDebt should go DOWN when we receive payment
        });

        await logCustomerActivity(data.customerId, user.id, 'NHẬN_THANH_TOÁN', `Thu tiền ${data.amount.toLocaleString('vi-VN')} đ (Mã PT: ${code})`);

        return payment;
    }, {
        maxWait: 15000,
        timeout: 60000
    });
}

export async function updateSalesPayment(id: string, data: any) {
    await getUser();

    return prisma.$transaction(async (tx: any) => {
        const oldPayment = await tx.salesPayment.findUnique({
            where: { id },
            include: { allocations: true }
        });

        if (!oldPayment) throw new Error("Phiếu thu không tồn tại");
        if (oldPayment.status === 'CANCELLED') throw new Error("Không thể sửa phiếu thu đã hủy");

        // 1. Hoàn tác tác động của phiếu thu cũ
        const customer = await tx.customer.findUnique({ where: { id: oldPayment.customerId } });
        if (customer) {
            await tx.customer.update({
                where: { id: oldPayment.customerId },
                data: { totalDebt: customer.totalDebt + oldPayment.amount }
            });
        }

        for (const alloc of oldPayment.allocations) {
            const invoice = await tx.salesInvoice.findUnique({ where: { id: alloc.invoiceId } });
            if (invoice) {
                const newPaidAmount = Math.max(0, invoice.paidAmount - alloc.amount);
                const newStatus = (newPaidAmount >= invoice.totalAmount - 0.01) ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL_PAID' : 'ISSUED');
                await tx.salesInvoice.update({
                    where: { id: invoice.id },
                    data: { paidAmount: newPaidAmount, status: newStatus }
                });
            }
        }

        // Xóa allocations cũ
        await tx.salesPaymentAllocation.deleteMany({ where: { paymentId: id } });

        // 2. Áp dụng tác động của phiếu thu mới
        let allocationsData = [];
        for (const alloc of data.allocations || []) {
            if (alloc.amount > 0) {
                const invoice = await tx.salesInvoice.findUnique({ where: { id: alloc.invoiceId } });
                if (!invoice) throw new Error(`Hóa đơn không tồn tại`);

                const remainingOnInvoice = invoice.totalAmount - invoice.paidAmount;
                if (alloc.amount > remainingOnInvoice + 0.01) {
                    throw new Error(`Số tiền phân bổ vượt quá số tiền còn lại`);
                }

                allocationsData.push({ invoiceId: alloc.invoiceId, amount: alloc.amount });

                const newPaidAmount = invoice.paidAmount + alloc.amount;
                const newStatus = (newPaidAmount >= invoice.totalAmount - 0.01) ? 'PAID' : 'PARTIAL_PAID';
                await tx.salesInvoice.update({
                    where: { id: invoice.id },
                    data: { paidAmount: newPaidAmount, status: newStatus }
                });
            }
        }

        // 3. Cập nhật bản ghi Phiếu Thu mới
        const newPaymentAmount = typeof data.amount === 'number' ? data.amount : oldPayment.amount;
        const newPayment = await tx.salesPayment.update({
            where: { id },
            data: {
                date: data.date ? new Date(data.date) : oldPayment.date,
                amount: newPaymentAmount,
                paymentMethod: data.paymentMethod || oldPayment.paymentMethod,
                reference: data.reference,
                notes: data.notes,
                allocations: {
                    create: allocationsData
                }
            }
        });

        // 4. Trừ lại công nợ theo số tiền mới
        const currentCustomer = await tx.customer.findUnique({ where: { id: oldPayment.customerId } });
        if (currentCustomer) {
            await tx.customer.update({
                where: { id: oldPayment.customerId },
                data: { totalDebt: currentCustomer.totalDebt - newPaymentAmount }
            });
        }

        revalidatePath('/sales/payments');
        revalidatePath(`/sales/payments/${id}`);
        return newPayment;
    }, {
        maxWait: 15000,
        timeout: 60000
    });
}

export async function cancelSalesPayment(id: string) {
    await getUser();

    return prisma.$transaction(async (tx: any) => {
        const payment = await tx.salesPayment.findUnique({
            where: { id },
            include: { allocations: true }
        });

        if (!payment) throw new Error("Phiếu thu không tồn tại");
        if (payment.status === 'CANCELLED') throw new Error("Phiếu thu đã bị hủy từ trước");

        // Reverse debt
        const customer = await tx.customer.findUnique({ where: { id: payment.customerId } });
        if (customer) {
            await tx.customer.update({
                where: { id: payment.customerId },
                data: { totalDebt: customer.totalDebt + payment.amount }
            });
        }

        // Reverse invoice allocations
        for (const alloc of payment.allocations) {
            const invoice = await tx.salesInvoice.findUnique({ where: { id: alloc.invoiceId } });
            if (invoice) {
                const newPaidAmount = Math.max(0, invoice.paidAmount - alloc.amount);
                const newStatus = (newPaidAmount >= invoice.totalAmount - 0.01) ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL_PAID' : 'ISSUED');
                await tx.salesInvoice.update({
                    where: { id: invoice.id },
                    data: { paidAmount: newPaidAmount, status: newStatus }
                });
            }
        }

        // Cập nhật trạng thái phiếu thu thành CANCELLED
        const updatedPayment = await tx.salesPayment.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });

        revalidatePath('/sales/payments');
        revalidatePath(`/sales/payments/${id}`);
        return updatedPayment;
    }, {
        maxWait: 15000,
        timeout: 60000
    });
}

export async function restoreSalesPayment(id: string) {
    await getUser();

    return prisma.$transaction(async (tx: any) => {
        const payment = await tx.salesPayment.findUnique({
            where: { id },
            include: { allocations: true }
        });

        if (!payment) throw new Error("Phiếu thu không tồn tại");
        if (payment.status === 'COMPLETED') throw new Error("Phiếu thu đang ở trạng thái hoàn thành, không thể khôi phục");

        // Áp dụng lại công nợ
        const customer = await tx.customer.findUnique({ where: { id: payment.customerId } });
        if (customer) {
            await tx.customer.update({
                where: { id: payment.customerId },
                data: { totalDebt: customer.totalDebt - payment.amount }
            });
        }

        // Áp dụng lại allocations
        for (const alloc of payment.allocations) {
            const invoice = await tx.salesInvoice.findUnique({ where: { id: alloc.invoiceId } });
            if (invoice) {
                const newPaidAmount = invoice.paidAmount + alloc.amount;
                const newStatus = (newPaidAmount >= invoice.totalAmount - 0.01) ? 'PAID' : 'PARTIAL_PAID';
                await tx.salesInvoice.update({
                    where: { id: invoice.id },
                    data: { paidAmount: newPaidAmount, status: newStatus }
                });
            }
        }

        // Cập nhật trạng thái phiếu thu thành COMPLETED
        const updatedPayment = await tx.salesPayment.update({
            where: { id },
            data: { status: 'COMPLETED' }
        });

        revalidatePath('/sales/payments');
        revalidatePath(`/sales/payments/${id}`);
        return updatedPayment;
    }, {
        maxWait: 15000,
        timeout: 60000
    });
}

export async function deleteSalesPayment(id: string) {
    await getUser();

    return prisma.$transaction(async (tx: any) => {
        const payment = await tx.salesPayment.findUnique({
            where: { id },
            include: { allocations: true }
        });

        if (!payment) throw new Error("Phiếu thu không tồn tại");

        if (payment.status !== 'CANCELLED') {
            // Reverse debt: Customer owes us more now
            const customer = await tx.customer.findUnique({ where: { id: payment.customerId } });
            if (customer) {
                await tx.customer.update({
                    where: { id: payment.customerId },
                    data: { totalDebt: customer.totalDebt + payment.amount }
                });
            }

            // Reverse invoice status and paid amount
            for (const alloc of payment.allocations) {
                const invoice = await tx.salesInvoice.findUnique({ where: { id: alloc.invoiceId } });
                if (invoice) {
                    const newPaidAmount = Math.max(0, invoice.paidAmount - alloc.amount);
                    const newStatus = (newPaidAmount >= invoice.totalAmount - 0.01) ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL_PAID' : 'ISSUED');
                    await tx.salesInvoice.update({
                        where: { id: invoice.id },
                        data: { paidAmount: newPaidAmount, status: newStatus }
                    });
                }
            }
        }

        // Delete allocations then payment
        await tx.salesPaymentAllocation.deleteMany({ where: { paymentId: id } });
        await tx.salesPayment.delete({ where: { id } });

        revalidatePath('/sales/payments');
        return true;
    }, {
        maxWait: 15000,
        timeout: 60000
    });
}

export async function uploadSalesPaymentDocument(paymentId: string, url: string, name: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.$transaction(async (tx: any) => {
        const payment = await tx.salesPayment.findUnique({
            where: { id: paymentId }
        });

        if (!payment) throw new Error("Không tìm thấy Phiếu Thu này");

        let existingDocs: any[] = [];
        if (payment.attachment) {
            try {
                existingDocs = JSON.parse(payment.attachment);
            } catch (e) {
                existingDocs = [{
                    url: payment.attachment,
                    name: "Chứng từ gốc",
                    uploadedAt: payment.createdAt
                }];
            }
        }

        existingDocs.push({
            url,
            name,
            uploadedAt: new Date().toISOString()
        });

        const updatedPayment = await tx.salesPayment.update({
            where: { id: paymentId },
            data: {
                attachment: JSON.stringify(existingDocs)
            },
            include: {
                customer: true,
                creator: true,
                allocations: {
                    include: { invoice: true }
                }
            }
        });

        revalidatePath(`/sales/payments/${paymentId}`);
        return updatedPayment;
    });
}

export async function sendPaymentEmail(paymentId: string, to: string, subject: string, htmlBody: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const payment = await prisma.salesPayment.findUnique({
            where: { id: paymentId },
            include: { customer: true }
        });

        if (!payment || !payment.customer) {
            return { success: false, error: "Không tìm thấy phiếu thu hoặc khách hàng." };
        }

        const res = await sendEmailWithTracking({
            to,
            subject,
            htmlBody,
            senderId: session.user.id,
            customerId: payment.customerId
        });

        if (res.success) {
            await logCustomerActivity(
                payment.customerId,
                session.user.id,
                'GỬI_EMAIL',
                `Đã gửi Email Xác nhận Thanh toán (Phiếu ${payment.code}) đến ${to}`
            );
        }

        return res;
    } catch (error: any) {
        console.error("Lỗi khi gửi email xác nhận thanh toán:", error);
        return { success: false, error: error.message };
    }
}

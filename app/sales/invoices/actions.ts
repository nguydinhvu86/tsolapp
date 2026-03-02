'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function submitSalesInvoice(creatorId: string, formData: any) {
    try {
        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const invoice = await prisma.salesInvoice.create({
            data: {
                code: formData.code,
                date: new Date(formData.date),
                dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
                status: formData.status || "DRAFT",
                notes: formData.notes,
                customerId: formData.customerId,
                orderId: formData.orderId || null,
                subTotal: formData.subTotal,
                taxAmount: formData.taxAmount,
                totalAmount: formData.totalAmount,
                creatorId: creatorId,
                items: {
                    create: formData.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0,
                        taxAmount: item.taxAmount || 0,
                        totalPrice: item.totalPrice
                    }))
                }
            }
        });

        // Hóa đơn được tạo ở trạng thái ISSUED luôn, hoặc DRAFT rồi mới duyệt sang ISSUED.
        // Nếu truyền DRAFT và ISSUED ngay -> cập nhật kho. Ở đây cho phép lưu DRAFT trước.

        revalidatePath('/sales/invoices');
        return { success: true, data: invoice };
    } catch (error: any) {
        console.error("Lỗi khi tạo Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSalesInvoice(id: string, formData: any) {
    try {
        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const existingInvoice = await prisma.salesInvoice.findUnique({ where: { id } });
        if (!existingInvoice) {
            return { success: false, error: "Không tìm thấy hóa đơn." };
        }
        if (existingInvoice.status !== "DRAFT") {
            return { success: false, error: "Chỉ Hóa Đơn nháp (DRAFT) mới có thể sửa." };
        }

        const invoice = await prisma.salesInvoice.update({
            where: { id },
            data: {
                code: formData.code,
                date: new Date(formData.date),
                dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
                status: formData.status || "DRAFT",
                notes: formData.notes,
                customerId: formData.customerId,
                orderId: formData.orderId || null,
                subTotal: formData.subTotal,
                taxAmount: formData.taxAmount,
                totalAmount: formData.totalAmount,
                items: {
                    deleteMany: {},
                    create: formData.items.map((item: any) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0,
                        taxAmount: item.taxAmount || 0,
                        totalPrice: item.totalPrice
                    }))
                }
            }
        });

        revalidatePath('/sales/invoices');
        return { success: true, data: invoice };
    } catch (error: any) {
        console.error("Lỗi khi cập nhật Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function getSalesInvoices() {
    try {
        return await prisma.salesInvoice.findMany({
            include: {
                customer: true,
                order: true,
                creator: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { date: 'desc' }
        });
    } catch (error) {
        console.error("Lỗi lấy danh sách Hóa Đơn:", error);
        return [];
    }
}

export async function approveSalesInvoice(invoiceId: string, userId: string) {
    // 1. Cập nhật status thành ISSUED
    // 2. Tạo giao dịch xuất kho (OUT)
    // 3. Cộng dồn công nợ (totalDebt) cho Khách Hàng
    try {
        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.salesInvoice.findUnique({
                where: { id: invoiceId },
                include: { items: true, customer: true }
            });

            if (!invoice) throw new Error("Không tìm thấy hóa đơn");
            if (invoice.status === "ISSUED" || invoice.status === "PAID" || invoice.status === "PARTIAL_PAID") {
                throw new Error("Hóa đơn này đã được duyệt trước đó");
            }

            // 1. Update Invoice Status
            const updatedInvoice = await tx.salesInvoice.update({
                where: { id: invoiceId },
                data: { status: "ISSUED" }
            });

            // 2. Add to Customer Debt
            await tx.customer.update({
                where: { id: invoice.customerId },
                data: { totalDebt: { increment: invoice.totalAmount } }
            });

            // 3. Create OUT Inventory Transaction
            // Tìm warehouse mặc định
            let wh = await tx.warehouse.findFirst({ where: { isDefault: true } });
            if (!wh) {
                wh = await tx.warehouse.findFirst(); // Lấy kho đầu tiên
            }
            if (!wh) throw new Error("Chưa có kho lưu trữ nào.");

            const nextTxCode = `TX-OUT-${invoice.code}`;

            // Create inventory transaction
            const invTx = await tx.inventoryTransaction.create({
                data: {
                    code: nextTxCode,
                    type: "OUT",
                    status: "COMPLETED",
                    date: new Date(),
                    notes: `Xuất kho tự động cho hóa đơn bán ${invoice.code}`,
                    fromWarehouseId: wh.id,
                    creatorId: userId,
                    items: { // create items
                        create: invoice.items.map(i => ({
                            productId: i.productId,
                            quantity: i.quantity,
                            price: i.unitPrice
                        }))
                    }
                }
            });

            // Deduct actual Inventory balances
            for (const item of invoice.items) {
                // Tìm inventory
                const inventory = await tx.inventory.findUnique({
                    where: { productId_warehouseId: { productId: item.productId, warehouseId: wh.id } }
                });

                if (inventory) {
                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: { quantity: { decrement: item.quantity } }
                    });
                } else {
                    // Nếu không có, tạo cứng số âm (cho phép xuất âm)
                    await tx.inventory.create({
                        data: {
                            productId: item.productId,
                            warehouseId: wh.id,
                            quantity: -item.quantity
                        }
                    });
                }
            }

            return updatedInvoice;
        });

        revalidatePath('/sales/invoices');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Lỗi khi duyệt hóa đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteSalesInvoice(id: string) {
    try {
        const inv = await prisma.salesInvoice.findUnique({ where: { id } });
        if (inv && (inv.status === 'ISSUED' || inv.status === 'PARTIAL_PAID' || inv.status === 'PAID')) {
            return { success: false, error: "Hóa đơn đã xuất kho và vào công nợ, không thể tự do xóa. Liên hệ admin phục hồi cơ sở dữ liệu." };
        }
        await prisma.salesInvoice.delete({ where: { id } });
        revalidatePath('/sales/invoices');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getNextInvoiceCode() {
    const last = await prisma.salesInvoice.findFirst({
        orderBy: { code: 'desc' }
    });
    if (!last) return 'INV0001';
    const numPart = parseInt(last.code.replace('INV', ''), 10);
    return `INV${String(numPart + 1).padStart(4, '0')}`;
}

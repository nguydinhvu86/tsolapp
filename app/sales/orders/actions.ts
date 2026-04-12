'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { sendEmailWithTracking } from '@/lib/mailer';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';
import { getNextInvoiceCode } from '../invoices/actions';

export async function sendOrderEmail(
    orderId: string,
    toEmail: string,
    subject: string,
    htmlBody: string,
    attachmentName?: string,
    attachmentBase64?: string
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const senderId = session.user.id;

        const order = await prisma.salesOrder.findUnique({
            where: { id: orderId },
            include: { customer: true }
        });

        if (!order) {
            return { success: false, error: "Đơn đặt hàng không tồn tại." };
        }

        const res = await sendEmailWithTracking({
            to: toEmail,
            subject,
            htmlBody,
            senderId,
            customerId: order.customerId,
            // Assuming there isn't an orderId tracking field in emailLog, we might omit or add later
            // We'll omit it for now since mailer parameter doesn't explicitly have orderId
            attachmentName,
            attachmentBase64
        });

        if (res.success) {
            // Log if needed
            revalidatePath(`/sales/orders/${orderId}`);
            return { success: true };
        } else {
            return { success: false, error: res.error };
        }
    } catch (error: any) {
        console.error("sendOrderEmail error:", error);
        return { success: false, error: "Lỗi hệ thống khi gửi email." };
    }
}

const itemSchema = z.object({
    id: z.string().optional(),
    productId: z.string().optional(),
    customName: z.string().optional(),
    description: z.string().optional(),
    unit: z.string().optional(),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Unit price must be >= 0"),
    taxRate: z.number().min(0, "Tax rate must be >= 0"),
    totalPrice: z.number().min(0, "Total price must be >= 0")
});

const orderSchema = z.object({
    code: z.string().min(1, "Code is required"),
    date: z.string().transform((str) => new Date(str)),
    status: z.string().default("DRAFT"),
    notes: z.string().optional(),
    customerId: z.string().min(1, "Customer is required"),
    subTotal: z.number().min(0, "Subtotal must be >= 0"),
    taxAmount: z.number().min(0, "Tax amount must be >= 0"),
    totalAmount: z.number().min(0, "Total amount must be >= 0"),
    items: z.array(itemSchema).min(1, "At least one item is required")
});

export async function submitSalesOrder(creatorId: string, formData: any) {
    try {
        const user = await verifyActionPermission('SALES_ORDERS_CREATE');
        const actualCreatorId = user ? (user as any).id : creatorId;

        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        let finalCode = formData.code;
        const existingOrder = await prisma.salesOrder.findUnique({ where: { code: finalCode } });
        if (existingOrder) {
            finalCode = await getNextOrderCode();
        }

        const order = await prisma.salesOrder.create({
            data: {
                code: finalCode,
                date: new Date(formData.date),
                status: formData.status || "DRAFT",
                notes: formData.notes,
                customerId: formData.customerId,
                subTotal: formData.subTotal,
                taxAmount: formData.taxAmount,
                totalAmount: formData.totalAmount,
                ...(formData.projectId ? { projects: { connect: [{ id: formData.projectId }] } } : {}),
                creatorId: actualCreatorId,
                items: {
                    create: formData.items.map((item: any) => ({
                        productId: item.productId || null,
                        customName: item.customName || null,
                        description: item.description || null,
                        unit: item.unit || null,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0,
                        taxAmount: item.taxAmount || 0,
                        totalPrice: item.totalPrice,
                        isSubItem: item.isSubItem || false
                    }))
                }
            },
            include: {
                customer: true,
                creator: true
            }
        });

        revalidatePath('/sales/orders');
        return { success: true, data: order };
    } catch (error: any) {
        console.error("Lỗi khi tạo Đơn Đặt Hàng:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSalesOrder(id: string, formData: any) {
    try {
        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const existing = await prisma.salesOrder.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Đơn đặt hàng không tồn tại" };
        await verifyActionOwnership('SALES_ORDERS', 'EDIT', existing.creatorId);

        const order = await prisma.salesOrder.update({
            where: { id },
            data: {
                code: formData.code,
                date: new Date(formData.date),
                status: formData.status || "DRAFT",
                notes: formData.notes,
                customerId: formData.customerId,
                subTotal: formData.subTotal,
                taxAmount: formData.taxAmount,
                totalAmount: formData.totalAmount,
                ...(formData.projectId ? { projects: { connect: [{ id: formData.projectId }] } } : {}),
                items: {
                    deleteMany: {},
                    create: formData.items.map((item: any) => ({
                        productId: item.productId || null,
                        customName: item.customName || null,
                        description: item.description || null,
                        unit: item.unit || null,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate || 0,
                        taxAmount: item.taxAmount || 0,
                        totalPrice: item.totalPrice,
                        isSubItem: item.isSubItem || false
                    }))
                }
            },
            include: {
                customer: true,
                creator: true
            }
        });

        revalidatePath('/sales/orders');
        return { success: true, data: order };
    } catch (error: any) {
        console.error("Lỗi khi cập nhật Đơn Đặt Hàng:", error);
        return { success: false, error: error.message };
    }
}

export async function getSalesOrders(employeeId?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return [];

        const permissions = session.user.permissions as string[] || [];
        const viewAll = permissions.includes('SALES_ORDERS_VIEW_ALL');
        const viewOwn = permissions.includes('SALES_ORDERS_VIEW_OWN');

        if (!viewAll && !viewOwn) return [];

        let whereClause: any = {};

        if (viewAll) {
            if (employeeId) {
                whereClause = { creatorId: employeeId };
            }
        } else if (viewOwn) {
            whereClause = { creatorId: session.user.id };
        }

        return await prisma.salesOrder.findMany({
            where: whereClause,
            include: {
                customer: true,
                creator: true,
                items: {
                    include: { product: true }
                }
            },
            orderBy: { date: 'desc' }
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách Đơn Hàng:", error);
        return [];
    }
}

export async function updateSalesOrderStatus(id: string, newStatus: string) {
    try {
        const existing = await prisma.salesOrder.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Đơn hàng không tồn tại" };
        await verifyActionOwnership('SALES_ORDERS', 'EDIT', existing.creatorId);

        const order = await prisma.salesOrder.update({
            where: { id },
            data: { status: newStatus }
        });
        revalidatePath('/sales/orders');
        return { success: true, data: order };
    } catch (error: any) {
        console.error("Lỗi cập nhật trạng thái Đơn Hàng:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteSalesOrder(id: string) {
    try {
        const existing = await prisma.salesOrder.findUnique({ where: { id } });
        if (!existing) return { success: false, error: "Đơn hàng không tồn tại" };
        await verifyActionOwnership('SALES_ORDERS', 'DELETE', existing.creatorId);

        await prisma.salesOrder.delete({ where: { id } });
        revalidatePath('/sales/orders');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getNextOrderCode() {
    const orders = await prisma.salesOrder.findMany({ select: { code: true } });
    let maxOrdNum = 0;
    for (const ord of orders) {
        const m = ord.code.match(/\d+/);
        if (m) {
            const n = parseInt(m[0], 10);
            if (!isNaN(n) && n > maxOrdNum) maxOrdNum = n;
        }
    }
    return `SO${String(maxOrdNum + 1).padStart(4, '0')}`;
}

export async function getSalesOrderById(id: string) {
    try {
        const order = await prisma.salesOrder.findUnique({
            where: { id },
            include: {
                customer: true,
                creator: true,
                items: {
                    include: { product: true }
                }
            }
        });
        return { success: true, data: order };
    } catch (error: any) {
        console.error("Lỗi lấy chi tiết Đơn Đặt Hàng:", error);
        return { success: false, error: error.message };
    }
}

export async function convertOrderToInvoice(orderId: string) {
    try {
        const order = await prisma.salesOrder.findUnique({
            where: { id: orderId },
            include: { items: true }
        });
        if (!order) return { success: false, error: "Đơn đặt hàng không tồn tại." };

        await verifyActionOwnership('SALES_ORDERS', 'EDIT', order.creatorId);
        const user = await verifyActionPermission('SALES_INVOICES_CREATE');
        const actualCreatorId = user ? (user as any).id : 'system';

        if (!order) return { success: false, error: "Đơn đặt hàng không tồn tại." };

        // Lấy mã Invoice tiếp theo dùng config tự động
        const nextCode = await getNextInvoiceCode();

        const invoice = await prisma.salesInvoice.create({
            data: {
                code: nextCode,
                date: new Date(),
                status: "DRAFT",
                notes: `Tạo từ Đơn đặt hàng ${order.code}`,
                customerId: order.customerId,
                subTotal: order.subTotal,
                taxAmount: order.taxAmount,
                totalAmount: order.totalAmount,
                creatorId: actualCreatorId,
                items: {
                    create: order.items.map((i: any) => ({
                        productId: i.productId,
                        customName: i.customName,
                        description: i.description,
                        unit: i.unit,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        taxRate: i.taxRate,
                        taxAmount: i.taxAmount,
                        totalPrice: i.totalPrice,
                        isSubItem: i.isSubItem || false
                    }))
                }
            }
        });

        // Đánh dấu Đơn đặt hàng đã Hoàn Thành hoặc Chốt (thường là COMPLETED)
        await prisma.salesOrder.update({
            where: { id: orderId },
            data: { status: 'COMPLETED' }
        });

        revalidatePath('/sales/invoices');
        revalidatePath('/sales/orders');

        return { success: true, data: invoice };
    } catch (error: any) {
        console.error("Lỗi khi chuyển thành Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

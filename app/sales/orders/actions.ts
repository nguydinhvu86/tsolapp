'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const itemSchema = z.object({
    id: z.string().optional(),
    productId: z.string().min(1, "Product is required"),
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
        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const order = await prisma.salesOrder.create({
            data: {
                code: formData.code,
                date: new Date(formData.date),
                status: formData.status || "DRAFT",
                notes: formData.notes,
                customerId: formData.customerId,
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

        revalidatePath('/sales/orders');
        return { success: true, data: order };
    } catch (error: any) {
        console.error("Lỗi khi cập nhật Đơn Đặt Hàng:", error);
        return { success: false, error: error.message };
    }
}

export async function getSalesOrders() {
    try {
        return await prisma.salesOrder.findMany({
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
        await prisma.salesOrder.delete({ where: { id } });
        revalidatePath('/sales/orders');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getNextOrderCode() {
    const lastOrder = await prisma.salesOrder.findFirst({
        orderBy: { code: 'desc' }
    });
    if (!lastOrder) return 'SO0001';
    const numPart = parseInt(lastOrder.code.replace('SO', ''), 10);
    return `SO${String(numPart + 1).padStart(4, '0')}`;
}

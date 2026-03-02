'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const itemSchema = z.object({
    id: z.string().optional(),
    productId: z.string().min(1, "Product is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Unit price must be >= 0"),
    taxRate: z.number().min(0, "Tax rate must be >= 0"),
    totalPrice: z.number().min(0, "Total price must be >= 0")
});

const estimateSchema = z.object({
    code: z.string().min(1, "Code is required"),
    date: z.string().transform((str) => new Date(str)),
    validUntil: z.string().optional().transform((str) => str ? new Date(str) : null),
    status: z.string().default("DRAFT"),
    notes: z.string().optional(),
    customerId: z.string().min(1, "Customer is required"),
    subTotal: z.number().min(0, "Subtotal must be >= 0"),
    taxAmount: z.number().min(0, "Tax amount must be >= 0"),
    totalAmount: z.number().min(0, "Total amount must be >= 0"),
    items: z.array(itemSchema).min(1, "At least one item is required") // Custom validator
});

export async function submitSalesEstimate(creatorId: string, formData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const actualCreatorId = session.user.id;

        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const estimate = await prisma.salesEstimate.create({
            data: {
                code: formData.code,
                date: new Date(formData.date),
                validUntil: formData.validUntil ? new Date(formData.validUntil) : null,
                status: formData.status || "DRAFT",
                notes: formData.notes,
                customerId: formData.customerId,
                subTotal: formData.subTotal,
                taxAmount: formData.taxAmount,
                totalAmount: formData.totalAmount,
                creatorId: actualCreatorId,
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

        revalidatePath('/sales/estimates');
        return { success: true, data: estimate };
    } catch (error: any) {
        console.error("Lỗi khi tạo Báo Giá Kinh Doanh:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSalesEstimate(id: string, formData: any) {
    try {
        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const estimate = await prisma.salesEstimate.update({
            where: { id },
            data: {
                code: formData.code,
                date: new Date(formData.date),
                validUntil: formData.validUntil ? new Date(formData.validUntil) : null,
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

        revalidatePath('/sales/estimates');
        return { success: true, data: estimate };
    } catch (error: any) {
        console.error("Lỗi khi cập nhật Báo Giá Kinh Doanh:", error);
        return { success: false, error: error.message };
    }
}

export async function getSalesEstimates() {
    try {
        return await prisma.salesEstimate.findMany({
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
        console.error("Lỗi khi lấy danh sách Báo Giá:", error);
        return [];
    }
}

export async function updateSalesEstimateStatus(id: string, newStatus: string) {
    try {
        const estimate = await prisma.salesEstimate.update({
            where: { id },
            data: { status: newStatus }
        });
        revalidatePath('/sales/estimates');
        return { success: true, data: estimate };
    } catch (error: any) {
        console.error("Lỗi cập nhật trạng thái Báo Giá:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteSalesEstimate(id: string) {
    try {
        await prisma.salesEstimate.delete({ where: { id } });
        revalidatePath('/sales/estimates');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getNextEstimateCode() {
    const last = await prisma.salesEstimate.findFirst({
        orderBy: { code: 'desc' }
    });
    if (!last) return 'BG0001';
    const numPart = parseInt(last.code.replace('BG', ''), 10);
    return `BG${String(numPart + 1).padStart(4, '0')}`;
}

export async function convertEstimateToInvoice(estimateId: string, creatorId: string) {
    try {
        const estimate = await prisma.salesEstimate.findUnique({
            where: { id: estimateId },
            include: { items: true }
        });

        if (!estimate) return { success: false, error: "Báo giá không tồn tại." };

        // Lấy mã Invoice tiếp theo
        const lastInvoice = await prisma.salesInvoice.findFirst({
            orderBy: { code: 'desc' }
        });

        let nextCode = 'INV0001';
        if (lastInvoice) {
            const numPart = parseInt(lastInvoice.code.replace('INV', ''), 10);
            nextCode = `INV${String(numPart + 1).padStart(4, '0')}`;
        }

        const invoice = await prisma.salesInvoice.create({
            data: {
                code: nextCode,
                date: new Date(),
                status: "DRAFT",
                notes: `Tạo từ Báo giá ${estimate.code}`,
                customerId: estimate.customerId,
                subTotal: estimate.subTotal,
                taxAmount: estimate.taxAmount,
                totalAmount: estimate.totalAmount,
                creatorId: creatorId,
                items: {
                    create: estimate.items.map((i: any) => ({
                        productId: i.productId,
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        taxRate: i.taxRate,
                        taxAmount: i.taxAmount,
                        totalPrice: i.totalPrice
                    }))
                }
            }
        });

        // Đánh dấu Báo giá đã Chốt
        await prisma.salesEstimate.update({
            where: { id: estimateId },
            data: { status: 'ACCEPTED' }
        });

        revalidatePath('/sales/invoices');
        revalidatePath('/sales/estimates');

        return { success: true, data: invoice };
    } catch (error: any) {
        console.error("Lỗi khi chuyển thành Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

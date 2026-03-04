'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logCustomerActivity } from '@/lib/customerLogger';

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
    tags: z.string().optional(),
    customerId: z.string().min(1, "Customer is required"),
    subTotal: z.number().min(0, "Subtotal must be >= 0"),
    taxAmount: z.number().min(0, "Tax amount must be >= 0"),
    totalAmount: z.number().min(0, "Total amount must be >= 0"),
    items: z.array(itemSchema).min(1, "At least one item is required") // Custom validator
});

export async function logSalesEstimateActivity(estimateId: string, userId: string, action: string, details?: string) {
    try {
        await prisma.salesEstimateActivityLog.create({
            data: { estimateId, userId, action, details }
        });
    } catch (e) {
        console.error("Failed to log activity:", e);
    }
}

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
                tags: formData.tags || null,
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

        await logSalesEstimateActivity(estimate.id, actualCreatorId, 'CREATED', 'Tạo Báo giá mới');

        // Log to unified Customer History
        await logCustomerActivity(formData.customerId, actualCreatorId, 'TẠO_BÁO_GIÁ', `Tạo Báo giá: ${formData.code}`);

        revalidatePath('/sales/estimates');
        return { success: true, data: estimate };
    } catch (error: any) {
        console.error("Lỗi khi tạo Báo Giá Kinh Doanh:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSalesEstimate(id: string, formData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const userId = session.user.id;

        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const oldEstimate = await prisma.salesEstimate.findUnique({
            where: { id },
            include: { items: { include: { product: true } }, customer: true }
        });

        if (!oldEstimate) {
            return { success: false, error: "Không tìm thấy báo giá." };
        }

        const changes: string[] = [];

        // So sánh khách hàng
        if (oldEstimate.customerId !== formData.customerId) {
            const newCustomer = await prisma.customer.findUnique({ where: { id: formData.customerId } });
            changes.push(`Đổi Khách hàng từ **${oldEstimate.customer?.name}** sang **${newCustomer?.name}**`);
        }

        // So sánh ngày
        const oldDateStr = oldEstimate.date.toISOString().split('T')[0];
        const newDateStr = new Date(formData.date).toISOString().split('T')[0];
        if (oldDateStr !== newDateStr) {
            const fmtOld = oldEstimate.date.toLocaleDateString('vi-VN');
            const fmtNew = new Date(formData.date).toLocaleDateString('vi-VN');
            changes.push(`Đổi Ngày báo giá từ **${fmtOld}** sang **${fmtNew}**`);
        }

        // So sánh ngày hết hạn
        const oldValidStr = oldEstimate.validUntil ? oldEstimate.validUntil.toISOString().split('T')[0] : null;
        const newValidStr = formData.validUntil ? new Date(formData.validUntil).toISOString().split('T')[0] : null;
        if (oldValidStr !== newValidStr) {
            const fmtOld = oldEstimate.validUntil ? oldEstimate.validUntil.toLocaleDateString('vi-VN') : 'Không có';
            const fmtNew = formData.validUntil ? new Date(formData.validUntil).toLocaleDateString('vi-VN') : 'Không có';
            changes.push(`Đổi Ngày hết hạn từ **${fmtOld}** sang **${fmtNew}**`);
        }

        // So sánh ghi chú
        if ((oldEstimate.notes || '') !== (formData.notes || '')) {
            changes.push(`Đã thay đổi **Ghi chú**`);
        }

        // Thu thập thông tin sản phẩm
        const oldItemsMap = new Map(oldEstimate.items.map(item => [item.productId, item]));
        const newItemsMap = new Map((formData.items as any[]).map(item => [item.productId, item]));

        // Kiểm tra xóa sản phẩm & sửa sản phẩm
        const deletedProducts: string[] = [];
        for (const [productId, oldItem] of Array.from(oldItemsMap.entries())) {
            const newItem = newItemsMap.get(productId);
            if (!newItem) {
                deletedProducts.push(oldItem.product?.name || 'Sản phẩm không rõ');
            } else {
                let itemChanges: string[] = [];
                if (oldItem.quantity !== newItem.quantity) {
                    itemChanges.push(`số lượng (${oldItem.quantity} ➔ ${newItem.quantity})`);
                }
                if (oldItem.unitPrice !== newItem.unitPrice) {
                    itemChanges.push(`đơn giá (${oldItem.unitPrice.toLocaleString('vi-VN')} ➔ ${newItem.unitPrice.toLocaleString('vi-VN')})`);
                }
                if (oldItem.taxRate !== (newItem.taxRate || 0)) {
                    itemChanges.push(`thuế (${oldItem.taxRate}% ➔ ${newItem.taxRate || 0}%)`);
                }
                if (itemChanges.length > 0) {
                    changes.push(`Cập nhật **${oldItem.product?.name}**: ${itemChanges.join(', ')}`);
                }
            }
        }

        if (deletedProducts.length > 0) {
            changes.push(`Xóa sản phẩm: **${deletedProducts.join(', ')}**`);
        }

        // Kiểm tra thêm sản phẩm mới
        const newProductIds = Array.from(newItemsMap.keys()).filter(id => !oldItemsMap.has(id));
        if (newProductIds.length > 0) {
            const newProducts = await prisma.product.findMany({
                where: { id: { in: newProductIds } },
                select: { id: true, name: true }
            });
            const newProductNames = newProducts.map(p => p.name);
            changes.push(`Thêm sản phẩm mới: **${newProductNames.join(', ')}**`);
        }

        const estimate = await prisma.salesEstimate.update({
            where: { id },
            data: {
                code: formData.code,
                date: new Date(formData.date),
                validUntil: formData.validUntil ? new Date(formData.validUntil) : null,
                status: formData.status || "DRAFT",
                notes: formData.notes,
                tags: formData.tags || null,
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

        const customDetails = changes.length > 0 ? JSON.stringify({ diffs: changes }) : 'Cập nhật nội dung Báo giá';

        await logSalesEstimateActivity(estimate.id, userId, 'UPDATED', customDetails);

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
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' }
            ]
        });
    } catch (error) {
        console.error("Lỗi khi lấy danh sách Báo Giá:", error);
        return [];
    }
}

export async function updateSalesEstimateStatus(id: string, newStatus: string) {
    try {
        const session = await getServerSession(authOptions);
        const userId = session?.user?.id;

        const estimate = await prisma.salesEstimate.update({
            where: { id },
            data: { status: newStatus }
        });

        if (userId) {
            await logSalesEstimateActivity(id, userId, 'STATUS_CHANGED', JSON.stringify({ to: newStatus }));
            await logCustomerActivity(estimate.customerId, userId, 'CẬP_NHẬT_TRẠNG_THÁI', `Báo giá ${estimate.code} chuyển trạng thái: ${newStatus}`);
        }

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
    const estimates = await prisma.salesEstimate.findMany({ select: { code: true } });

    let maxNum = 0;
    for (const est of estimates) {
        const m = est.code.match(/\d+/);
        if (m) {
            const n = parseInt(m[0], 10);
            if (!isNaN(n) && n > maxNum) {
                maxNum = n;
            }
        }
    }

    return `BG${String(maxNum + 1).padStart(4, '0')}`;
}

export async function convertEstimateToInvoice(estimateId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const actualCreatorId = session.user.id;

        const estimate = await prisma.salesEstimate.findUnique({
            where: { id: estimateId },
            include: { items: true }
        });

        if (!estimate) return { success: false, error: "Báo giá không tồn tại." };

        // Lấy mã Invoice tiếp theo (bỏ sort bằng string để tránh INV9999 > INV10000)
        const invoices = await prisma.salesInvoice.findMany({ select: { code: true } });
        let maxInvNum = 0;
        for (const inv of invoices) {
            const m = inv.code.match(/\d+/);
            if (m) {
                const n = parseInt(m[0], 10);
                if (!isNaN(n) && n > maxInvNum) maxInvNum = n;
            }
        }
        const nextCode = `INV${String(maxInvNum + 1).padStart(4, '0')}`;

        const { invoice, estimateId: estId, actualCreatorId: creatorId } = await prisma.$transaction(async (tx) => {
            const invoice = await tx.salesInvoice.create({
                data: {
                    code: nextCode,
                    date: new Date(),
                    status: "DRAFT",
                    notes: `Tạo từ Báo giá ${estimate.code}`,
                    tags: estimate.tags,
                    customerId: estimate.customerId,
                    subTotal: estimate.subTotal,
                    taxAmount: estimate.taxAmount,
                    totalAmount: estimate.totalAmount,
                    creatorId: actualCreatorId,
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

            // Đánh dấu Báo giá đã Lên Hóa Đơn
            await tx.salesEstimate.update({
                where: { id: estimateId },
                data: { status: 'INVOICED' }
            });

            await tx.salesEstimateActivityLog.create({
                data: { estimateId, userId: actualCreatorId, action: 'STATUS_CHANGED', details: JSON.stringify({ to: 'INVOICED' }) }
            });
            await tx.salesEstimateActivityLog.create({
                data: { estimateId, userId: actualCreatorId, action: 'CONVERTED', details: `Đã tạo Hóa Đơn: ${invoice.code}` }
            });

            // Ghi log qua Customer History
            await tx.customerActivityLog.create({
                data: {
                    customerId: estimate.customerId,
                    userId: actualCreatorId,
                    action: 'TẠO_HÓA_ĐƠN',
                    details: `Tạo hóa đơn ${invoice.code} từ báo giá ${estimate.code}`
                }
            });

            return { invoice, estimateId, actualCreatorId };
        }, { maxWait: 5000, timeout: 15000 });

        revalidatePath('/sales/invoices');
        revalidatePath('/sales/estimates');

        return { success: true, data: invoice };
    } catch (error: any) {
        console.error("Lỗi khi chuyển thành Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function convertEstimateToOrder(estimateId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const actualCreatorId = session.user.id;

        const estimate = await prisma.salesEstimate.findUnique({
            where: { id: estimateId },
            include: { items: true }
        });

        if (!estimate) return { success: false, error: "Báo giá không tồn tại." };

        // Lấy mã Đơn Hàng tiếp theo
        const orders = await prisma.salesOrder.findMany({ select: { code: true } });
        let maxOrdNum = 0;
        for (const ord of orders) {
            const m = ord.code.match(/\d+/);
            if (m) {
                const n = parseInt(m[0], 10);
                if (!isNaN(n) && n > maxOrdNum) maxOrdNum = n;
            }
        }
        const nextCode = `SO${String(maxOrdNum + 1).padStart(4, '0')}`;

        const { order, estimateId: estId, actualCreatorId: creatorId } = await prisma.$transaction(async (tx) => {
            const order = await tx.salesOrder.create({
                data: {
                    code: nextCode,
                    date: new Date(),
                    status: "DRAFT",
                    notes: `Tạo từ Báo giá ${estimate.code}`,
                    customerId: estimate.customerId,
                    subTotal: estimate.subTotal,
                    taxAmount: estimate.taxAmount,
                    totalAmount: estimate.totalAmount,
                    creatorId: actualCreatorId,
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

            // Đánh dấu Báo giá đã Lên Đơn Hàng
            await tx.salesEstimate.update({
                where: { id: estimateId },
                data: { status: 'ORDERED' }
            });

            await tx.salesEstimateActivityLog.create({
                data: { estimateId, userId: actualCreatorId, action: 'STATUS_CHANGED', details: JSON.stringify({ to: 'ORDERED' }) }
            });
            await tx.salesEstimateActivityLog.create({
                data: { estimateId, userId: actualCreatorId, action: 'CONVERTED', details: `Đã tạo Đơn Đặt Hàng: ${order.code}` }
            });

            await tx.customerActivityLog.create({
                data: {
                    customerId: estimate.customerId,
                    userId: actualCreatorId,
                    action: 'TẠO_ĐƠN_HÀNG',
                    details: `Tạo đơn đặt hàng ${order.code} từ báo giá ${estimate.code}`
                }
            });

            return { order, estimateId, actualCreatorId };
        }, { maxWait: 5000, timeout: 15000 });

        revalidatePath('/sales/orders');
        revalidatePath('/sales/estimates');

        return { success: true, data: order };
    } catch (error: any) {
        console.error("Lỗi khi chuyển thành Đơn Đặt Hàng:", error);
        return { success: false, error: error.message };
    }
}

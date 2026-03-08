'use server';
import { formatDate } from '@/lib/utils/formatters';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logCustomerActivity } from '@/lib/customerLogger';
import { getNextInvoiceCode } from '../invoices/actions';
import { createNotification } from '@/app/notifications/actions';

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

import { sendEmailWithTracking } from '@/lib/mailer';

export async function sendEstimateEmail(
    estimateId: string,
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

        const estimate = await prisma.salesEstimate.findUnique({
            where: { id: estimateId },
            include: { customer: true }
        });

        if (!estimate) {
            return { success: false, error: "Báo giá không tồn tại." };
        }

        const res = await sendEmailWithTracking({
            to: toEmail,
            subject,
            htmlBody,
            senderId,
            customerId: estimate.customerId,
            estimateId: estimate.id,
            attachmentName,
            attachmentBase64
        });

        if (res.success) {
            await logSalesEstimateActivity(estimate.id, senderId, 'EMAIL_SENT', `Đã gửi email báo giá tới ${toEmail} với tiêu đề "${subject}"`);
            // Automatically mark SENT if DRAFT
            if (estimate.status === 'DRAFT') {
                await updateSalesEstimateStatus(estimate.id, 'SENT');
            }
            revalidatePath(`/sales/estimates/${estimateId}`);
            return { success: true };
        } else {
            return { success: false, error: res.error };
        }
    } catch (error: any) {
        console.error("sendEstimateEmail error:", error);
        return { success: false, error: "Lỗi hệ thống khi gửi email." };
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
                salespersonId: formData.salespersonId || actualCreatorId,
                leadId: formData.leadId || null,
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

        // So sánh người báo giá
        if (oldEstimate.salespersonId !== formData.salespersonId) {
            const oldSalesperson = oldEstimate.salespersonId ? await prisma.user.findUnique({ where: { id: oldEstimate.salespersonId } }) : null;
            const newSalesperson = formData.salespersonId ? await prisma.user.findUnique({ where: { id: formData.salespersonId } }) : null;
            changes.push(`Đổi Người báo giá từ **${oldSalesperson?.name || 'Không có'}** sang **${newSalesperson?.name || 'Không có'}**`);
        }

        // So sánh ngày
        const oldDateStr = oldEstimate.date.toISOString().split('T')[0];
        const newDateStr = new Date(formData.date).toISOString().split('T')[0];
        if (oldDateStr !== newDateStr) {
            const fmtOld = formatDate(oldEstimate.date);
            const fmtNew = formatDate(new Date(formData.date));
            changes.push(`Đổi Ngày báo giá từ **${fmtOld}** sang **${fmtNew}**`);
        }

        // So sánh ngày hết hạn
        const oldValidStr = oldEstimate.validUntil ? oldEstimate.validUntil.toISOString().split('T')[0] : null;
        const newValidStr = formData.validUntil ? new Date(formData.validUntil).toISOString().split('T')[0] : null;
        if (oldValidStr !== newValidStr) {
            const fmtOld = oldEstimate.validUntil ? formatDate(oldEstimate.validUntil) : 'Không có';
            const fmtNew = formData.validUntil ? formatDate(new Date(formData.validUntil)) : 'Không có';
            changes.push(`Đổi Ngày hết hạn từ **${fmtOld}** sang **${fmtNew}**`);
        }

        // So sánh ghi chú
        if ((oldEstimate.notes || '') !== (formData.notes || '')) {
            changes.push(`Đã thay đổi **Ghi chú**`);
        }

        // Thu thập thông tin sản phẩm
        const oldItemsMap = new Map(oldEstimate.items.map((item: any) => [item.productId || item.customName, item]));
        const newItemsMap = new Map((formData.items as any[]).map((item: any) => [item.productId || item.customName, item]));

        // Kiểm tra xóa sản phẩm & sửa sản phẩm
        const deletedProducts: string[] = [];
        for (const [key, oldItem] of Array.from(oldItemsMap.entries())) {
            const newItem = newItemsMap.get(key);
            const itemName = oldItem.customName || oldItem.product?.name || 'Sản phẩm tự do';
            if (!newItem) {
                deletedProducts.push(itemName);
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
                    changes.push(`Cập nhật **${itemName}**: ${itemChanges.join(', ')}`);
                }
            }
        }

        if (deletedProducts.length > 0) {
            changes.push(`Xóa sản phẩm: **${deletedProducts.join(', ')}**`);
        }

        // Kiểm tra thêm sản phẩm mới
        const newKeys = Array.from(newItemsMap.keys()).filter(key => !oldItemsMap.has(key));
        if (newKeys.length > 0) {
            changes.push(`Thêm ${newKeys.length} dòng sản phẩm mới`);
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
                salespersonId: formData.salespersonId || null,
                leadId: formData.leadId || null,
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

export async function getSalesEstimates(employeeId?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return [];

        const isAdminOrManager = session.user.role === 'ADMIN' || session.user.role === 'MANAGER';
        let effectiveEmployeeId: string | undefined = undefined;

        if (!isAdminOrManager) {
            effectiveEmployeeId = session.user.id;
        } else if (employeeId) {
            effectiveEmployeeId = employeeId;
        }

        const whereClause = effectiveEmployeeId ? {
            OR: [
                { creatorId: effectiveEmployeeId },
                { salespersonId: effectiveEmployeeId }
            ]
        } : {};

        return await prisma.salesEstimate.findMany({
            where: whereClause,
            include: {
                customer: true,
                creator: true,
                salesperson: true,
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

        if (newStatus === 'ACCEPTED' || newStatus === 'REJECTED') {
            const statusText = newStatus === 'ACCEPTED' ? 'chốt' : 'từ chối';
            const typeClass = newStatus === 'ACCEPTED' ? 'SUCCESS' : 'ERROR';

            // Only notify if the person changing the status is NOT the creator
            if (userId !== estimate.creatorId) {
                await createNotification(
                    estimate.creatorId,
                    `Báo giá đã được ${statusText}`,
                    `Báo giá ${estimate.code} đã chuyển sang trạng thái ${newStatus}.`,
                    typeClass,
                    `/sales/estimates/${estimate.id}`
                );
            }
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
    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['ESTIMATE_CODE_FORMAT', 'ESTIMATE_START_SEQ'] } }
    });
    const formatSetting = settings.find(s => s.key === 'ESTIMATE_CODE_FORMAT');
    const startSeqSetting = settings.find(s => s.key === 'ESTIMATE_START_SEQ');

    const format = formatSetting?.value || 'BG{SEQ}';
    const startSeq = parseInt(startSeqSetting?.value || '1', 10) || 1;

    const estimates = await prisma.salesEstimate.findMany({ select: { code: true } });

    // Generate regex to match codes of this format and extract {SEQ}
    const escapedPrefix = format.split('{SEQ}')[0]?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || '';
    const escapedSuffix = format.split('{SEQ}')[1]?.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') || '';

    // Replace {MM} and {YYYY} in regex with actual current month/year to only match current month/year codes?
    // Actually, usually sequence should just increment regardless of month/year unless sequence resets every month.
    // Let's just extract the number where {SEQ} is located.
    // Regex: ^PREFIX(\d+)SUFFIX$
    // But prefix might contain {MM} and {YYYY}. Let's substitute them first for the CURRENT date to find max sequence of current date.
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());

    const dateReplacedFormat = format.replace('{MM}', mm).replace('{YYYY}', yyyy);
    const prefix = dateReplacedFormat.split('{SEQ}')[0] || '';
    const suffix = dateReplacedFormat.split('{SEQ}')[1] || '';

    const safePrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(`^${safePrefix}(\\d+)${safeSuffix}$`);

    let maxNum = 0;
    for (const est of estimates) {
        const m = est.code.match(regex);
        if (m && m[1]) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxNum) {
                maxNum = n;
            }
        }
    }

    const nextNumber = Math.max(maxNum + 1, startSeq);
    const nextSeq = String(nextNumber).padStart(4, '0');
    return prefix + nextSeq + suffix;
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

        // Lấy mã Invoice tiếp theo dùng config tự động
        const nextCode = await getNextInvoiceCode();

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
                    salespersonId: estimate.salespersonId,
                    items: {
                        create: estimate.items.map((i: any) => ({
                            productId: i.productId,
                            customName: i.customName,
                            description: i.description,
                            unit: i.unit,
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
                            customName: i.customName,
                            description: i.description,
                            unit: i.unit,
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

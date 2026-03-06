'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logCustomerActivity } from '@/lib/customerLogger';
import { sendEmailWithTracking } from '@/lib/mailer';

export async function sendInvoiceEmail(
    invoiceId: string,
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

        const invoice = await prisma.salesInvoice.findUnique({
            where: { id: invoiceId },
            include: { customer: true }
        });

        if (!invoice) {
            return { success: false, error: "Hóa đơn không tồn tại." };
        }

        const res = await sendEmailWithTracking({
            to: toEmail,
            subject,
            htmlBody,
            senderId,
            customerId: invoice.customerId,
            invoiceId: invoice.id,
            attachmentName,
            attachmentBase64
        });

        if (res.success) {
            await prisma.salesInvoiceActivityLog.create({
                data: {
                    invoiceId: invoice.id,
                    userId: senderId,
                    action: 'CẬP_NHẬT',
                    details: `Đã gửi email hóa đơn tới ${toEmail} với tiêu đề "${subject}"`
                }
            });
            revalidatePath(`/sales/invoices/${invoiceId}`);
            return { success: true };
        } else {
            return { success: false, error: res.error };
        }
    } catch (error: any) {
        console.error("sendInvoiceEmail error:", error);
        return { success: false, error: "Lỗi hệ thống khi gửi email." };
    }
}

export async function submitSalesInvoice(creatorId: string, formData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const actualCreatorId = session.user.id;
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
                tags: formData.tags || null,
                customerId: formData.customerId,
                orderId: formData.orderId || null,
                subTotal: formData.subTotal,
                taxAmount: formData.taxAmount,
                totalAmount: formData.totalAmount,
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
                        totalPrice: item.totalPrice
                    }))
                }
            }
        });

        // Hóa đơn được tạo ở trạng thái ISSUED luôn, hoặc DRAFT rồi mới duyệt sang ISSUED.
        // Nếu truyền DRAFT và ISSUED ngay -> cập nhật kho. Ở đây cho phép lưu DRAFT trước.

        await logCustomerActivity(formData.customerId, actualCreatorId, 'TẠO_HÓA_ĐƠN', `Tạo hóa đơn: ${formData.code}`);

        await prisma.salesInvoiceActivityLog.create({
            data: {
                invoiceId: invoice.id,
                userId: actualCreatorId,
                action: 'TẠO_HÓA_ĐƠN',
                details: `Khởi tạo hóa đơn: ${invoice.code}`
            }
        });

        revalidatePath('/sales/invoices');
        return { success: true, data: invoice };
    } catch (error: any) {
        console.error("Lỗi khi tạo Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSalesInvoice(id: string, formData: any) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const actualUserId = session.user.id;

        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        const existingInvoice = await prisma.salesInvoice.findUnique({
            where: { id },
            include: { items: true }
        });
        if (!existingInvoice) {
            return { success: false, error: "Không tìm thấy hóa đơn." };
        }
        if (existingInvoice.status !== "DRAFT") {
            return { success: false, error: "Chỉ Hóa Đơn Dự Thảo (DRAFT) mới có thể sửa." };
        }

        const invoice = await prisma.salesInvoice.update({
            where: { id },
            data: {
                code: formData.code,
                date: new Date(formData.date),
                dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
                status: formData.status || "DRAFT",
                notes: formData.notes,
                tags: formData.tags || null,
                customerId: formData.customerId,
                orderId: formData.orderId || null,
                subTotal: formData.subTotal,
                taxAmount: formData.taxAmount,
                totalAmount: formData.totalAmount,
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

        const changes: string[] = [];
        if (existingInvoice.totalAmount !== formData.totalAmount) {
            changes.push(`Tổng tiền: ${existingInvoice.totalAmount.toLocaleString('vi-VN')} đ ➔ ${formData.totalAmount.toLocaleString('vi-VN')} đ`);
        }

        const oldItemsStr = existingInvoice.items.map((i: any) => `${i.productId || i.customName}:${i.quantity}:${i.unitPrice}`).sort().join(',');
        const newItemsStr = formData.items.map((i: any) => `${i.productId || i.customName}:${i.quantity}:${i.unitPrice}`).sort().join(',');
        if (oldItemsStr !== newItemsStr) {
            changes.push(`Danh sách chi tiết sản phẩm / số lượng / đơn giá đã bị cập nhật.`);
        }

        if ((existingInvoice.notes || "") !== (formData.notes || "")) {
            changes.push("Ghi chú của hóa đơn đã được chỉnh sửa.");
        }

        let detailsLog = "Cập nhật thông tin hóa đơn";
        if (changes.length > 0) {
            detailsLog = JSON.stringify({
                type: 'UPDATE_DIFF',
                summary: 'Cập nhật thông tin hóa đơn',
                changes: changes
            });
        }

        await prisma.salesInvoiceActivityLog.create({
            data: {
                invoiceId: id,
                userId: actualUserId,
                action: 'CẬP_NHẬT',
                details: detailsLog
            }
        });

        revalidatePath('/sales/invoices');
        return { success: true, data: invoice };
    } catch (error: any) {
        console.error("Lỗi khi cập nhật Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function updateSalesInvoiceStatus(id: string, newStatus: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const actualUserId = session.user.id;

        const inv = await prisma.salesInvoice.findUnique({ where: { id } });
        if (!inv) return { success: false, error: "Không tìm thấy hóa đơn" };

        if ((inv.status === 'ISSUED' || inv.status === 'PARTIAL_PAID' || inv.status === 'PAID') && newStatus === 'DRAFT') {
            return { success: false, error: "Không thể tự chuyển hóa đơn đã Ghi Nhận về Dự Thảo. Xin hãy dùng chức năng Hủy Hóa Đơn để hệ thống tự động rollback tồn kho và công nợ." };
        }

        const result = await prisma.salesInvoice.update({
            where: { id },
            data: { status: newStatus }
        });

        await logCustomerActivity(inv.customerId, 'SYSTEM', 'CẬP_NHẬT_TRẠNG_THÁI', `Hóa đơn ${inv.code} chuyển trạng thái: ${newStatus}`);

        await prisma.salesInvoiceActivityLog.create({
            data: {
                invoiceId: id,
                userId: actualUserId,
                action: 'CẬP_NHẬT_TRẠNG_THÁI',
                details: `Đổi trạng thái thành: ${newStatus}`
            }
        });

        revalidatePath('/sales/invoices');
        revalidatePath(`/sales/invoices/${id}`);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Lỗi cập nhật trạng thái Hóa Đơn:", error);
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
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' }
            ]
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
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const actualUserId = session.user.id;

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

            // 3. Create OUT Inventory Transaction (Only if there are internal products)
            const inventoryItems = invoice.items.filter(i => i.productId != null);

            if (inventoryItems.length > 0) {
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
                        creatorId: actualUserId,
                        items: { // create items
                            create: inventoryItems.map(i => ({
                                productId: i.productId as string,
                                quantity: i.quantity,
                                price: i.unitPrice
                            }))
                        }
                    }
                });

                // Deduct actual Inventory balances
                for (const item of inventoryItems) {
                    // Tìm inventory
                    const inventory = await tx.inventory.findUnique({
                        where: { productId_warehouseId: { productId: item.productId as string, warehouseId: wh.id } }
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
                                productId: item.productId as string,
                                warehouseId: wh.id,
                                quantity: -item.quantity
                            }
                        });
                    }
                }
            }

            await tx.customerActivityLog.create({
                data: {
                    customerId: invoice.customerId,
                    userId: actualUserId,
                    action: 'CẬP_NHẬT_TRẠNG_THÁI',
                    details: `Duyệt xuất kho & ghi nhận công nợ hóa đơn ${invoice.code}`
                }
            });

            await tx.salesInvoiceActivityLog.create({
                data: {
                    invoiceId: invoiceId,
                    userId: actualUserId,
                    action: 'APPROVED',
                    details: `Duyệt xuất kho & ghi nhận công nợ`
                }
            });

            return updatedInvoice;
        }, {
            maxWait: 5000, // default is 2000
            timeout: 15000 // default is 5000
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
    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: ['INVOICE_CODE_FORMAT', 'INVOICE_START_SEQ'] } }
    });
    const formatSetting = settings.find(s => s.key === 'INVOICE_CODE_FORMAT');
    const startSeqSetting = settings.find(s => s.key === 'INVOICE_START_SEQ');

    const format = formatSetting?.value || 'INV{SEQ}';
    const startSeq = parseInt(startSeqSetting?.value || '1', 10) || 1;

    const invoices = await prisma.salesInvoice.findMany({ select: { code: true } });

    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = String(now.getFullYear());

    const dateReplacedFormat = format.replace('{MM}', mm).replace('{YYYY}', yyyy);
    const prefix = dateReplacedFormat.split('{SEQ}')[0] || '';
    const suffix = dateReplacedFormat.split('{SEQ}')[1] || '';

    const safePrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const safeSuffix = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(`^${safePrefix}(\\d+)${safeSuffix}$`);

    let maxInvNum = 0;
    for (const inv of invoices) {
        const m = inv.code.match(regex);
        if (m && m[1]) {
            const n = parseInt(m[1], 10);
            if (!isNaN(n) && n > maxInvNum) maxInvNum = n;
        }
    }
    const nextNumber = Math.max(maxInvNum + 1, startSeq);
    const nextSeq = String(nextNumber).padStart(4, '0');
    return prefix + nextSeq + suffix;
}

export async function cancelSalesInvoice(invoiceId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.salesInvoice.findUnique({
                where: { id: invoiceId },
                include: { items: true, customer: true }
            });

            if (!invoice) throw new Error("Không tìm thấy hóa đơn");
            if (invoice.status === "CANCELLED") throw new Error("Hóa đơn đã bị hủy từ trước");

            // Nếu hóa đơn đã được duyệt (đã xuất kho, ghi nhận công nợ) -> cần rollback
            if (invoice.status === "ISSUED" || invoice.status === "PARTIAL_PAID" || invoice.status === "PAID") {
                // 1. Giảm trừ lại công nợ KH
                await tx.customer.update({
                    where: { id: invoice.customerId },
                    data: { totalDebt: { decrement: invoice.totalAmount } }
                });

                // 2. Thu hồi số lượng tồn kho & Xóa chứng từ xuất kho
                const txCode = `TX-OUT-${invoice.code}`;
                const invTx = await tx.inventoryTransaction.findFirst({
                    where: { code: txCode },
                    include: { items: true }
                });

                if (invTx) {
                    // Trả lại kho
                    for (const item of invTx.items) {
                        const inventory = await tx.inventory.findUnique({
                            where: { productId_warehouseId: { productId: item.productId, warehouseId: invTx.fromWarehouseId! } }
                        });

                        if (inventory) {
                            await tx.inventory.update({
                                where: { id: inventory.id },
                                data: { quantity: { increment: item.quantity } }
                            });
                        }
                    }

                    // Xóa chi tiết và phiếu xuất kho
                    await tx.inventoryTransactionItem.deleteMany({
                        where: { transactionId: invTx.id }
                    });
                    await tx.inventoryTransaction.delete({
                        where: { id: invTx.id }
                    });
                }
            }

            // 3. Cập nhật trạng thái thành CANCELLED
            const updatedInvoice = await tx.salesInvoice.update({
                where: { id: invoiceId },
                data: { status: "CANCELLED" }
            });

            await tx.salesInvoiceActivityLog.create({
                data: {
                    invoiceId: invoiceId,
                    userId: session.user.id,
                    action: 'STATUS_CHANGED',
                    details: `Hủy hóa đơn & Thu hồi kho/công nợ`
                }
            });

            return updatedInvoice;
        });

        revalidatePath('/sales/invoices');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Lỗi khi hủy hóa đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function restoreSalesInvoice(invoiceId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        const actualUserId = session.user.id;

        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.salesInvoice.findUnique({
                where: { id: invoiceId },
                include: { items: true, customer: true }
            });

            if (!invoice) throw new Error("Không tìm thấy hóa đơn");
            if (invoice.status !== "CANCELLED") {
                throw new Error("Chỉ hóa đơn Đã Hủy mới có thể khôi phục.");
            }

            // 1. Update Invoice Status to ISSUED
            const updatedInvoice = await tx.salesInvoice.update({
                where: { id: invoiceId },
                data: { status: "ISSUED" }
            });

            // 2. Add to Customer Debt
            await tx.customer.update({
                where: { id: invoice.customerId },
                data: { totalDebt: { increment: invoice.totalAmount } }
            });

            // 3. Create OUT Inventory Transaction (Only if there are internal products)
            const inventoryItems = invoice.items.filter(i => i.productId != null);

            if (inventoryItems.length > 0) {
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
                        notes: `Xuất kho tự động cho hóa đơn bán ${invoice.code} (Khôi phục)`,
                        fromWarehouseId: wh.id,
                        creatorId: actualUserId,
                        items: { // create items
                            create: inventoryItems.map(i => ({
                                productId: i.productId as string,
                                quantity: i.quantity,
                                price: i.unitPrice
                            }))
                        }
                    }
                });

                // Deduct actual Inventory balances
                for (const item of inventoryItems) {
                    // Tìm inventory
                    const inventory = await tx.inventory.findUnique({
                        where: { productId_warehouseId: { productId: item.productId as string, warehouseId: wh.id } }
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
                                productId: item.productId as string,
                                warehouseId: wh.id,
                                quantity: -item.quantity
                            }
                        });
                    }
                }
            }

            await tx.salesInvoiceActivityLog.create({
                data: {
                    invoiceId: invoiceId,
                    userId: actualUserId,
                    action: 'STATUS_CHANGED',
                    details: `Khôi phục hóa đơn đã hủy`
                }
            });

            return updatedInvoice;
        });

        revalidatePath('/sales/invoices');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Lỗi khi khôi phục hóa đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function paySalesInvoice(
    invoiceId: string,
    amount: number,
    paymentMethod: string = 'CASH',
    reference: string = '',
    notes: string = ''
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        const creatorId = session.user.id;

        const result = await prisma.$transaction(async (tx) => {
            const invoice = await tx.salesInvoice.findUnique({
                where: { id: invoiceId }
            });
            if (!invoice) throw new Error("Hóa đơn không tồn tại");

            // Get next payment code robustly
            const payments = await tx.salesPayment.findMany({ select: { code: true } });
            let maxPayNum = 0;
            for (const pay of payments) {
                const m = pay.code.match(/\d+/);
                if (m) {
                    const n = parseInt(m[0], 10);
                    if (!isNaN(n) && n > maxPayNum) maxPayNum = n;
                }
            }
            const nextCode = `PAY${String(maxPayNum + 1).padStart(4, '0')}`;

            // Create payment
            const payment = await tx.salesPayment.create({
                data: {
                    code: nextCode,
                    date: new Date(),
                    amount,
                    paymentMethod,
                    reference,
                    notes: notes || `Thu tiền khách theo hóa đơn ${invoice.code}`,
                    customerId: invoice.customerId,
                    creatorId,
                    allocations: {
                        create: [{ invoiceId: invoice.id, amount }]
                    }
                }
            });

            // Decrease customer debt
            await tx.customer.update({
                where: { id: invoice.customerId },
                data: { totalDebt: { decrement: amount } }
            });

            // Increase invoice paidAmount
            const inv = await tx.salesInvoice.update({
                where: { id: invoice.id },
                data: { paidAmount: { increment: amount } }
            });

            await tx.salesInvoiceActivityLog.create({
                data: {
                    invoiceId: invoice.id,
                    userId: creatorId,
                    action: 'UPDATED',
                    details: `Thu tiền: ${amount.toLocaleString('vi-VN')} đ (PT: ${payment.code})`
                }
            });

            // Update status if needed
            const newStatus = (inv.paidAmount >= inv.totalAmount) ? 'PAID' : 'PARTIAL_PAID';
            if (inv.status !== newStatus && inv.status !== 'DRAFT') {
                await tx.salesInvoice.update({
                    where: { id: inv.id },
                    data: { status: newStatus }
                });
            }

            return payment;
        });

        revalidatePath('/sales/invoices');
        revalidatePath('/sales/payments');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Lỗi khi thanh toán hóa đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function createSalesInvoiceNote(invoiceId: string, content: string, attachment?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        const userId = session.user.id;

        const note = await prisma.salesInvoiceNote.create({
            data: {
                invoiceId,
                userId,
                content,
                attachment
            },
            include: {
                user: { select: { name: true, avatar: true } }
            }
        });

        revalidatePath(`/sales/invoices/${invoiceId}`);
        return { success: true, data: note };
    } catch (error: any) {
        console.error("Lỗi khi thêm ghi chú:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteSalesInvoiceNote(noteId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        const userId = session.user.id;

        const note = await prisma.salesInvoiceNote.findUnique({ where: { id: noteId } });
        if (!note) return { success: false, error: "Không tìm thấy ghi chú" };

        if (note.userId !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                return { success: false, error: "Bạn không có quyền xóa ghi chú này" };
            }
        }

        await prisma.salesInvoiceNote.delete({ where: { id: noteId } });

        revalidatePath(`/sales/invoices/${note.invoiceId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi khi xóa ghi chú:", error);
        return { success: false, error: error.message };
    }
}

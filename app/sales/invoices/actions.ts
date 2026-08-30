'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { logCustomerActivity } from '@/lib/customerLogger';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';
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

async function ensureCustomProductsExist(tx: any, items: any[], context: 'PURCHASE' | 'SALES') {
    if (!items || items.length === 0) return;

    for (const item of items) {
        const customName = (item.customName || item.productName || '').trim();
        const isExternalOrCustom = (!item.productId || item.productId === 'EXTERNAL') && customName.length > 0;

        if (isExternalOrCustom) {
            let product = await tx.product.findFirst({
                where: { name: customName }
            });

            if (product) {
                item.productId = product.id;
                if (!item.unit && product.unit) item.unit = product.unit;

                if (context === 'SALES' && product.salePrice === 0 && item.unitPrice > 0) {
                    await tx.product.update({
                        where: { id: product.id },
                        data: { salePrice: item.unitPrice }
                    });
                } else if (context === 'PURCHASE' && product.importPrice === 0 && item.unitPrice > 0) {
                    await tx.product.update({
                        where: { id: product.id },
                        data: { importPrice: item.unitPrice }
                    });
                }
            } else {
                const count = await tx.product.count();
                let sku = `SP-${(count + 1).toString().padStart(6, '0')}`;
                let duplicateSku = await tx.product.findUnique({ where: { sku } });
                let step = 1;
                while (duplicateSku) {
                    sku = `SP-${(count + 1 + step).toString().padStart(6, '0')}`;
                    duplicateSku = await tx.product.findUnique({ where: { sku } });
                    step++;
                }

                const salePrice = context === 'SALES' ? (item.unitPrice || 0) : 0;
                const importPrice = context === 'PURCHASE' ? (item.unitPrice || 0) : 0;
                const unit = (item.unit && item.unit.trim()) ? item.unit.trim() : 'Cái';

                const newProduct = await tx.product.create({
                    data: {
                        sku,
                        name: customName,
                        type: 'PRODUCT',
                        unit,
                        taxRate: item.taxRate || 0,
                        salePrice,
                        importPrice,
                        description: item.description || null,
                        isActive: true
                    }
                });

                const defaultWarehouse = await tx.warehouse.findFirst({ where: { isDefault: true } })
                    || await tx.warehouse.findFirst();
                if (defaultWarehouse) {
                    const existingInv = await tx.inventory.findUnique({
                        where: {
                            productId_warehouseId: {
                                productId: newProduct.id,
                                warehouseId: defaultWarehouse.id
                            }
                        }
                    });
                    if (!existingInv) {
                        await tx.inventory.create({
                            data: {
                                productId: newProduct.id,
                                warehouseId: defaultWarehouse.id,
                                quantity: 0
                            }
                        });
                    }
                }

                item.productId = newProduct.id;
            }
        }
    }
}

export async function submitSalesInvoice(creatorId: string, formData: any) {
    try {
        const user = await verifyActionPermission('SALES_INVOICES_CREATE');
        const actualCreatorId = user ? (user as any).id : creatorId;
        if (!formData.code || !formData.customerId || !formData.items || formData.items.length === 0) {
            return { success: false, error: "Thiếu thông tin bắt buộc." };
        }

        // Tự động tạo sản phẩm vào kho/danh mục nếu là nhập tự do
        await ensureCustomProductsExist(prisma, formData.items, 'SALES');

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
                salespersonId: formData.salespersonId || actualCreatorId,
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
                order: true,
                creator: true,
                salesperson: true,
                items: {
                    include: { product: true }
                }
            }
        });

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
        revalidatePath('/inventory');
        return { success: true, data: invoice };
    } catch (error: any) {
        console.error("Lỗi khi tạo Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

function computeSalesInvoiceDiff(oldInvoice: any, newFormData: any, oldItems: any[], newItems: any[], oldSalespersonName?: string, newSalespersonName?: string) {
    const changes: string[] = [];

    const oldTotal = oldInvoice.totalAmount || 0;
    const newTotal = newFormData.totalAmount || 0;
    const delta = newTotal - oldTotal;

    if (oldTotal !== newTotal) {
        changes.push(`Tổng tiền: **${oldTotal.toLocaleString('vi-VN')} đ** ➔ **${newTotal.toLocaleString('vi-VN')} đ** (Chênh lệch: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('vi-VN')} đ)`);
    }

    if (oldSalespersonName && newSalespersonName && oldSalespersonName !== newSalespersonName) {
        changes.push(`Người bán: **${oldSalespersonName}** ➔ **${newSalespersonName}**`);
    }

    if (oldInvoice.dueDate && newFormData.dueDate) {
        const oldDue = new Date(oldInvoice.dueDate).toISOString().split('T')[0];
        const newDue = new Date(newFormData.dueDate).toISOString().split('T')[0];
        if (oldDue !== newDue) {
            changes.push(`Hạn thanh toán: **${new Date(oldInvoice.dueDate).toLocaleDateString('vi-VN')}** ➔ **${new Date(newFormData.dueDate).toLocaleDateString('vi-VN')}**`);
        }
    }

    const oldMap = new Map();
    for (const item of oldItems) {
        const key = item.productId ? `ID_${item.productId}` : `CUSTOM_${item.customName || item.description || ''}`;
        oldMap.set(key, item);
    }

    const newMap = new Map();
    for (const item of newItems) {
        const key = item.productId ? `ID_${item.productId}` : `CUSTOM_${item.customName || item.description || ''}`;
        newMap.set(key, item);
    }

    // Check removed items
    oldMap.forEach((oldItem, key) => {
        if (!newMap.has(key)) {
            const name = oldItem.product?.name || oldItem.customName || oldItem.description || 'Sản phẩm';
            changes.push(`🗑️ Xóa sản phẩm: **${name}** (SL cũ: ${oldItem.quantity}, Giá cũ: ${oldItem.unitPrice.toLocaleString('vi-VN')} đ)`);
        }
    });

    // Check added or updated items
    newMap.forEach((newItem, key) => {
        const name = newItem.product?.name || newItem.customName || newItem.description || 'Sản phẩm';
        if (!oldMap.has(key)) {
            changes.push(`➕ Thêm sản phẩm mới: **${name}** (SL: ${newItem.quantity} ${newItem.unit || ''}, Giá: ${newItem.unitPrice.toLocaleString('vi-VN')} đ)`);
        } else {
            const oldItem = oldMap.get(key);
            const itemDiffs = [];
            if (oldItem.quantity !== newItem.quantity) {
                itemDiffs.push(`Số lượng: ${oldItem.quantity} ➔ **${newItem.quantity}**`);
            }
            if (oldItem.unitPrice !== newItem.unitPrice) {
                itemDiffs.push(`Đơn giá: ${oldItem.unitPrice.toLocaleString('vi-VN')} đ ➔ **${newItem.unitPrice.toLocaleString('vi-VN')} đ**`);
            }
            if ((oldItem.taxRate || 0) !== (newItem.taxRate || 0)) {
                itemDiffs.push(`Thuế: ${oldItem.taxRate || 0}% ➔ **${newItem.taxRate || 0}%**`);
            }
            if (itemDiffs.length > 0) {
                changes.push(`✏️ Điều chỉnh **${name}**: ${itemDiffs.join(', ')}`);
            }
        }
    });

    if ((oldInvoice.notes || '') !== (newFormData.notes || '')) {
        changes.push(`Ghi chú của hóa đơn đã được cập nhật.`);
    }

    return changes;
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
            include: { items: { include: { product: true } }, customer: true }
        });
        if (!existingInvoice) {
            return { success: false, error: "Không tìm thấy hóa đơn." };
        }
        await verifyActionOwnership('SALES_INVOICES', 'EDIT', existingInvoice.creatorId);

        if (existingInvoice.status === "CANCELLED") {
            return { success: false, error: "Không thể chỉnh sửa hóa đơn đã bị hủy." };
        }

        const isIssuedOrPaid = existingInvoice.status === "ISSUED" || existingInvoice.status === "PARTIAL_PAID" || existingInvoice.status === "PAID";

        let oldSalespersonName = '';
        let newSalespersonName = '';
        if (existingInvoice.salespersonId !== formData.salespersonId) {
            if (existingInvoice.salespersonId) {
                const oldSp = await prisma.user.findUnique({ where: { id: existingInvoice.salespersonId } });
                oldSalespersonName = oldSp?.name || 'Không có';
            }
            if (formData.salespersonId) {
                const newSp = await prisma.user.findUnique({ where: { id: formData.salespersonId } });
                newSalespersonName = newSp?.name || 'Không có';
            }
        }

        // Tự động tạo sản phẩm vào kho/danh mục nếu là nhập tự do
        await ensureCustomProductsExist(prisma, formData.items, 'SALES');

        const diffChanges = computeSalesInvoiceDiff(existingInvoice, formData, existingInvoice.items, formData.items, oldSalespersonName, newSalespersonName);

        const formattedItems = formData.items.map((item: any) => ({
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
        }));

        if (!isIssuedOrPaid) {
            // Simple draft update
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
                    salespersonId: formData.salespersonId || null,
                    items: {
                        deleteMany: {},
                        create: formattedItems
                    }
                },
                include: {
                    customer: true,
                    order: true,
                    creator: true,
                    salesperson: true,
                    items: {
                        include: { product: true }
                    }
                }
            });

            await prisma.salesInvoiceActivityLog.create({
                data: {
                    invoiceId: id,
                    userId: actualUserId,
                    action: 'CẬP_NHẬT',
                    details: JSON.stringify({
                        type: 'UPDATE_DIFF',
                        summary: 'Cập nhật thông tin hóa đơn (Dự Thảo)',
                        changes: diffChanges.length > 0 ? diffChanges : ['Cập nhật thông tin chung']
                    })
                }
            });

            revalidatePath('/sales/invoices');
            revalidatePath(`/sales/invoices/${id}`);
            return { success: true, data: invoice };
        }

        // Adjusting ISSUED / PARTIAL_PAID / PAID invoice with transaction
        const updatedInvoice = await prisma.$transaction(async (tx) => {
            const currentInvoice = await tx.salesInvoice.findUnique({
                where: { id },
                include: { items: true, customer: true }
            });

            if (!currentInvoice) throw new Error("Không tìm thấy hóa đơn");

            // 1. Rollback old warehouse export
            const txCode = `TX-OUT-${currentInvoice.code}`;
            const invTx = await tx.inventoryTransaction.findFirst({
                where: { code: txCode },
                include: { items: true }
            });

            let warehouseId = invTx?.fromWarehouseId;
            if (!warehouseId) {
                const defaultWh = await tx.warehouse.findFirst({ where: { isDefault: true } }) || await tx.warehouse.findFirst();
                if (defaultWh) warehouseId = defaultWh.id;
            }

            if (invTx && invTx.fromWarehouseId) {
                // Restore old quantities back to stock
                for (const oldItem of invTx.items) {
                    const inventory = await tx.inventory.findUnique({
                        where: { productId_warehouseId: { productId: oldItem.productId, warehouseId: invTx.fromWarehouseId } }
                    });

                    if (inventory) {
                        await tx.inventory.update({
                            where: { id: inventory.id },
                            data: { quantity: { increment: oldItem.quantity } }
                        });
                    }
                }
            }

            // 2. Deduct new inventory quantities
            const newInventoryItems = formattedItems.filter((i: any) => i.productId != null);

            if (warehouseId && newInventoryItems.length > 0) {
                for (const item of newInventoryItems) {
                    const inventory = await tx.inventory.findUnique({
                        where: { productId_warehouseId: { productId: item.productId as string, warehouseId: warehouseId } }
                    });

                    if (inventory) {
                        await tx.inventory.update({
                            where: { id: inventory.id },
                            data: { quantity: { decrement: item.quantity } }
                        });
                    } else {
                        await tx.inventory.create({
                            data: {
                                productId: item.productId as string,
                                warehouseId: warehouseId,
                                quantity: -item.quantity
                            }
                        });
                    }
                }

                // Update or create InventoryTransaction
                if (invTx) {
                    await tx.inventoryTransactionItem.deleteMany({ where: { transactionId: invTx.id } });
                    await tx.inventoryTransaction.update({
                        where: { id: invTx.id },
                        data: {
                            notes: `Xuất kho tự động cho hóa đơn bán ${currentInvoice.code} (Đã đồng bộ điều chỉnh lúc ${new Date().toLocaleString('vi-VN')})`,
                            items: {
                                create: newInventoryItems.map((i: any) => ({
                                    productId: i.productId as string,
                                    quantity: i.quantity,
                                    price: i.unitPrice
                                }))
                            }
                        }
                    });
                } else {
                    await tx.inventoryTransaction.create({
                        data: {
                            code: txCode,
                            type: "OUT",
                            status: "COMPLETED",
                            date: new Date(),
                            notes: `Xuất kho tự động cho hóa đơn bán ${currentInvoice.code}`,
                            fromWarehouseId: warehouseId,
                            creatorId: actualUserId,
                            items: {
                                create: newInventoryItems.map((i: any) => ({
                                    productId: i.productId as string,
                                    quantity: i.quantity,
                                    price: i.unitPrice
                                }))
                            }
                        }
                    });
                }
            }

            // 3. Update Customer Debt
            const oldTotal = currentInvoice.totalAmount || 0;
            const newTotal = formData.totalAmount || 0;
            const delta = newTotal - oldTotal;

            if (currentInvoice.customerId !== formData.customerId) {
                // Deduct old customer
                await tx.customer.update({
                    where: { id: currentInvoice.customerId },
                    data: { totalDebt: { decrement: oldTotal } }
                });
                // Add new customer
                await tx.customer.update({
                    where: { id: formData.customerId },
                    data: { totalDebt: { increment: newTotal } }
                });
            } else {
                await tx.customer.update({
                    where: { id: currentInvoice.customerId },
                    data: { totalDebt: { increment: delta } }
                });
            }

            // 4. Recalculate status based on paidAmount
            let newStatus = currentInvoice.status;
            const paid = currentInvoice.paidAmount || 0;
            if (paid >= newTotal && newTotal > 0) {
                newStatus = "PAID";
            } else if (paid > 0) {
                newStatus = "PARTIAL_PAID";
            } else {
                newStatus = "ISSUED";
            }

            // 5. Update Invoice
            const invoiceResult = await tx.salesInvoice.update({
                where: { id },
                data: {
                    code: formData.code,
                    date: new Date(formData.date),
                    dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
                    status: newStatus,
                    notes: formData.notes,
                    tags: formData.tags || null,
                    customerId: formData.customerId,
                    orderId: formData.orderId || null,
                    subTotal: formData.subTotal,
                    taxAmount: formData.taxAmount,
                    totalAmount: formData.totalAmount,
                    salespersonId: formData.salespersonId || null,
                    items: {
                        deleteMany: {},
                        create: formattedItems
                    }
                },
                include: {
                    customer: true,
                    order: true,
                    creator: true,
                    salesperson: true,
                    items: {
                        include: { product: true }
                    }
                }
            });

            // 6. Record Activity Logs
            const logChanges = [...diffChanges];
            logChanges.push(`🔄 **Hệ thống tự động đồng bộ**: Đã hoàn nhập kho cũ và xuất lại theo danh sách sản phẩm mới.`);
            logChanges.push(`💳 **Công nợ KH tự động cập nhật**: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('vi-VN')} đ (Tổng nợ mới ghi nhận: ${newTotal.toLocaleString('vi-VN')} đ).`);

            await tx.salesInvoiceActivityLog.create({
                data: {
                    invoiceId: id,
                    userId: actualUserId,
                    action: 'CẬP_NHẬT',
                    details: JSON.stringify({
                        type: 'UPDATE_DIFF',
                        summary: 'Điều chỉnh hóa đơn bán hàng (đã đồng bộ kho & công nợ KH)',
                        changes: logChanges
                    })
                }
            });

            await tx.customerActivityLog.create({
                data: {
                    customerId: formData.customerId,
                    userId: actualUserId,
                    action: 'CẬP_NHẬT',
                    details: `Điều chỉnh hóa đơn ${invoiceResult.code}: Tổng tiền ${oldTotal.toLocaleString('vi-VN')} đ ➔ ${newTotal.toLocaleString('vi-VN')} đ`
                }
            });

            return invoiceResult;
        }, {
            maxWait: 5000,
            timeout: 15000
        });

        revalidatePath('/sales/invoices');
        revalidatePath(`/sales/invoices/${id}`);
        return { success: true, data: updatedInvoice };
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

        await verifyActionOwnership('SALES_INVOICES', 'EDIT', inv.creatorId);

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

export async function updateSalesInvoiceTags(id: string, tags: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }
        
        const inv = await prisma.salesInvoice.findUnique({ where: { id } });
        if (!inv) return { success: false, error: "Không tìm thấy hóa đơn" };

        await verifyActionOwnership('SALES_INVOICES', 'EDIT', inv.creatorId);

        const result = await prisma.salesInvoice.update({
            where: { id },
            data: { tags }
        });

        revalidatePath('/sales/invoices');
        revalidatePath(`/sales/invoices/${id}`);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Lỗi cập nhật thẻ quản lý Hóa Đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function getSalesInvoices(employeeId?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return [];

        const permissions = session.user.permissions as string[] || [];
        const viewAll = permissions.includes('SALES_INVOICES_VIEW_ALL');
        const viewOwn = permissions.includes('SALES_INVOICES_VIEW_OWN');

        if (!viewAll && !viewOwn) return [];

        let whereClause: any = {};

        if (viewAll) {
            if (employeeId) {
                whereClause = {
                    OR: [
                        { creatorId: employeeId },
                        { salespersonId: employeeId }
                    ]
                };
            }
        } else if (viewOwn) {
            whereClause = {
                OR: [
                    { creatorId: session.user.id },
                    { salespersonId: session.user.id },
                    { managers: { some: { id: session.user.id } } }
                ]
            };
        }

        return await prisma.salesInvoice.findMany({
            where: whereClause,
            include: {
                customer: true,
                order: true,
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
            
            await verifyActionOwnership('SALES_INVOICES', 'EDIT', invoice.creatorId);

            if (invoice.status === "ISSUED" || invoice.status === "PAID" || invoice.status === "PARTIAL_PAID") {
                throw new Error("Hóa đơn này đã được duyệt trước đó");
            }

            // 1. Update Invoice Status
            const updatedInvoice = await tx.salesInvoice.update({
                where: { id: invoiceId },
                data: { status: "ISSUED" },
                include: {
                    customer: true,
                    order: true,
                    creator: true,
                    salesperson: true,
                    items: {
                        include: { product: true }
                    }
                }
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
        if (inv) {
            await verifyActionOwnership('SALES_INVOICES', 'DELETE', inv.creatorId);
            if (inv.status === 'ISSUED' || inv.status === 'PARTIAL_PAID' || inv.status === 'PAID') {
                return { success: false, error: "Hóa đơn đã xuất kho và vào công nợ, không thể tự do xóa. Liên hệ admin phục hồi cơ sở dữ liệu." };
            }
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
            
            await verifyActionOwnership('SALES_INVOICES', 'EDIT', invoice.creatorId);

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
                data: { status: "CANCELLED" },
                include: {
                    customer: true,
                    order: true,
                    creator: true,
                    salesperson: true,
                    items: {
                        include: { product: true }
                    }
                }
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

            await verifyActionOwnership('SALES_INVOICES', 'EDIT', invoice.creatorId);

            if (invoice.status !== "CANCELLED") {
                throw new Error("Chỉ hóa đơn Đã Hủy mới có thể khôi phục.");
            }

            // 1. Update Invoice Status to ISSUED
            const updatedInvoice = await tx.salesInvoice.update({
                where: { id: invoiceId },
                data: { status: "ISSUED" },
                include: {
                    customer: true,
                    order: true,
                    creator: true,
                    salesperson: true,
                    items: {
                        include: { product: true }
                    }
                }
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
    paymentMethod: string = 'BANK_TRANSFER',
    reference: string = '',
    notes: string = ''
) {
    try {
        const u = await verifyActionPermission('SALES_PAYMENTS_CREATE');
        const creatorId = u ? (u as any).id : 'system';

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

export async function assignSalesInvoiceManagers(invoiceId: string, userIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const doc = await prisma.salesInvoice.update({
        where: { id: invoiceId },
        data: { managers: { connect: userIds.map(id => ({ id })) } }
    });

    revalidatePath(`/sales/invoices/${invoiceId}`);
    return doc;
}

export async function removeSalesInvoiceManager(invoiceId: string, userId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) throw new Error("Unauthorized");

    const doc = await prisma.salesInvoice.update({
        where: { id: invoiceId },
        data: { managers: { disconnect: { id: userId } } }
    });

    revalidatePath(`/sales/invoices/${invoiceId}`);
    return doc;
}

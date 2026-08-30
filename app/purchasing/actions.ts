'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import { sendEmailWithTracking } from '@/lib/mailer';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';
import { calcTaxAmount } from '@/lib/utils/formatters';

async function getUser() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        throw new Error('Unauthorized');
    }
    return session.user;
}

// ---------------------------------------------------------------------------
// SUPPLIERS
// ---------------------------------------------------------------------------

export async function getSuppliers() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const permissions = session.user.permissions as string[] || [];
    const viewAll = permissions.includes('SUPPLIERS_VIEW_ALL');
    const viewOwn = permissions.includes('SUPPLIERS_VIEW_OWN');

    if (!viewAll && !viewOwn) return [];

    let filter: any = {};
    if (!viewAll && viewOwn) {
        filter = {
            OR: [
                { orders: { some: { creatorId: session.user.id } } },
                { bills: { some: { creatorId: session.user.id } } },
                { payments: { some: { creatorId: session.user.id } } }
            ]
        };
    }

    return prisma.supplier.findMany({
        where: filter,
        orderBy: { updatedAt: 'desc' },
        include: {
            bills: {
                where: {
                    status: { notIn: ['DRAFT', 'CANCELLED'] } // Need this for dynamic debt
                }
            },
            payments: true
        }
    });
}

export async function getSupplier(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const permissions = session.user.permissions as string[] || [];
    const viewAll = permissions.includes('SUPPLIERS_VIEW_ALL');
    const viewOwn = permissions.includes('SUPPLIERS_VIEW_OWN');

    if (!viewAll && !viewOwn) return null;

    let filter: any = {};
    if (!viewAll && viewOwn) {
        filter = {
            OR: [
                { orders: { some: { creatorId: session.user.id } } },
                { bills: { some: { creatorId: session.user.id } } },
                { payments: { some: { creatorId: session.user.id } } }
            ]
        };
    }

    return prisma.supplier.findFirst({
        where: { id, ...filter },
        include: {
            products: {
                include: { product: true }
            },
            orders: {
                include: { creator: true },
                orderBy: { date: 'desc' },
                take: 10
            },
            bills: {
                include: { creator: true },
                orderBy: { date: 'desc' }
            },
            payments: {
                include: { creator: true },
                orderBy: { date: 'desc' }
            }
        }
    });
}

export async function createSupplier(data: any) {
    await verifyActionPermission('SUPPLIERS_CREATE');

    // Auto-generate code if empty
    let code = data.code;
    if (!code) {
        const count = await prisma.supplier.count();
        code = `NCC-${(count + 1).toString().padStart(4, '0')}`;
    }

    const supplier = await prisma.supplier.create({
        data: {
            name: data.name,
            code,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            taxCode: data.taxCode,
            website: data.website,
            businessType: data.businessType,
            bankAccount: data.bankAccount,
            bankName: data.bankName,
            notes: data.notes
        }
    });

    revalidatePath('/suppliers');
    return supplier;
}

export async function updateSupplier(id: string, data: any) {
    await verifyActionPermission('SUPPLIERS_EDIT_ALL');

    const supplier = await prisma.supplier.update({
        where: { id },
        data: {
            name: data.name,
            code: data.code,
            contactName: data.contactName,
            email: data.email,
            phone: data.phone,
            address: data.address,
            taxCode: data.taxCode,
            website: data.website,
            businessType: data.businessType,
            bankAccount: data.bankAccount,
            bankName: data.bankName,
            notes: data.notes
        }
    });

    revalidatePath('/suppliers');
    revalidatePath(`/suppliers/${id}`);
    return supplier;
}

export async function deleteSupplier(id: string) {
    await verifyActionPermission('SUPPLIERS_DELETE_ALL');
    await prisma.supplier.delete({ where: { id } });
    revalidatePath('/suppliers');
}

// ---------------------------------------------------------------------------
// SUPPLIER CONTACTS
// ---------------------------------------------------------------------------

export async function createSupplierContact(data: { supplierId: string, name: string, position?: string, phone?: string, email?: string, notes?: string }) {
    await verifyActionPermission('SUPPLIERS_EDIT_ALL');
    const contact = await prisma.supplierContact.create({ data });
    revalidatePath(`/purchasing/suppliers/${data.supplierId}`);
    return contact;
}

export async function updateSupplierContact(id: string, data: any) {
    await verifyActionPermission('SUPPLIERS_EDIT_ALL');
    const contact = await prisma.supplierContact.update({
        where: { id },
        data: {
            name: data.name,
            position: data.position,
            phone: data.phone,
            email: data.email,
            notes: data.notes
        }
    });
    revalidatePath(`/purchasing/suppliers/${contact.supplierId}`);
    return contact;
}

export async function deleteSupplierContact(id: string) {
    await verifyActionPermission('SUPPLIERS_EDIT_ALL');
    const contact = await prisma.supplierContact.findUnique({ where: { id } });
    if (contact) {
        await prisma.supplierContact.delete({ where: { id } });
        revalidatePath(`/purchasing/suppliers/${contact.supplierId}`);
    }
    return true;
}

// ---------------------------------------------------------------------------
// PURCHASE ORDERS (Đơn Đặt Hàng)
// ---------------------------------------------------------------------------

export async function getPurchaseOrders() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const viewFilter = buildViewFilter(session.user.id, session.user.permissions as string[] || [], 'PURCHASE_ORDERS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return [];

    return prisma.purchaseOrder.findMany({
        where: viewFilter,
        include: {
            supplier: true,
            creator: true,
            items: {
                include: { product: true }
            },
            _count: { select: { items: true } }
        },
        orderBy: { date: 'desc' }
    });
}

export async function getPurchaseOrder(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const viewFilter = buildViewFilter(session.user.id, session.user.permissions as string[] || [], 'PURCHASE_ORDERS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return null;

    return prisma.purchaseOrder.findFirst({
        where: { id, ...viewFilter },
        include: {
            supplier: true,
            creator: true,
            items: {
                include: { product: true }
            },
            bills: true
        }
    });
}

export async function createPurchaseOrder(data: any) {
    const user = await verifyActionPermission('PURCHASE_ORDERS_CREATE');

    let code = (data.code || '').trim();
    if (!code) {
        const count = await prisma.purchaseOrder.count();
        code = `PO-${(count + 1).toString().padStart(6, '0')}`;
    }
    let dupOrder = await prisma.purchaseOrder.findUnique({ where: { code } });
    let poStep = 1;
    const basePoCode = code;
    while (dupOrder) {
        code = `${basePoCode}-${poStep}`;
        dupOrder = await prisma.purchaseOrder.findUnique({ where: { code } });
        poStep++;
    }

    const order = await prisma.purchaseOrder.create({
        data: {
            code,
            supplierId: data.supplierId,
            date: data.date ? new Date(data.date) : new Date(),
            status: data.status || 'DRAFT',
            notes: data.notes,
            totalAmount: data.totalAmount,
            subTotal: data.subTotal || 0,
            taxAmount: data.taxAmount || 0,
            creatorId: user ? (user as any).id : null,
            items: {
                create: data.items.map((item: any) => {
                    const lineSubTotal = item.quantity * item.unitPrice;
                    const lineTaxAmount = calcTaxAmount(lineSubTotal, item.taxRate);
                    const isExternal = item.productId === 'EXTERNAL';
                    return {
                        productId: isExternal ? null : item.productId,
                        productName: isExternal ? item.productName || item.customName : null,
                        unit: item.unit || null,
                        description: item.description || null,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate !== undefined ? item.taxRate : 0,
                        taxAmount: lineTaxAmount,
                        totalPrice: lineSubTotal + lineTaxAmount
                    };
                })
            }
        }
    });

    revalidatePath('/purchasing/orders');
    return order;
}

export async function updatePurchaseOrder(id: string, data: any) {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw new Error("Đơn đặt hàng không tồn tại");

    await verifyActionOwnership('PURCHASE_ORDERS', 'EDIT', existing.creatorId);

    const order = await prisma.purchaseOrder.update({
        where: { id },
        data: {
            supplierId: data.supplierId,
            date: data.date ? new Date(data.date) : new Date(),
            status: data.status || 'DRAFT',
            notes: data.notes,
            totalAmount: data.totalAmount,
            subTotal: data.subTotal || 0,
            taxAmount: data.taxAmount || 0,
            items: {
                deleteMany: {},
                create: data.items.map((item: any) => {
                    const lineSubTotal = item.quantity * item.unitPrice;
                    const lineTaxAmount = calcTaxAmount(lineSubTotal, item.taxRate);
                    const isExternal = item.productId === 'EXTERNAL' || !item.productId;
                    return {
                        productId: isExternal ? null : item.productId,
                        productName: isExternal ? item.productName || item.customName : null,
                        unit: item.unit || null,
                        description: item.description || null,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate !== undefined ? item.taxRate : 0,
                        taxAmount: lineTaxAmount,
                        totalPrice: lineSubTotal + lineTaxAmount
                    };
                })
            }
        },
        include: {
            supplier: true,
            creator: true
        }
    });

    revalidatePath('/purchasing/orders');
    revalidatePath(`/purchasing/orders/${id}`);
    return order;
}

export async function deletePurchaseOrder(id: string) {
    const existing = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!existing) throw new Error("Đơn đặt hàng không tồn tại");
    
    await verifyActionOwnership('PURCHASE_ORDERS', 'DELETE', existing.creatorId);
    
    if (existing?.status !== 'DRAFT') throw new Error("Chỉ có thể xóa đơn hàng Nháp");

    await prisma.purchaseOrderItem.deleteMany({ where: { orderId: id } });
    await prisma.purchaseOrder.delete({ where: { id } });

    revalidatePath('/purchasing/orders');
    return true;
}

// ---------------------------------------------------------------------------
// PURCHASE BILLS (Hóa Đơn Mua Hàng)
// ---------------------------------------------------------------------------

export async function getPurchaseBills() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const viewFilter = buildViewFilter(session.user.id, session.user.permissions as string[] || [], 'PURCHASE_BILLS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return [];

    return prisma.purchaseBill.findMany({
        where: viewFilter,
        include: {
            supplier: true,
            creator: true,
            order: true,
            _count: { select: { items: true } },
            items: {
                include: { product: true }
            }
        },
        orderBy: { date: 'desc' }
    });
}

export async function getPurchaseBill(id: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const viewFilter = buildViewFilter(session.user.id, session.user.permissions as string[] || [], 'PURCHASE_BILLS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return null;

    return prisma.purchaseBill.findFirst({
        where: { id, ...viewFilter },
        include: {
            supplier: true,
            creator: true,
            order: true,
            items: {
                include: { product: true }
            },
            allocations: {
                include: { payment: true }
            },
            activityLogs: {
                include: {
                    user: {
                        select: { id: true, name: true, avatar: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    });
}

function computePurchaseBillDiff(oldBill: any, newFormData: any, oldItems: any[], newItems: any[]) {
    const changes: string[] = [];

    const oldTotal = oldBill.totalAmount || 0;
    const newTotal = newFormData.totalAmount || 0;
    const delta = newTotal - oldTotal;

    if (oldTotal !== newTotal) {
        changes.push(`Tổng tiền: **${oldTotal.toLocaleString('vi-VN')} đ** ➔ **${newTotal.toLocaleString('vi-VN')} đ** (Chênh lệch: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('vi-VN')} đ)`);
    }

    if (oldBill.supplierInvoice !== newFormData.supplierInvoice && (oldBill.supplierInvoice || newFormData.supplierInvoice)) {
        changes.push(`Số HĐ NCC: **${oldBill.supplierInvoice || 'Trống'}** ➔ **${newFormData.supplierInvoice || 'Trống'}**`);
    }

    if (oldBill.dueDate && newFormData.dueDate) {
        const oldDue = new Date(oldBill.dueDate).toISOString().split('T')[0];
        const newDue = new Date(newFormData.dueDate).toISOString().split('T')[0];
        if (oldDue !== newDue) {
            changes.push(`Hạn thanh toán: **${new Date(oldBill.dueDate).toLocaleDateString('vi-VN')}** ➔ **${new Date(newFormData.dueDate).toLocaleDateString('vi-VN')}**`);
        }
    }

    const oldMap = new Map();
    for (const item of oldItems) {
        const key = item.productId ? `ID_${item.productId}` : `CUSTOM_${item.productName || item.customName || item.description || ''}`;
        oldMap.set(key, item);
    }

    const newMap = new Map();
    for (const item of newItems) {
        const key = item.productId && item.productId !== 'EXTERNAL' ? `ID_${item.productId}` : `CUSTOM_${item.productName || item.customName || item.description || ''}`;
        newMap.set(key, item);
    }

    // Check removed items
    oldMap.forEach((oldItem, key) => {
        if (!newMap.has(key)) {
            const name = oldItem.product?.name || oldItem.productName || oldItem.customName || 'Sản phẩm';
            changes.push(`🗑️ Xóa sản phẩm: **${name}** (SL cũ: ${oldItem.quantity}, Giá cũ: ${oldItem.unitPrice.toLocaleString('vi-VN')} đ)`);
        }
    });

    // Check added or updated items
    newMap.forEach((newItem, key) => {
        const name = newItem.product?.name || newItem.productName || newItem.customName || 'Sản phẩm';
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
            if ((oldItem.taxRate ?? 0) !== (newItem.taxRate ?? 0)) {
                const oldT = oldItem.taxRate === -1 ? 'KCT' : `${oldItem.taxRate ?? 0}%`;
                const newT = newItem.taxRate === -1 ? 'KCT' : `${newItem.taxRate ?? 0}%`;
                itemDiffs.push(`Thuế: ${oldT} ➔ **${newT}**`);
            }
            if (itemDiffs.length > 0) {
                changes.push(`✏️ Điều chỉnh **${name}**: ${itemDiffs.join(', ')}`);
            }
        }
    });

    if ((oldBill.notes || '') !== (newFormData.notes || '')) {
        changes.push(`Ghi chú hóa đơn đã được cập nhật.`);
    }

    return changes;
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
                        taxRate: item.taxRate !== undefined ? item.taxRate : 0,
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

export async function createPurchaseBill(data: any) {
    const user = await verifyActionPermission('PURCHASE_BILLS_CREATE');
    const uId = user ? (user as any).id : null;

    // Tự động tạo sản phẩm vào kho/danh mục nếu là nhập tự do
    await ensureCustomProductsExist(prisma, data.items, 'PURCHASE');

    let code = (data.code || '').trim();
    if (!code) {
        const count = await prisma.purchaseBill.count();
        code = `PB-${(count + 1).toString().padStart(6, '0')}`;
    }
    let dupBill = await prisma.purchaseBill.findUnique({ where: { code } });
    let pbStep = 1;
    const basePbCode = code;
    while (dupBill) {
        code = `${basePbCode}-${pbStep}`;
        dupBill = await prisma.purchaseBill.findUnique({ where: { code } });
        pbStep++;
    }

    const bill = await prisma.purchaseBill.create({
        data: {
            code,
            supplierInvoice: data.supplierInvoice,
            supplierId: data.supplierId,
            orderId: data.orderId || null,
            projectId: data.projectId || null,
            date: data.date ? new Date(data.date) : new Date(),
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            status: 'DRAFT',
            notes: data.notes,
            tags: data.tags || null,
            attachment: data.attachment || null,
            totalAmount: data.totalAmount,
            subTotal: data.subTotal || 0,
            taxAmount: data.taxAmount || 0,
            creatorId: uId,
            items: {
                create: data.items.map((item: any) => {
                    const lineSubTotal = item.quantity * item.unitPrice;
                    const lineTaxAmount = calcTaxAmount(lineSubTotal, item.taxRate);
                    const isExternal = item.productId === 'EXTERNAL' || !item.productId;
                    return {
                        productId: isExternal ? null : item.productId,
                        productName: isExternal ? item.productName || item.customName : null,
                        unit: item.unit || null,
                        description: item.description || null,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        taxRate: item.taxRate !== undefined ? item.taxRate : 0,
                        taxAmount: lineTaxAmount,
                        totalPrice: lineSubTotal + lineTaxAmount
                    };
                })
            }
        }
    });

    if (uId) {
        try {
            await prisma.purchaseBillActivityLog.create({
                data: {
                    billId: bill.id,
                    userId: uId,
                    action: 'CREATED',
                    details: `Khởi tạo hóa đơn mua hàng: ${bill.code}`
                }
            });
        } catch (logErr) {
            console.error("Lỗi ghi log khởi tạo PB:", logErr);
        }
    }

    revalidatePath('/purchasing/bills');
    return bill;
}

export async function approvePurchaseBill(billId: string, toWarehouseId: string) {
    const user = await verifyActionPermission('PURCHASE_BILLS_EDIT_ALL');
    const uId = user ? (user as any).id : null;

    return prisma.$transaction(async (tx: any) => {
        // 1. Get the bill
        const bill = await tx.purchaseBill.findUnique({
            where: { id: billId },
            include: { items: true, supplier: true }
        });

        if (!bill) throw new Error("Không tìm thấy hóa đơn này");
        if (bill.status !== 'DRAFT') throw new Error("Hóa đơn đã được duyệt hoặc đang ở trạng thái khác DRAFT");
        if (!toWarehouseId) throw new Error("Vui lòng chọn Kho nhập hàng");

        // 2. Setup internal inventory items (exclude EXTERNAL products)
        const inventoryItems = bill.items.filter((item: any) => item.productId !== null);

        if (inventoryItems.length > 0) {
            // 2. Create Inventory Transaction IN
            const invTxCode = `IN-${bill.code}`;
            await tx.inventoryTransaction.create({
                data: {
                    code: invTxCode,
                    type: 'IN',
                    status: 'COMPLETED',
                    date: new Date(),
                    notes: `Nhập kho tự động từ Hóa đơn mua hàng ${bill.code}`,
                    toWarehouseId: toWarehouseId,
                    supplierId: bill.supplierId,
                    creatorId: uId,
                    items: {
                        create: inventoryItems.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.unitPrice
                        }))
                    }
                }
            });

            // 3. Update Inventory Quantities
            for (const item of inventoryItems) {
                const inventory = await tx.inventory.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: toWarehouseId
                        }
                    }
                });

                if (inventory) {
                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: { quantity: inventory.quantity + item.quantity }
                    });
                } else {
                    await tx.inventory.create({
                        data: {
                            productId: item.productId,
                            warehouseId: toWarehouseId,
                            quantity: item.quantity
                        }
                    });
                }
            }
        }

        // 4. Update Supplier Debt
        await tx.supplier.update({
            where: { id: bill.supplierId },
            data: { totalDebt: bill.supplier.totalDebt + bill.totalAmount }
        });

        // 5. Update Bill Status
        const updatedBill = await tx.purchaseBill.update({
            where: { id: billId },
            data: { status: 'APPROVED' }
        });

        if (uId) {
            await tx.purchaseBillActivityLog.create({
                data: {
                    billId: bill.id,
                    userId: uId,
                    action: 'APPROVED',
                    details: `Duyệt nhập kho & ghi nhận công nợ Nhà cung cấp (${bill.totalAmount.toLocaleString('vi-VN')} đ)`
                }
            });
        }

        return updatedBill;
    });
}

export async function updatePurchaseBill(id: string, data: any) {
    const existing = await prisma.purchaseBill.findUnique({
        where: { id },
        include: { items: { include: { product: true } }, supplier: true }
    });
    if (!existing) throw new Error("Không tìm thấy hóa đơn");
    
    const user = await verifyActionOwnership('PURCHASE_BILLS', 'EDIT', existing.creatorId);
    const uId = user ? (user as any).id : existing.creatorId;

    if (existing.status === 'CANCELLED') {
        throw new Error("Không thể chỉnh sửa hóa đơn đã bị hủy.");
    }

    // Tự động tạo sản phẩm vào kho/danh mục nếu là nhập tự do
    await ensureCustomProductsExist(prisma, data.items, 'PURCHASE');

    const isApprovedOrPaid = existing.status === 'APPROVED' || existing.status === 'PARTIAL_PAID' || existing.status === 'PAID';

    // Format new items
    const formattedNewItems = data.items.map((item: any) => {
        const lineSubTotal = item.quantity * item.unitPrice;
        const lineTaxAmount = calcTaxAmount(lineSubTotal, item.taxRate);
        const isExternal = item.productId === 'EXTERNAL' || !item.productId;
        return {
            productId: isExternal ? null : item.productId,
            productName: isExternal ? item.productName || item.customName : null,
            unit: item.unit || null,
            description: item.description || null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate !== undefined ? item.taxRate : 0,
            taxAmount: lineTaxAmount,
            totalPrice: lineSubTotal + lineTaxAmount
        };
    });

    const diffChanges = computePurchaseBillDiff(existing, data, existing.items, data.items);

    if (!isApprovedOrPaid) {
        // Simple draft update
        const bill = await prisma.purchaseBill.update({
            where: { id },
            data: {
                code: data.code,
                supplierInvoice: data.supplierInvoice,
                supplierId: data.supplierId,
                orderId: data.orderId || null,
                projectId: data.projectId || null,
                date: data.date ? new Date(data.date) : new Date(),
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                notes: data.notes,
                tags: data.tags || null,
                attachment: data.attachment !== undefined ? data.attachment : existing.attachment,
                totalAmount: data.totalAmount,
                subTotal: data.subTotal || 0,
                taxAmount: data.taxAmount || 0,
                items: {
                    deleteMany: {},
                    create: formattedNewItems
                }
            },
            include: {
                supplier: true,
                creator: true
            }
        });

        if (uId) {
            try {
                await prisma.purchaseBillActivityLog.create({
                    data: {
                        billId: id,
                        userId: uId,
                        action: 'UPDATED',
                        details: JSON.stringify({
                            type: 'UPDATE_DIFF',
                            summary: 'Cập nhật thông tin hóa đơn mua hàng (Nháp)',
                            changes: diffChanges.length > 0 ? diffChanges : ['Cập nhật thông tin chung']
                        })
                    }
                });
            } catch (logErr) {
                console.error("Lỗi ghi log PB draft update:", logErr);
            }
        }

        revalidatePath('/purchasing/bills');
        revalidatePath(`/purchasing/bills/${id}`);
        return bill;
    }

    // Adjustment for APPROVED / PARTIAL_PAID / PAID bill
    return prisma.$transaction(async (tx: any) => {
        const currentBill = await tx.purchaseBill.findUnique({
            where: { id },
            include: { items: true, supplier: true }
        });

        if (!currentBill) throw new Error("Hóa đơn không tồn tại");

        const invTxCode = `IN-${currentBill.code}`;
        const invTx = await tx.inventoryTransaction.findUnique({
            where: { code: invTxCode },
            include: { items: true }
        });

        let targetWarehouseId = invTx?.toWarehouseId;
        if (!targetWarehouseId) {
            const defaultWh = await tx.warehouse.findFirst({ where: { isDefault: true } }) || await tx.warehouse.findFirst();
            if (defaultWh) targetWarehouseId = defaultWh.id;
        }

        // 1. Rollback old inventory
        if (invTx && invTx.status === 'COMPLETED' && invTx.toWarehouseId) {
            for (const oldItem of invTx.items) {
                const inv = await tx.inventory.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: oldItem.productId,
                            warehouseId: invTx.toWarehouseId
                        }
                    }
                });

                if (inv) {
                    await tx.inventory.update({
                        where: { id: inv.id },
                        data: { quantity: inv.quantity - oldItem.quantity }
                    });
                }
            }
        }

        // 2. Apply new internal products into inventory
        const newInventoryItems = formattedNewItems.filter((i: any) => i.productId !== null);

        if (targetWarehouseId && newInventoryItems.length > 0) {
            for (const item of newInventoryItems) {
                const inv = await tx.inventory.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: targetWarehouseId
                        }
                    }
                });

                if (inv) {
                    await tx.inventory.update({
                        where: { id: inv.id },
                        data: { quantity: inv.quantity + item.quantity }
                    });
                } else {
                    await tx.inventory.create({
                        data: {
                            productId: item.productId,
                            warehouseId: targetWarehouseId,
                            quantity: item.quantity
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
                        status: 'COMPLETED',
                        notes: `Nhập kho tự động từ Hóa đơn mua hàng ${currentBill.code} (Đã đồng bộ điều chỉnh lúc ${new Date().toLocaleString('vi-VN')})`,
                        items: {
                            create: newInventoryItems.map((item: any) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                price: item.unitPrice
                            }))
                        }
                    }
                });
            } else {
                await tx.inventoryTransaction.create({
                    data: {
                        code: invTxCode,
                        type: 'IN',
                        status: 'COMPLETED',
                        date: new Date(),
                        notes: `Nhập kho tự động từ Hóa đơn mua hàng ${currentBill.code}`,
                        toWarehouseId: targetWarehouseId,
                        supplierId: currentBill.supplierId,
                        creatorId: uId,
                        items: {
                            create: newInventoryItems.map((item: any) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                price: item.unitPrice
                            }))
                        }
                    }
                });
            }
        }

        // 3. Update Supplier Debt
        const oldTotal = currentBill.totalAmount || 0;
        const newTotal = data.totalAmount || 0;
        const delta = newTotal - oldTotal;

        // If supplier changed
        if (currentBill.supplierId !== data.supplierId) {
            // Deduct old supplier
            await tx.supplier.update({
                where: { id: currentBill.supplierId },
                data: { totalDebt: Math.max(0, currentBill.supplier.totalDebt - oldTotal) }
            });
            // Add new supplier
            const newSup = await tx.supplier.findUnique({ where: { id: data.supplierId } });
            if (newSup) {
                await tx.supplier.update({
                    where: { id: data.supplierId },
                    data: { totalDebt: newSup.totalDebt + newTotal }
                });
            }
        } else {
            await tx.supplier.update({
                where: { id: currentBill.supplierId },
                data: { totalDebt: Math.max(0, currentBill.supplier.totalDebt + delta) }
            });
        }

        // 4. Determine new bill status based on paidAmount
        let newStatus = currentBill.status;
        const paid = currentBill.paidAmount || 0;
        if (paid >= newTotal && newTotal > 0) {
            newStatus = 'PAID';
        } else if (paid > 0) {
            newStatus = 'PARTIAL_PAID';
        } else {
            newStatus = 'APPROVED';
        }

        // 5. Update Bill records
        const updatedBill = await tx.purchaseBill.update({
            where: { id },
            data: {
                code: data.code,
                supplierInvoice: data.supplierInvoice,
                supplierId: data.supplierId,
                orderId: data.orderId || null,
                projectId: data.projectId || null,
                date: data.date ? new Date(data.date) : new Date(),
                dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
                notes: data.notes,
                tags: data.tags || null,
                status: newStatus,
                attachment: data.attachment !== undefined ? data.attachment : currentBill.attachment,
                totalAmount: newTotal,
                subTotal: data.subTotal || 0,
                taxAmount: data.taxAmount || 0,
                items: {
                    deleteMany: {},
                    create: formattedNewItems
                }
            },
            include: {
                supplier: true,
                creator: true
            }
        });

        // 6. Record Activity Log
        const logChanges = [...diffChanges];
        logChanges.push(`🔄 **Hệ thống tự động đồng bộ**: Đã hoàn nhập và cập nhật lại tồn kho theo danh mục mới.`);
        logChanges.push(`💳 **Công nợ NCC tự động cập nhật**: ${delta >= 0 ? '+' : ''}${delta.toLocaleString('vi-VN')} đ (Tổng nợ mới ghi nhận: ${newTotal.toLocaleString('vi-VN')} đ).`);

        if (uId) {
            await tx.purchaseBillActivityLog.create({
                data: {
                    billId: id,
                    userId: uId,
                    action: 'ADJUSTED',
                    details: JSON.stringify({
                        type: 'UPDATE_DIFF',
                        summary: 'Điều chỉnh hóa đơn mua hàng (đã đồng bộ kho & công nợ NCC)',
                        changes: logChanges
                    })
                }
            });
        }

        revalidatePath('/purchasing/bills');
        revalidatePath(`/purchasing/bills/${id}`);
        return updatedBill;
    });
}

export async function updatePurchaseBillNotes(id: string, notes: string) {
    const existing = await prisma.purchaseBill.findUnique({ where: { id } });
    if (!existing) throw new Error("Không tìm thấy hóa đơn");
    
    await verifyActionOwnership('PURCHASE_BILLS', 'EDIT', existing.creatorId);

    const bill = await prisma.purchaseBill.update({
        where: { id },
        data: { notes },
        include: {
            supplier: true,
            creator: true,
            items: { include: { product: true } },
            allocations: { include: { payment: true } }
        }
    });

    revalidatePath('/purchasing/bills');
    revalidatePath(`/purchasing/bills/${id}`);
    return bill;
}

export async function updatePurchaseBillTags(id: string, tags: string) {
    const existing = await prisma.purchaseBill.findUnique({ where: { id } });
    if (!existing) throw new Error("Không tìm thấy hóa đơn");
    
    await verifyActionOwnership('PURCHASE_BILLS', 'EDIT', existing.creatorId);

    const bill = await prisma.purchaseBill.update({
        where: { id },
        data: { tags },
        include: {
            supplier: true,
            creator: true
        }
    });

    revalidatePath('/purchasing/bills');
    revalidatePath(`/purchasing/bills/${id}`);
    return bill;
}

export async function deletePurchaseBill(id: string) {
    const existing = await prisma.purchaseBill.findUnique({ where: { id } });
    if (!existing) throw new Error("Không tìm thấy hóa đơn");
    
    await verifyActionOwnership('PURCHASE_BILLS', 'DELETE', existing.creatorId);

    if (existing?.status !== 'DRAFT') throw new Error("Chỉ có thể xóa hóa đơn Nháp");

    await prisma.purchaseBillItem.deleteMany({ where: { billId: id } });
    await prisma.purchaseBill.delete({ where: { id } });

    revalidatePath('/purchasing/bills');
    return true;
}

export async function cancelPurchaseBill(id: string) {
    const user = await verifyActionPermission('PURCHASE_BILLS_EDIT_ALL');
    const uId = user ? (user as any).id : null;

    return prisma.$transaction(async (tx: any) => {
        const bill = await tx.purchaseBill.findUnique({
            where: { id },
            include: { items: true, allocations: true, supplier: true }
        });

        if (!bill) throw new Error("Không tìm thấy hóa đơn này");
        await verifyActionOwnership('PURCHASE_BILLS', 'EDIT', bill.creatorId);
        if (bill.status === 'CANCELLED') throw new Error("Hóa đơn đã bị hủy từ trước");
        if (bill.status === 'PAID' || bill.status === 'PARTIAL_PAID') {
            throw new Error("Hóa đơn đang có phiếu chi thanh toán. Vui lòng hủy phiếu chi liên quan trước khi hủy hóa đơn.");
        }
        if (bill.allocations && bill.allocations.length > 0) {
            throw new Error("Hóa đơn này đã được phân bổ thanh toán. Vui lòng gỡ hoặc hủy phiếu thu trước.");
        }

        if (bill.status === 'APPROVED') {
            // Find related inventory transaction
            const invTxCode = `IN-${bill.code}`;
            const invTx = await tx.inventoryTransaction.findUnique({
                where: { code: invTxCode },
                include: { items: true }
            });

            if (invTx && invTx.status === 'COMPLETED') {
                // Revert inventory quantities
                for (const item of invTx.items) {
                    const inventory = await tx.inventory.findUnique({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: invTx.toWarehouseId
                            }
                        }
                    });

                    if (inventory && inventory.quantity >= item.quantity) {
                        await tx.inventory.update({
                            where: { id: inventory.id },
                            data: { quantity: inventory.quantity - item.quantity }
                        });
                    }
                }
                // Mark inventory transaction as cancelled
                await tx.inventoryTransaction.update({
                    where: { id: invTx.id },
                    data: { status: 'CANCELLED', notes: `${invTx.notes || ''} (Đã hủy do hủy hóa đơn mua hàng)` }
                });
            }

            // Reverse Supplier Debt
            await tx.supplier.update({
                where: { id: bill.supplierId },
                data: { totalDebt: Math.max(0, bill.supplier.totalDebt - bill.totalAmount) }
            });
        }

        const updatedBill = await tx.purchaseBill.update({
            where: { id },
            data: { status: 'CANCELLED', notes: `${bill.notes || ''}\n[Đã hủy bởi ${(user as any)?.name || 'System'}]`.trim() }
        });

        if (uId) {
            await tx.purchaseBillActivityLog.create({
                data: {
                    billId: id,
                    userId: uId,
                    action: 'CANCELLED',
                    details: `Hủy hóa đơn mua hàng, hoàn tác tồn kho và giảm trừ công nợ NCC (${bill.totalAmount.toLocaleString('vi-VN')} đ)`
                }
            });
        }

        revalidatePath('/purchasing/bills');
        return updatedBill;
    });
}

// ---------------------------------------------------------------------------
// PURCHASE PAYMENTS (Quản lý Thanh Toán Công Nợ)
// ---------------------------------------------------------------------------

export async function getPurchasePayments() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const viewFilter = buildViewFilter(session.user.id, session.user.permissions as string[] || [], 'PURCHASE_PAYMENTS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return [];

    return prisma.purchasePayment.findMany({
        where: viewFilter,
        include: {
            supplier: true,
            creator: true,
            allocations: {
                include: { bill: true }
            }
        },
        orderBy: { date: 'desc' }
    });
}

export async function createPurchasePayment(data: any) {
    const user = await verifyActionPermission('PURCHASE_PAYMENTS_CREATE');
    const uId = (user as any).id;

    return prisma.$transaction(async (tx: any) => {
        let code = data.code;
        if (!code) {
            const count = await tx.purchasePayment.count();
            code = `PAY-${(count + 1).toString().padStart(6, '0')}`;
        }

        const supplier = await tx.supplier.findUnique({ where: { id: data.supplierId } });
        if (!supplier) throw new Error("Nhà cung cấp không tồn tại");

        let allocationsData = [];
        let totalAllocated = 0;

        // Ensure allocations array exists
        const providedAllocations = data.allocations || [];

        for (const alloc of providedAllocations) {
            if (alloc.amount > 0) {
                // Verify bill
                const bill = await tx.purchaseBill.findUnique({ where: { id: alloc.billId } });
                if (!bill) throw new Error(`Hóa đơn ${alloc.billId} không tồn tại`);

                const remainingOnBill = bill.totalAmount - bill.paidAmount;
                if (alloc.amount > remainingOnBill + 0.01) { // Add small tolerance for float issues
                    throw new Error(`Số tiền phân bổ cho hóa đơn ${bill.code} vượt quá số tiền còn lại phải trả`);
                }

                allocationsData.push({
                    billId: alloc.billId,
                    amount: alloc.amount
                });
                totalAllocated += alloc.amount;

                // Update bill paid amount and status
                const newPaidAmount = bill.paidAmount + alloc.amount;
                const newStatus = (newPaidAmount >= bill.totalAmount - 0.01) ? 'PAID' : 'PARTIAL_PAID'; // Tolerance again

                await tx.purchaseBill.update({
                    where: { id: bill.id },
                    data: {
                        paidAmount: newPaidAmount,
                        status: newStatus
                    }
                });
            }
        }

        // Validate total payment amount against allocations if allocations are provided explicitly
        if (providedAllocations.length > 0 && Math.abs(data.amount - totalAllocated) > 0.01) {
            // Note: in a real system, unallocated amounts could be saved as supplier credit. We're keeping it simple here.
            // Or we just allow the total amount to be higher and only allocate what's specified.
        }

        // 1. Create Payment
        const payment = await tx.purchasePayment.create({
            data: {
                code,
                date: data.date ? new Date(data.date) : new Date(),
                amount: data.amount,
                paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
                reference: data.reference,
                notes: data.notes,
                attachment: data.attachment,
                supplierId: data.supplierId,
                creatorId: uId,
                allocations: {
                    create: allocationsData
                }
            }
        });

        // 2. Reduce Supplier Debt
        await tx.supplier.update({
            where: { id: data.supplierId },
            data: { totalDebt: supplier.totalDebt - data.amount }
        });

        return payment;
    });
}

export async function payPurchaseBill(
    billId: string,
    amount: number,
    paymentMethod: string = 'BANK_TRANSFER',
    reference: string = '',
    notes: string = ''
) {
    try {
        const u = await verifyActionPermission('PURCHASE_PAYMENTS_CREATE');
        const creatorId = u ? (u as any).id : 'system';

        const result = await prisma.$transaction(async (tx) => {
            const bill = await tx.purchaseBill.findUnique({
                where: { id: billId }
            });
            if (!bill) throw new Error("Hóa đơn không tồn tại");

            // Get next payment code robustly
            const payments = await tx.purchasePayment.findMany({ select: { code: true } });
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
            const payment = await tx.purchasePayment.create({
                data: {
                    code: nextCode,
                    date: new Date(),
                    amount,
                    paymentMethod,
                    reference,
                    notes: notes || `Chi tiền theo hóa đơn ${bill.code}`,
                    supplierId: bill.supplierId,
                    creatorId,
                    allocations: {
                        create: [{ billId: bill.id, amount }]
                    }
                }
            });

            // Decrease supplier debt
            await tx.supplier.update({
                where: { id: bill.supplierId },
                data: { totalDebt: { decrement: amount } }
            });

            // Increase bill paidAmount
            const updatedBill = await tx.purchaseBill.update({
                where: { id: bill.id },
                data: { paidAmount: { increment: amount } }
            });

            await tx.purchaseBillActivityLog.create({
                data: {
                    billId: bill.id,
                    userId: creatorId,
                    action: 'UPDATED',
                    details: `Chi tiền thanh toán: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 6 }).format(amount)} (Phiếu chi: ${payment.code})`
                }
            });

            // Update status if needed
            const newStatus = (updatedBill.paidAmount >= updatedBill.totalAmount - 0.0001) ? 'PAID' : 'PARTIAL_PAID';
            if (updatedBill.status !== newStatus && updatedBill.status !== 'DRAFT' && updatedBill.status !== 'CANCELLED') {
                await tx.purchaseBill.update({
                    where: { id: updatedBill.id },
                    data: { status: newStatus }
                });
            }

            return payment;
        });

        revalidatePath('/purchasing/bills');
        revalidatePath(`/purchasing/bills/${billId}`);
        revalidatePath('/purchasing/payments');
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Lỗi khi chi tiền thanh toán hóa đơn:", error);
        return { success: false, error: error.message };
    }
}

export async function updatePurchasePayment(id: string, data: any) {
    const oldPayment = await prisma.purchasePayment.findUnique({ where: { id } });
    if (!oldPayment) throw new Error("Phiếu chi không tồn tại");
    await verifyActionOwnership('PURCHASE_PAYMENTS', 'EDIT', oldPayment.creatorId);

    // Simplification: only allow updating notes and reference
    const payment = await prisma.purchasePayment.update({
        where: { id },
        data: {
            reference: data.reference,
            notes: data.notes,
            paymentMethod: data.paymentMethod,
        }
    });

    revalidatePath('/purchasing/payments');
    revalidatePath(`/purchasing/payments/${id}`);
    return payment;
}

export async function deletePurchasePayment(id: string) {
    await getUser();

    return prisma.$transaction(async (tx: any) => {
        const payment = await tx.purchasePayment.findUnique({
            where: { id },
            include: { allocations: true }
        });

        if (!payment) throw new Error("Phiếu chi không tồn tại");
        await verifyActionOwnership('PURCHASE_PAYMENTS', 'DELETE', payment.creatorId);

        // Reverse debt
        const supplier = await tx.supplier.findUnique({ where: { id: payment.supplierId } });
        await tx.supplier.update({
            where: { id: payment.supplierId },
            data: { totalDebt: supplier.totalDebt + payment.amount }
        });

        // Reverse bill status and paid amount
        for (const alloc of payment.allocations) {
            const bill = await tx.purchaseBill.findUnique({ where: { id: alloc.billId } });
            if (bill) {
                const newPaidAmount = Math.max(0, bill.paidAmount - alloc.amount);
                const newStatus = (newPaidAmount >= bill.totalAmount - 0.01) ? 'PAID' : (newPaidAmount > 0 ? 'PARTIAL_PAID' : 'APPROVED');
                await tx.purchaseBill.update({
                    where: { id: bill.id },
                    data: { paidAmount: newPaidAmount, status: newStatus }
                });
            }
        }

        // Delete allocations then payment
        await tx.purchasePaymentAllocation.deleteMany({ where: { paymentId: id } });
        await tx.purchasePayment.delete({ where: { id } });

        revalidatePath('/purchasing/payments');
        return true;
    });
}

export async function uploadPurchasePaymentDocument(paymentId: string, url: string, name: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.$transaction(async (tx: any) => {
        const payment = await tx.purchasePayment.findUnique({
            where: { id: paymentId }
        });

        if (!payment) throw new Error("Không tìm thấy Phiếu Chi này");
        await verifyActionOwnership('PURCHASE_PAYMENTS', 'EDIT', payment.creatorId);

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

        const updatedPayment = await tx.purchasePayment.update({
            where: { id: paymentId },
            data: {
                attachment: JSON.stringify(existingDocs)
            },
            include: {
                supplier: true,
                creator: true,
                allocations: {
                    include: { bill: true }
                }
            }
        });

        revalidatePath(`/purchasing/payments/${paymentId}`);
        return updatedPayment;
    });
}

// ---------------------------------------------------------------------------
// UPLOAD DOCUMENTS FOR BILLS
// ---------------------------------------------------------------------------

export async function uploadPurchaseBillDocument(billId: string, url: string, name: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    return prisma.$transaction(async (tx: any) => {
        const bill = await tx.purchaseBill.findUnique({
            where: { id: billId }
        });

        if (!bill) throw new Error("Không tìm thấy Hóa đơn này");
        await verifyActionOwnership('PURCHASE_BILLS', 'EDIT', bill.creatorId);

        let existingDocs: any[] = [];
        if (bill.attachment) {
            try {
                existingDocs = JSON.parse(bill.attachment);
            } catch (e) {
                existingDocs = [{
                    url: bill.attachment,
                    name: "Tài liệu",
                    uploadedAt: bill.createdAt
                }];
            }
        }

        existingDocs.push({
            url,
            name,
            uploadedAt: new Date().toISOString()
        });

        const updatedBill = await tx.purchaseBill.update({
            where: { id: billId },
            data: {
                attachment: JSON.stringify(existingDocs)
            },
            include: {
                supplier: true,
                creator: true,
                items: { include: { product: true } },
                allocations: { include: { payment: true } }
            }
        });

        revalidatePath(`/purchasing/bills/${billId}`);
        return updatedBill;
    });
}

export async function sendPurchaseOrderEmail(orderId: string, to: string, subject: string, htmlBody: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: "Unauthorized" };
        }

        const order = await prisma.purchaseOrder.findUnique({
            where: { id: orderId },
            include: { supplier: true }
        });

        if (!order) {
            return { success: false, error: "Không tìm thấy đơn hàng." };
        }

        const res = await sendEmailWithTracking({
            to,
            subject,
            htmlBody,
            senderId: session.user.id,
            // Supplier IDs are not supported by the email tracking currently, so we don't pass customerId unless we add supplierId to the model. 
        });

        return res;
    } catch (error: any) {
        console.error("Lỗi khi gửi email Đơn Mua Hàng:", error);
        return { success: false, error: error.message };
    }
}

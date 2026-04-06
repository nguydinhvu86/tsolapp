'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';

export async function importInventoryFromInvoice(invoiceId: string, actionType: 'DEBT_ONLY' | 'INVENTORY_ONLY' | 'BOTH' = 'BOTH', toWarehouseId?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    let targetWarehouseId = toWarehouseId;
    if (!targetWarehouseId || targetWarehouseId === 'W-0001') {
        const defaultWh = await prisma.warehouse.findFirst({ where: { isDefault: true } });
        if (defaultWh) targetWarehouseId = defaultWh.id;
        else {
            const anyWh = await prisma.warehouse.findFirst();
            if (anyWh) targetWarehouseId = anyWh.id;
            else throw new Error("Hệ thống chưa có Kho hàng nào. Vui lòng tạo ít nhất 1 Kho trước khi nhập.");
        }
    }

    return prisma.$transaction(async (tx: any) => {
        // 1. Fetch Supplier Invoice
        const invoice = await tx.supplierInvoice.findUnique({
            where: { id: invoiceId },
            include: { items: true }
        });

        if (!invoice) throw new Error("Không tìm thấy hóa đơn điện tử");
        if (invoice.status === 'INVENTORY_IMPORTED') throw new Error("Hóa đơn này đã được nhập kho");
        if (!invoice.supplierId) throw new Error("Hóa đơn chưa được map với Nhà cung cấp nào");

        // 2. Resolve or Auto-Create Products to valid Product IDs
        const resolvedItems = [];
        for (const item of invoice.items) {
            let product = await tx.product.findFirst({
                where: { name: { contains: item.productName } }
            });

            if (!product) {
                const pcount = await tx.product.count();
                const pcode = `TSOL-${(pcount + 1).toString().padStart(6, '0')}`;
                product = await tx.product.create({
                    data: {
                        name: item.productName,
                        sku: pcode,
                        type: 'PRODUCT',
                        salePrice: 0,
                        importPrice: item.unitPrice > 0 ? item.unitPrice : 0,
                        taxRate: item.taxRate || 0,
                        description: null,
                        notes: 'Tự động tạo từ Hóa đơn điện tử',
                        isActive: true
                    }
                });
            }
            resolvedItems.push({
                productId: product.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxRate: item.taxRate,
                totalPrice: item.totalPrice,
                taxAmount: item.quantity * item.unitPrice * ((item.taxRate || 0) / 100)
            });
        }

        // 3. Create the PurchaseBill if calculating Debt
        let code = '';
        if (actionType === 'DEBT_ONLY' || actionType === 'BOTH') {
            const count = await tx.purchaseBill.count();
            code = `PB-${(count + 1).toString().padStart(6, '0')}`;

            const bill = await tx.purchaseBill.create({
                data: {
                    code,
                    supplierInvoice: invoice.invoiceNumber,
                    supplierId: invoice.supplierId,
                    date: new Date(),
                    status: 'APPROVED', // Immediately approved as requested
                    totalAmount: invoice.totalAmount,
                    subTotal: invoice.totalAmount - invoice.taxAmount,
                    taxAmount: invoice.taxAmount,
                    creatorId: session.user.id,
                    notes: `[NỘI BỘ] Tự động sinh từ hóa đơn điện tử ${invoice.invoiceNumber}. Các sản phẩm mới đã được tự động xuất vào thư viện kho.`,
                    items: {
                        create: resolvedItems.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            taxRate: item.taxRate,
                            taxAmount: item.taxAmount,
                            totalPrice: item.totalPrice
                        }))
                    }
                }
            });

            // 4. Update Supplier Debt (Cộng nợ)
            await tx.supplier.update({
                where: { id: invoice.supplierId },
                data: { totalDebt: { increment: bill.totalAmount } }
            });
        }

        // 5. Generate Inventory Transaction if Importing
        if (actionType === 'INVENTORY_ONLY' || actionType === 'BOTH') {
            const countTx = await tx.inventoryTransaction.count();
            const invTxCode = `IN-${(countTx + 1).toString().padStart(6, '0')}`; // Use count if PB code isn't available

            await tx.inventoryTransaction.create({
                data: {
                    code: invTxCode,
                    type: 'IN',
                    status: 'COMPLETED',
                    date: new Date(),
                    notes: null,
                    toWarehouseId: targetWarehouseId,
                    supplierId: invoice.supplierId,
                    creatorId: session.user.id,
                    items: {
                        create: resolvedItems.map((item: any) => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            price: item.unitPrice
                        }))
                    }
                }
            });

            // 6. Update actual Warehouse Inventories (Cộng Tồn trực tiếp)
            for (const item of resolvedItems) {
                const inventory = await tx.inventory.findUnique({
                    where: {
                        productId_warehouseId: { productId: item.productId, warehouseId: targetWarehouseId! }
                    }
                });

                if (inventory) {
                    await tx.inventory.update({
                        where: { id: inventory.id },
                        data: { quantity: inventory.quantity + item.quantity }
                    });
                } else {
                    await tx.inventory.create({
                        data: { productId: item.productId, warehouseId: targetWarehouseId!, quantity: item.quantity }
                    });
                }
            }
        }

        // 7. Update SupplierInvoice status
        let nextStatus = 'INVENTORY_IMPORTED';
        if (actionType === 'DEBT_ONLY') nextStatus = 'DEBT_RECORDED';
        if (actionType === 'BOTH') nextStatus = 'COMPLETED';
        if (invoice.status === 'DEBT_RECORDED' && actionType === 'INVENTORY_ONLY') nextStatus = 'COMPLETED';
        if (invoice.status === 'INVENTORY_IMPORTED' && actionType === 'DEBT_ONLY') nextStatus = 'COMPLETED';

        await tx.supplierInvoice.update({
            where: { id: invoiceId },
            data: { status: nextStatus }
        });

        // (Tính năng nhâm bản Task tự động đã được gỡ bỏ theo yêu cầu để người dùng tự xử lý quy trình thanh toán riêng)

        revalidatePath('/accounting/invoices');
        revalidatePath(`/suppliers/${invoice.supplierId}`);

        return true;
    });
}

export async function triggerManualScan() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    // We can't import this at the top to avoid circular deps if any, but it's safe to import dynamically
    const { fetchUnreadInvoices } = await import('@/lib/email-scanner');
    const result = await fetchUnreadInvoices();

    if (result.success) {
        revalidatePath('/accounting/invoices');
        return { success: true, count: result.processedCount };
    } else {
        throw new Error(result.error || "Có lỗi khi lấy hóa đơn");
    }
}

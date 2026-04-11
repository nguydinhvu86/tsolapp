'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import { verifyActionPermission } from '@/lib/permissions';
import fs from 'fs';
import path from 'path';

export async function importInventoryFromInvoice(invoiceId: string, actionType: 'DEBT_ONLY' | 'INVENTORY_ONLY' | 'BOTH' = 'BOTH', toWarehouseId?: string) {
    const user = await verifyActionPermission('ACCOUNTING_CREATE');
    const uId = (user as any).id;

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
                    creatorId: uId,
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
                    creatorId: uId,
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
    await verifyActionPermission('ACCOUNTING_CREATE');

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

export async function uploadInvoiceFiles(invoiceId: string, formData: FormData) {
    await verifyActionPermission('ACCOUNTING_CREATE');

    const xmlFile = formData.get('xmlFile') as File | null;
    const pdfFile = formData.get('pdfFile') as File | null;

    if (!xmlFile) {
        throw new Error("Bắt buộc phải tải lên file XML gốc của hóa đơn.");
    }

    const xmlBuffer = Buffer.from(await xmlFile.arrayBuffer());
    let pdfBuffer: Buffer | null = null;
    if (pdfFile) {
        pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    }

    // 1. Vị trí lưu trữ
    const invoicesDir = path.join(process.cwd(), 'uploads_data', 'invoices');
    if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
    }

    const invoice = await prisma.supplierInvoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) throw new Error("Không tìm thấy hóa đơn này trong hệ thống.");

    const timestamp = Date.now();
    let invoiceNumClean = invoice.invoiceNumber || 'HD';
    // Lọc ký tự lạ nếu có
    invoiceNumClean = invoiceNumClean.replace(/[^a-zA-Z0-9-]/g, '');

    const xmlFilename = `${invoiceNumClean}_${timestamp}.xml`;
    const xmlPath = path.join(invoicesDir, xmlFilename);
    fs.writeFileSync(xmlPath, xmlBuffer);
    const xmlUrl = `/api/files/invoices/${xmlFilename}`;

    let pdfUrl = '';
    if (pdfBuffer) {
        const pdfFilename = `${invoiceNumClean}_${timestamp}.pdf`;
        const pdfPath = path.join(invoicesDir, pdfFilename);
        fs.writeFileSync(pdfPath, pdfBuffer);
        pdfUrl = `/api/files/invoices/${pdfFilename}`;
    }

    // 2. Parse XML
    const { parseXmlInvoice } = await import('@/lib/invoice-parser');
    const xmlString = xmlBuffer.toString('utf8');
    const invoiceData = parseXmlInvoice(xmlString);

    if (!invoiceData) {
        throw new Error("Không thể trích xuất dữ liệu từ File XML này. Có thể XML không đúng chuẩn của Tổng cục Thuế.");
    }

    // 3. Xử lý lại Supplier (Map NCC theo MST thật từ file XML)
    let finalSupplierId = invoice.supplierId;
    if (invoiceData.supplierTaxCode) {
         let existingSup = await prisma.supplier.findFirst({
             where: { taxCode: { contains: invoiceData.supplierTaxCode } }
         });
         
         if (existingSup) {
             finalSupplierId = existingSup.id;
         } else {
             const count = await prisma.supplier.count();
             const sCode = `NCC-${(count + 1).toString().padStart(6, '0')}`;
             existingSup = await prisma.supplier.create({
                 data: {
                     code: sCode,
                     name: invoiceData.supplierName || 'NCC Mới từ Hóa Đơn',
                     taxCode: invoiceData.supplierTaxCode,
                     totalDebt: 0
                 }
             });
             finalSupplierId = existingSup.id;
         }
    }

    // 4. Update Invoice
    return prisma.$transaction(async (tx: any) => {
         // Cập nhật thông tin invoice gốc
         await tx.supplierInvoice.update({
             where: { id: invoiceId },
             data: {
                 invoiceNumber: invoiceData.invoiceNumber,
                 issueDate: invoiceData.issueDate || undefined,
                 totalAmount: invoiceData.totalAmount || 0,
                 taxAmount: invoiceData.taxAmount || 0,
                 supplierName: invoiceData.supplierName,
                 supplierTaxCode: invoiceData.supplierTaxCode,
                 xmlUrl,
                 pdfUrl: pdfUrl || invoice.pdfUrl,
                 supplierId: finalSupplierId,
                 // Đưa status về bình thường nếu đang bị treo (Wait File không phải 1 cột database logic riêng biệt, 
                 // nó tự biến mất dựa trên việc xmlUrl != null theo thiết kế view).
             }
         });

         // Clear old items if they existed (unlikely for wait file but safe to do)
         await tx.supplierInvoiceItem.deleteMany({
             where: { invoiceId: invoiceId }
         });

         // Insert new items
         if (invoiceData.items && invoiceData.items.length > 0) {
             await tx.supplierInvoiceItem.createMany({
                 data: invoiceData.items.map((item: any) => ({
                     invoiceId: invoiceId,
                     productName: item.productName || 'Không có tên',
                     quantity: item.quantity || 0,
                     unitPrice: item.unitPrice || 0,
                     totalPrice: item.totalPrice || 0,
                     taxRate: item.taxRate || 0
                 }))
             });
         }

         revalidatePath('/accounting/invoices');
         return { success: true };
    });
}

export async function deleteInvoice(invoiceId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    // Chỉ cho phép admin hoặc người có quyền kế toán xóa
    const permissions = (session.user as any)?.permissions as string[] || [];
    const canDelete = permissions.includes('ACCOUNTING_DELETE_ALL') || permissions.includes('ACCOUNTING_DELETE') || (session.user as any)?.role === 'ADMIN';

    if (!canDelete) {
        throw new Error("Bạn không có quyền xóa hóa đơn đầu vào!");
    }

    return prisma.$transaction(async (tx: any) => {
        const inv = await tx.supplierInvoice.findUnique({ where: { id: invoiceId } });
        if (!inv) throw new Error("Không tìm thấy hóa đơn");

        if (inv.status === 'INVENTORY_IMPORTED' || inv.status === 'DEBT_RECORDED' || inv.status === 'COMPLETED') {
            throw new Error("Không thể xóa hóa đơn đã được ghi nhận Công Nợ / Nhập Kho!");
        }

        // Delete items first (though onDelete: Cascade usually handles this, it's safer)
        await tx.supplierInvoiceItem.deleteMany({
            where: { invoiceId: invoiceId }
        });

        // Delete invoice
        await tx.supplierInvoice.delete({
            where: { id: invoiceId }
        });

        revalidatePath('/accounting/invoices');
        return true;
    });
}

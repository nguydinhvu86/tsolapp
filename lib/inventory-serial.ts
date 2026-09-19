import { prisma } from '@/lib/prisma';

export interface ReceiveSerialsInput {
    productId: string;
    serialNumbers: string[];
    warehouseId?: string;
    purchaseBillId?: string;
    notes?: string;
}

export interface DispatchSerialsInput {
    serialNumbers: string[];
    salesInvoiceId: string;
    customerId: string;
    warrantyMonths?: number;
}

/**
 * Nhập kho danh sách số Serial/IMEI từ hóa đơn mua hàng hoặc kiểm kê
 */
export async function receiveProductSerials(input: ReceiveSerialsInput) {
    const results = [];
    for (const serial of input.serialNumbers) {
        const trimmed = serial.trim();
        if (!trimmed) continue;

        const record = await prisma.productSerial.upsert({
            where: { serialNumber: trimmed },
            update: {
                productId: input.productId,
                warehouseId: input.warehouseId || null,
                purchaseBillId: input.purchaseBillId || null,
                status: 'IN_STOCK',
                notes: input.notes || null,
            },
            create: {
                productId: input.productId,
                serialNumber: trimmed,
                warehouseId: input.warehouseId || null,
                purchaseBillId: input.purchaseBillId || null,
                status: 'IN_STOCK',
                notes: input.notes || null,
            }
        });
        results.push(record);
    }
    return results;
}

/**
 * Xuất kho số Serial/IMEI khi bán hàng cho khách và tự động tính hạn bảo hành
 */
export async function dispatchProductSerials(input: DispatchSerialsInput) {
    const warrantyMonths = input.warrantyMonths || 12; // Mặc định bảo hành 12 tháng
    const warrantyEndDate = new Date();
    warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);

    const updated = [];
    for (const serial of input.serialNumbers) {
        const trimmed = serial.trim();
        if (!trimmed) continue;

        const res = await prisma.productSerial.update({
            where: { serialNumber: trimmed },
            data: {
                status: 'SOLD',
                salesInvoiceId: input.salesInvoiceId,
                customerId: input.customerId,
                warrantyEndDate,
            }
        });
        updated.push(res);
    }
    return updated;
}

/**
 * Tra cứu thông tin bảo hành và nguồn gốc của một số Serial/IMEI
 */
export async function lookupSerialWarranty(serialNumber: string) {
    const cleanSerial = serialNumber.trim();
    const record = await prisma.productSerial.findUnique({
        where: { serialNumber: cleanSerial },
        include: {
            product: {
                select: { id: true, name: true, sku: true, unit: true }
            },
            customer: {
                select: { id: true, name: true, phone: true, email: true }
            },
            salesInvoice: {
                select: { id: true, code: true, date: true }
            },
            purchaseBill: {
                select: { id: true, code: true, date: true }
            },
            warehouse: {
                select: { id: true, name: true }
            }
        }
    });

    if (!record) return null;

    const isWarrantyValid = record.warrantyEndDate ? new Date() <= new Date(record.warrantyEndDate) : false;

    return {
        ...record,
        isWarrantyValid,
        daysRemaining: record.warrantyEndDate 
            ? Math.max(0, Math.ceil((new Date(record.warrantyEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : 0
    };
}

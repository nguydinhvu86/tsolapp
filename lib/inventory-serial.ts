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
    salesInvoiceId?: string;
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
 * Xuất kho số Serial/IMEI khi bán hàng cho khách và tự động tính hạn bảo hành theo cài đặt của từng sản phẩm
 */
export async function dispatchProductSerials(input: DispatchSerialsInput) {
    const now = new Date();
    const updated = [];
    for (const serial of input.serialNumbers) {
        const trimmed = serial.trim();
        if (!trimmed) continue;

        const existing = await prisma.productSerial.findUnique({
            where: { serialNumber: trimmed },
            include: { product: true }
        });

        const warrantyMonths = input.warrantyMonths !== undefined 
            ? input.warrantyMonths 
            : (existing?.product?.warrantyMonths ?? 12);

        let warrantyEndDate: Date | null = null;
        if (warrantyMonths > 0) {
            warrantyEndDate = new Date(now);
            warrantyEndDate.setMonth(warrantyEndDate.getMonth() + warrantyMonths);
        }

        const res = await prisma.productSerial.update({
            where: { serialNumber: trimmed },
            data: {
                status: 'SOLD',
                salesInvoiceId: input.salesInvoiceId || null,
                customerId: input.customerId,
                warrantyStartDate: now,
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
                select: { id: true, name: true, sku: true, unit: true, warrantyMonths: true }
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

    const warrantyMonths = record.product?.warrantyMonths ?? 12;
    const isNoWarranty = warrantyMonths === 0;

    const startDate = record.warrantyStartDate || record.salesInvoice?.date || (record.status === 'SOLD' ? record.updatedAt : null);
    const endDate = record.warrantyEndDate;

    const now = new Date();
    const isWarrantyValid = !isNoWarranty && !!endDate && now <= new Date(endDate);
    const isExpired = !isNoWarranty && !!endDate && now > new Date(endDate);

    let daysRemaining = 0;
    let daysExpired = 0;
    if (endDate && !isNoWarranty) {
        const diffDays = Math.ceil((new Date(endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0) {
            daysRemaining = diffDays;
        } else {
            daysExpired = Math.abs(diffDays);
        }
    }

    return {
        ...record,
        warrantyMonths,
        isNoWarranty,
        warrantyStartDate: startDate,
        warrantyEndDate: endDate,
        isWarrantyValid,
        isExpired,
        daysRemaining,
        daysExpired
    };
}

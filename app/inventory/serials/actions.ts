'use server'

import { prisma } from '@/lib/prisma';
import { lookupSerialWarranty } from '@/lib/inventory-serial';

export async function fetchSerials(params?: { search?: string; status?: string; productId?: string }) {
    try {
        const where: any = {};
        if (params?.status && params.status !== 'ALL') {
            where.status = params.status;
        }
        if (params?.productId) {
            where.productId = params.productId;
        }
        if (params?.search) {
            where.OR = [
                { serialNumber: { contains: params.search } },
                { notes: { contains: params.search } },
                { product: { name: { contains: params.search } } }
            ];
        }

        const serials = await prisma.productSerial.findMany({
            where,
            include: {
                product: { select: { id: true, name: true, sku: true } },
                customer: { select: { id: true, name: true, phone: true } },
                salesInvoice: { select: { id: true, code: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        const products = await prisma.product.findMany({
            where: { isActive: true },
            select: { id: true, name: true, sku: true, unit: true },
            orderBy: { name: 'asc' }
        });

        return { success: true, serials, products };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function createSerialRecord(data: { productId: string; serialNumber: string; notes?: string }) {
    try {
        const existing = await prisma.productSerial.findUnique({
            where: { serialNumber: data.serialNumber }
        });
        if (existing) {
            return { success: false, error: 'Số Serial/IMEI này đã tồn tại trong hệ thống' };
        }

        const newSerial = await prisma.productSerial.create({
            data: {
                productId: data.productId,
                serialNumber: data.serialNumber.trim(),
                status: 'IN_STOCK',
                notes: data.notes
            }
        });
        return { success: true, serial: newSerial };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function lookupWarranty(serialNumber: string) {
    try {
        const info = await lookupSerialWarranty(serialNumber.trim());
        if (!info) {
            return { success: false, error: 'Không tìm thấy số Serial/IMEI này' };
        }
        return { 
            success: true, 
            data: {
                productName: info.product?.name,
                warrantyEndDate: info.warrantyEndDate,
                remainingDays: info.daysRemaining,
                customerName: info.customer?.name
            } 
        };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

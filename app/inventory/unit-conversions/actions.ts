'use server'

import { prisma } from '@/lib/prisma';
import { setProductUnitConversion } from '@/lib/inventory-uom';

export async function fetchUnitConversions() {
    try {
        const conversions = await prisma.productUnitConversion.findMany({
            include: {
                product: { select: { id: true, name: true, sku: true, unit: true, salePrice: true } }
            },
            orderBy: [{ productId: 'asc' }, { conversionRate: 'asc' }]
        });

        const products = await prisma.product.findMany({
            where: { isActive: true },
            select: { id: true, name: true, sku: true, unit: true, salePrice: true },
            orderBy: { name: 'asc' }
        });

        return { success: true, conversions, products };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function saveUnitConversions(productId: string, units: Array<{ unitName: string; conversionRate: number; isBaseUnit: boolean; salePrice?: number }>) {
    try {
        for (const u of units) {
            await setProductUnitConversion({
                productId,
                unitName: u.unitName,
                conversionRate: u.conversionRate,
                isBaseUnit: u.isBaseUnit,
                salePrice: u.salePrice
            });
        }
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

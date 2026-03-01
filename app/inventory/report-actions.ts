'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// --- REPORTS ---

export async function getStockValuation(warehouseId?: string) {
    const products = await prisma.product.findMany({
        where: { type: 'PRODUCT', isActive: true },
        include: {
            inventories: warehouseId ? { where: { warehouseId } } : { include: { warehouse: true } }
        },
        orderBy: { name: 'asc' }
    });

    return products.map(p => {
        const totalQty = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
        return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            price: p.importPrice || 0, // Valuation usually based on Cost/Import Price
            qty: totalQty,
            totalValue: totalQty * (p.importPrice || 0),
            minStockLevel: p.minStockLevel
        };
    }).filter(p => p.qty > 0 || (p.minStockLevel && p.qty <= p.minStockLevel)); // Show items in stock or items needing restock
}

export async function getStockLedger(productId: string, warehouseId?: string) {
    // A Stock Ledger needs all COMPLETED transactions involving this product (and optionally warehouse)
    // Ordered chronologically to calculate running balance.

    const transactions = await prisma.inventoryTransactionItem.findMany({
        where: {
            productId,
            transaction: {
                status: 'COMPLETED',
                ...(warehouseId ? {
                    OR: [
                        { fromWarehouseId: warehouseId },
                        { toWarehouseId: warehouseId }
                    ]
                } : {})
            }
        },
        include: {
            transaction: {
                include: {
                    fromWarehouse: true,
                    toWarehouse: true,
                }
            }
        },
        orderBy: {
            transaction: { date: 'asc' }
        }
    });

    // Calculate generic running balance if no warehouse is specified, or warehouse-specific
    let runningBalance = 0;

    return transactions.map(item => {
        const t = item.transaction;
        let change = 0;
        let typeLabel = "KHÔNG XÁC ĐỊNH";

        if (t.type === 'IN') {
            if (!warehouseId || t.toWarehouseId === warehouseId) {
                change = item.quantity;
                typeLabel = 'NHẬP KHO';
            }
        }
        else if (t.type === 'OUT') {
            if (!warehouseId || t.fromWarehouseId === warehouseId) {
                change = -item.quantity;
                typeLabel = 'XUẤT KHO';
            }
        }
        else if (t.type === 'TRANSFER') {
            if (warehouseId) {
                if (t.toWarehouseId === warehouseId) {
                    change = item.quantity;
                    typeLabel = `NHẬN TỪ: ${t.fromWarehouse?.name}`;
                } else if (t.fromWarehouseId === warehouseId) {
                    change = -item.quantity;
                    typeLabel = `CHUYỂN ĐẾN: ${t.toWarehouse?.name}`;
                }
            } else {
                // Transfer doesn't affect total overall generic balance, so change is 0.
                typeLabel = `CHUYỂN: ${t.fromWarehouse?.name} -> ${t.toWarehouse?.name}`;
            }
        }
        else if (t.type === 'ADJUSTMENT') {
            if (!warehouseId || t.fromWarehouseId === warehouseId) {
                change = item.quantity; // Adjustment qty is explicitly the difference (+ or -)
                typeLabel = 'KIỂM KÊ / ĐIỀU CHỈNH';
            }
        }

        runningBalance += change;

        return {
            date: t.date,
            code: t.code,
            type: typeLabel,
            notes: t.notes,
            change,
            runningBalance,
            documentId: t.id
        };
    });
}


// --- ADJUSTMENTS ---

// Fetches current state of warehouse to help user enter actuals
export async function getWarehouseStockForAdjustment(warehouseId: string) {
    return prisma.inventory.findMany({
        where: { warehouseId },
        include: {
            product: {
                select: { id: true, sku: true, name: true, unit: true, isActive: true, type: true }
            }
        },
        orderBy: { product: { name: 'asc' } }
    });
}

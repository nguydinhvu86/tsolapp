'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// --- REPORTS ---

export async function getStockValuation(warehouseId?: string, productId?: string, groupId?: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");
    const products = await (prisma as any).product.findMany({
        where: {
            type: 'PRODUCT',
            isActive: true,
            ...(productId ? { id: productId } : {}),
            ...(groupId ? { groupId } : {})
        },
        include: {
            inventories: warehouseId ? { where: { warehouseId } } : { include: { warehouse: true } },
            group: true
        },
        orderBy: { name: 'asc' }
    });

    return products.map((p: any) => {
        const totalQty = p.inventories.reduce((acc: any, inv: any) => acc + inv.quantity, 0);
        return {
            id: p.id,
            sku: p.sku,
            name: p.name,
            unit: p.unit,
            price: p.importPrice || 0, // Valuation usually based on Cost/Import Price
            qty: totalQty,
            totalValue: totalQty * (p.importPrice || 0),
            minStockLevel: p.minStockLevel,
            groupName: p.group?.name || undefined
        };
    }).filter((p: any) => true); // Report should show all active products to match the warehouse product list
}

export async function getStockLedger(productId: string, warehouseId?: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

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

export async function getTransactionReport(
    type?: string,
    startDate?: string,
    endDate?: string,
    warehouseId?: string,
    productId?: string,
    groupId?: string
) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    let whereClause: any = {
        status: 'COMPLETED'
    };

    if (type && type !== 'ALL') {
        whereClause.type = type;
    }

    if (startDate || endDate) {
        whereClause.date = {};
        if (startDate) {
            whereClause.date.gte = new Date(startDate);
        }
        if (endDate) {
            // Set to end of the day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.date.lte = end;
        }
    }

    if (warehouseId) {
        whereClause.OR = [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId }
        ];
    }

    const transactions = await (prisma as any).inventoryTransaction.findMany({
        where: {
            ...whereClause,
            ...(productId || groupId ? {
                items: {
                    some: {
                        ...(productId ? { productId } : {}),
                        ...(groupId ? { product: { groupId } } : {})
                    }
                }
            } : {})
        },
        include: {
            fromWarehouse: true,
            toWarehouse: true,
            creator: { select: { name: true } },
            items: {
                include: { product: { include: { group: true } } }
            }
        },
        orderBy: { date: 'desc' }
    });

    // If a specific product/group is filtered, we might only want to show those items in the UI,
    // but the query returns the whole transaction. We can leave it as is, or filter items in JS.
    // For now, return the full transaction so they see the whole context of the related slip.

    return transactions;
}

export async function getInOutBalanceReport(
    startDate?: string,
    endDate?: string,
    warehouseId?: string,
    productId?: string,
    groupId?: string
) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

    // 1. Get all products
    const products = await (prisma as any).product.findMany({
        where: {
            type: 'PRODUCT',
            isActive: true,
            ...(productId ? { id: productId } : {}),
            ...(groupId ? { groupId } : {})
        },
        include: { group: true },
        orderBy: { name: 'asc' }
    });

    // We need to calculate for each product:
    // Opening Balance (Tồn đầu kỳ) = Sum of (IN - OUT + ADJ) before startDate
    // Total IN (Nhập trong kỳ) = Sum of IN between startDate and endDate
    // Total OUT (Xuất trong kỳ) = Sum of OUT between startDate and endDate
    // Closing Balance (Tồn cuối kỳ) = Opening + IN - OUT

    const start = startDate ? new Date(startDate) : new Date(0); // If no start date, from beginning of time

    let end = new Date(); // If no end date, up to now
    if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
    }

    // Combine all completed items
    const allItems = await prisma.inventoryTransactionItem.findMany({
        where: {
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
            transaction: { select: { type: true, date: true, fromWarehouseId: true, toWarehouseId: true } }
        }
    });

    const report = products.map((p: any) => {
        let openingBalance = 0;
        let totalIn = 0;
        let totalOut = 0;

        const productItems = allItems.filter(item => item.productId === p.id);

        for (const item of productItems) {
            const t = item.transaction;
            let change = 0;

            // Determine if IN or OUT relative to the warehouse(s) we are looking at
            if (t.type === 'IN') {
                if (!warehouseId || t.toWarehouseId === warehouseId) change = item.quantity;
            } else if (t.type === 'OUT') {
                if (!warehouseId || t.fromWarehouseId === warehouseId) change = -item.quantity;
            } else if (t.type === 'TRANSFER') {
                if (warehouseId) {
                    if (t.toWarehouseId === warehouseId) change = item.quantity;
                    else if (t.fromWarehouseId === warehouseId) change = -item.quantity;
                }
            } else if (t.type === 'ADJUSTMENT') {
                if (!warehouseId || t.fromWarehouseId === warehouseId) change = item.quantity;
            }

            // Route the change to Opening or Period totals based on date
            if (t.date < start) {
                openingBalance += change;
            } else if (t.date >= start && t.date <= end) {
                if (change > 0) totalIn += change;
                else if (change < 0) totalOut += Math.abs(change);
            }
        }

        return {
            productId: p.id,
            sku: p.sku,
            name: p.name,
            groupName: p.group?.name || undefined,
            unit: p.unit,
            openingBalance,
            totalIn,
            totalOut,
            closingBalance: openingBalance + totalIn - totalOut
        };
    });

    return report;
}


// --- ADJUSTMENTS ---

// Fetches current state of warehouse to help user enter actuals
export async function getWarehouseStockForAdjustment(warehouseId: string) {
    const session = await getServerSession(authOptions);
    if (!session) throw new Error("Unauthorized");

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

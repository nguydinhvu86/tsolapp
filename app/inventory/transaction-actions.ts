'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';

export async function getTransactions(filters?: { type?: string; status?: string; warehouseId?: string }) {
    let where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.status) where.status = filters.status;
    if (filters?.warehouseId) {
        where.OR = [
            { fromWarehouseId: filters.warehouseId },
            { toWarehouseId: filters.warehouseId }
        ];
    }

    return prisma.inventoryTransaction.findMany({
        where,
        include: {
            fromWarehouse: true,
            toWarehouse: true,
            creator: { select: { name: true, email: true } },
            items: {
                include: { product: true }
            }
        },
        orderBy: { date: 'desc' }
    });
}

export async function getTransactionById(id: string) {
    return prisma.inventoryTransaction.findUnique({
        where: { id },
        include: {
            fromWarehouse: true,
            toWarehouse: true,
            creator: { select: { name: true, email: true } },
            items: {
                include: { product: true }
            }
        }
    });
}

export async function createTransaction(data: {
    code: string;
    type: string;
    notes?: string;
    date?: Date;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    creatorId: string;
    items: { productId: string; quantity: number; price?: number }[];
}) {
    const user = await verifyActionPermission('INVENTORY_TRANSACTIONS_CREATE');
    const uId = user ? (user as any).id : data.creatorId;

    const existing = await prisma.inventoryTransaction.findUnique({ where: { code: data.code } });
    if (existing) {
        throw new Error(`Mã giao dịch (Phiếu) ${data.code} đã tồn tại!`);
    }

    // Validation based on type
    if (data.type === 'OUT' && !data.fromWarehouseId) throw new Error("Xuất kho cần chọn Kho xuất.");
    if (data.type === 'IN' && !data.toWarehouseId) throw new Error("Nhập kho cần chọn Kho nhập.");
    if (data.type === 'TRANSFER' && (!data.fromWarehouseId || !data.toWarehouseId)) throw new Error("Chuyển kho cần chọn Kho xuất và Kho nhập.");
    if (data.items.length === 0) throw new Error("Phải có ít nhất 1 sản phẩm.");

    const transaction = await prisma.inventoryTransaction.create({
        data: {
            code: data.code,
            type: data.type,
            notes: data.notes,
            date: data.date || new Date(),
            fromWarehouseId: data.fromWarehouseId,
            toWarehouseId: data.toWarehouseId,
            creatorId: uId,
            status: 'DRAFT',
            items: {
                create: data.items.map(item => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price || 0
                }))
            }
        }
    });

    revalidatePath('/inventory/transactions');
    return transaction;
}

export async function updateTransactionStatus(id: string, status: string, userId: string) {
    const transaction = await prisma.inventoryTransaction.findUnique({
        where: { id },
        include: { items: true }
    });

    if (!transaction) throw new Error("Không tìm thấy giao dịch.");
    await verifyActionOwnership('INVENTORY_TX', 'EDIT', transaction.creatorId);

    if (transaction.status === 'COMPLETED') throw new Error("Giao dịch đã hoàn tất, không thể thay đổi trạng thái.");

    if (status === 'COMPLETED') {
        // Execute inventory updates in a Prisma transaction
        await prisma.$transaction(async (tx) => {
            for (const item of transaction.items) {
                // OUT / TRANSFER: Decrease fromWarehouseId
                if ((transaction.type === 'OUT' || transaction.type === 'TRANSFER') && transaction.fromWarehouseId) {
                    const invOut = await tx.inventory.findUnique({
                        where: { productId_warehouseId: { productId: item.productId, warehouseId: transaction.fromWarehouseId } }
                    });

                    if (!invOut || invOut.quantity < item.quantity) {
                        throw new Error(`Không đủ hàng trong kho xuất cho sản phẩm ID: ${item.productId}`);
                    }

                    await tx.inventory.update({
                        where: { id: invOut.id },
                        data: { quantity: { decrement: item.quantity } }
                    });
                }

                // IN / TRANSFER: Increase toWarehouseId
                if ((transaction.type === 'IN' || transaction.type === 'TRANSFER') && transaction.toWarehouseId) {
                    const invIn = await tx.inventory.findUnique({
                        where: { productId_warehouseId: { productId: item.productId, warehouseId: transaction.toWarehouseId } }
                    });

                    if (invIn) {
                        await tx.inventory.update({
                            where: { id: invIn.id },
                            data: { quantity: { increment: item.quantity } }
                        });
                    } else {
                        await tx.inventory.create({
                            data: {
                                productId: item.productId,
                                warehouseId: transaction.toWarehouseId,
                                quantity: item.quantity
                            }
                        });
                    }
                }

                // ADJUSTMENT
                if (transaction.type === 'ADJUSTMENT' && transaction.fromWarehouseId) {
                    const invOut = await tx.inventory.findUnique({
                        where: { productId_warehouseId: { productId: item.productId, warehouseId: transaction.fromWarehouseId } }
                    });

                    if (invOut) {
                        await tx.inventory.update({
                            where: { id: invOut.id },
                            data: { quantity: { increment: item.quantity } } // quantity có thể âm hoặc dương
                        });
                    } else {
                        await tx.inventory.create({
                            data: {
                                productId: item.productId,
                                warehouseId: transaction.fromWarehouseId,
                                quantity: item.quantity
                            }
                        });
                    }
                }
            }

            // Update status
            await tx.inventoryTransaction.update({
                where: { id },
                data: { status }
            });
        });
    } else {
        // Just update status if not completed
        await prisma.inventoryTransaction.update({
            where: { id },
            data: { status }
        });
    }

    revalidatePath('/inventory/transactions');
    revalidatePath(`/inventory/transactions/${id}`);
    revalidatePath('/inventory/products');
}

export async function deleteTransaction(id: string) {
    const transaction = await prisma.inventoryTransaction.findUnique({ where: { id } });
    if (transaction?.status === 'COMPLETED') {
        throw new Error("Không thể xóa giao dịch đã hoàn tất.");
    }
    await verifyActionOwnership('INVENTORY_TX', 'DELETE', transaction?.creatorId || '');
    
    await prisma.inventoryTransaction.delete({ where: { id } });
    revalidatePath('/inventory/transactions');
}

export async function processTransaction(id: string, userId: string) {
    return updateTransactionStatus(id, 'COMPLETED', userId);
}

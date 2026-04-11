'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';

// --- WAREHOUSE ACTIONS ---

export async function getWarehouses() {
    return prisma.warehouse.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function createWarehouse(data: { name: string, location?: string, isDefault?: boolean }) {
    await verifyActionPermission('INVENTORY_MANAGE');
    if (data.isDefault) {
        // If this is set to default, unset others
        await prisma.warehouse.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        });
    }

    const warehouse = await prisma.warehouse.create({ data });
    revalidatePath('/inventory/warehouses');
    return warehouse;
}

export async function updateWarehouse(id: string, data: { name?: string, location?: string, isDefault?: boolean }) {
    await verifyActionPermission('INVENTORY_MANAGE');
    if (data.isDefault) {
        await prisma.warehouse.updateMany({
            where: { isDefault: true, id: { not: id } },
            data: { isDefault: false }
        });
    }

    const warehouse = await prisma.warehouse.update({
        where: { id },
        data
    });
    revalidatePath('/inventory/warehouses');
    return warehouse;
}

// --- PRODUCT GROUP ACTIONS ---

export async function getProductGroups() {
    return prisma.productGroup.findMany({
        orderBy: { name: 'asc' }
    });
}

export async function createProductGroup(data: { name: string; description?: string }) {
    await verifyActionPermission('PRODUCTS_CREATE');
    const existing = await prisma.productGroup.findUnique({ where: { name: data.name } });
    if (existing) {
        throw new Error(`Nhóm sản phẩm "${data.name}" đã tồn tại!`);
    }

    const group = await prisma.productGroup.create({ data });
    revalidatePath('/inventory/products');
    revalidatePath('/inventory/reports');
    return group;
}

export async function updateProductGroup(id: string, data: { name?: string; description?: string }) {
    await verifyActionPermission('PRODUCTS_EDIT');
    if (data.name) {
        const existing = await prisma.productGroup.findUnique({ where: { name: data.name } });
        if (existing && existing.id !== id) {
            throw new Error(`Nhóm sản phẩm "${data.name}" đã tồn tại!`);
        }
    }

    const group = await prisma.productGroup.update({
        where: { id },
        data
    });
    revalidatePath('/inventory/products');
    revalidatePath('/inventory/reports');
    return group;
}

export async function deleteProductGroup(id: string) {
    await verifyActionPermission('PRODUCTS_DELETE');
    // Check if there are products in this group before deleting
    const productCount = await prisma.product.count({ where: { groupId: id } });
    if (productCount > 0) {
        throw new Error(`Không thể xóa! Có ${productCount} sản phẩm đang thuộc nhóm này.`);
    }

    await prisma.productGroup.delete({ where: { id } });
    revalidatePath('/inventory/products');
    revalidatePath('/inventory/reports');
}

// --- PRODUCT ACTIONS ---

export async function getProducts(type?: 'PRODUCT' | 'SERVICE') {
    return prisma.product.findMany({
        where: type ? { type } : undefined,
        include: {
            inventories: {
                include: { warehouse: true }
            },
            group: true
        },
        orderBy: { name: 'asc' }
    });
}

export async function createProduct(data: {
    sku: string;
    name: string;
    type: string;
    unit?: string;
    taxRate?: number;
    importPrice?: number;
    salePrice?: number;
    description?: string;
    notes?: string;
    minStockLevel?: number;
    isActive?: boolean;
    groupId?: string | null;
}) {
    await verifyActionPermission('PRODUCTS_CREATE');
    const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
        throw new Error(`Mã sản phẩm (SKU) ${data.sku} đã tồn tại!`);
    }

    const product = await prisma.product.create({ data });
    revalidatePath('/inventory/products');
    return product;
}

export async function updateProduct(id: string, data: Partial<{
    sku: string;
    name: string;
    type: string;
    unit: string;
    taxRate: number;
    importPrice: number;
    salePrice: number;
    description: string;
    notes: string;
    minStockLevel: number;
    isActive: boolean;
    groupId: string | null;
}>) {
    await verifyActionPermission('PRODUCTS_EDIT');
    if (data.sku) {
        const existing = await prisma.product.findUnique({ where: { sku: data.sku } });
        if (existing && existing.id !== id) {
            throw new Error(`Mã sản phẩm (SKU) ${data.sku} đã tồn tại!`);
        }
    }

    const product = await prisma.product.update({
        where: { id },
        data
    });
    revalidatePath('/inventory/products');
    return product;
}

export async function deleteProduct(id: string) {
    await verifyActionPermission('PRODUCTS_DELETE');
    await prisma.product.delete({ where: { id } });
    revalidatePath('/inventory/products');
}

// --- INVENTORY QUERIES ---

export async function getInventories(warehouseId?: string) {
    return prisma.inventory.findMany({
        where: warehouseId ? { warehouseId } : undefined,
        include: {
            product: true,
            warehouse: true
        }
    });
}

export async function getLowStockProducts() {
    // Find products where total inventory quantity <= minStockLevel
    const products = await prisma.product.findMany({
        where: { type: 'PRODUCT', isActive: true },
        include: {
            inventories: true
        }
    });

    return products.filter(p => {
        const totalStock = p.inventories.reduce((acc, inv) => acc + inv.quantity, 0);
        return totalStock <= p.minStockLevel;
    }).map(p => ({
        ...p,
        totalStock: p.inventories.reduce((acc, inv) => acc + inv.quantity, 0)
    }));
}

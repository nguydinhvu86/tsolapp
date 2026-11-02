'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyActionPermission } from '@/lib/permissions';

export async function getUnits() {
    try {
        const [units, productGroups] = await Promise.all([
            prisma.unit.findMany({
                orderBy: [
                    { isDefault: 'desc' },
                    { name: 'asc' }
                ]
            }),
            prisma.product.groupBy({
                by: ['unit'],
                _count: { id: true }
            })
        ]);

        const countMap = new Map<string, number>();
        productGroups.forEach((g: any) => {
            if (g.unit) {
                countMap.set(g.unit.trim().toLowerCase(), g._count.id);
            }
        });

        return units.map(u => ({
            ...u,
            productCount: countMap.get(u.name.trim().toLowerCase()) || 0
        }));
    } catch (error) {
        console.error('Lỗi lấy danh sách Đơn Vị Tính:', error);
        return [];
    }
}

export async function createUnit(data: { name: string; description?: string; isDefault?: boolean }) {
    await verifyActionPermission('PRODUCTS_CREATE');
    const cleanName = data.name.trim();
    if (!cleanName) {
        throw new Error('Tên đơn vị tính không được để trống!');
    }

    const existing = await prisma.unit.findUnique({
        where: { name: cleanName }
    });
    if (existing) {
        throw new Error(`Đơn vị tính "${cleanName}" đã tồn tại trong hệ thống!`);
    }

    if (data.isDefault) {
        await prisma.unit.updateMany({
            where: { isDefault: true },
            data: { isDefault: false }
        });
    }

    const unit = await prisma.unit.create({
        data: {
            name: cleanName,
            description: data.description?.trim() || null,
            isDefault: !!data.isDefault
        }
    });

    revalidatePath('/inventory/units');
    revalidatePath('/inventory/products');
    return unit;
}

export async function updateUnit(
    id: string, 
    data: { name: string; description?: string; isDefault?: boolean },
    syncProducts = true
) {
    await verifyActionPermission('PRODUCTS_EDIT');
    const cleanName = data.name.trim();
    if (!cleanName) {
        throw new Error('Tên đơn vị tính không được để trống!');
    }

    const existing = await prisma.unit.findUnique({ where: { id } });
    if (!existing) {
        throw new Error('Không tìm thấy đơn vị tính này!');
    }

    // Kiểm tra trùng tên với đơn vị tính khác
    const duplicate = await prisma.unit.findUnique({ where: { name: cleanName } });
    if (duplicate && duplicate.id !== id) {
        throw new Error(`Đơn vị tính "${cleanName}" đã trùng với một đơn vị tính khác!`);
    }

    if (data.isDefault) {
        await prisma.unit.updateMany({
            where: { id: { not: id }, isDefault: true },
            data: { isDefault: false }
        });
    }

    const updated = await prisma.unit.update({
        where: { id },
        data: {
            name: cleanName,
            description: data.description?.trim() || null,
            isDefault: !!data.isDefault
        }
    });

    // Nếu tên đơn vị tính thay đổi và bật đồng bộ sản phẩm
    if (syncProducts && existing.name !== cleanName) {
        await prisma.product.updateMany({
            where: { unit: existing.name },
            data: { unit: cleanName }
        });
    }

    revalidatePath('/inventory/units');
    revalidatePath('/inventory/products');
    return updated;
}

export async function deleteUnit(id: string) {
    await verifyActionPermission('PRODUCTS_DELETE');
    const existing = await prisma.unit.findUnique({ where: { id } });
    if (!existing) {
        throw new Error('Không tìm thấy đơn vị tính này!');
    }

    const productCount = await prisma.product.count({
        where: { unit: existing.name }
    });
    if (productCount > 0) {
        throw new Error(`Không thể xóa đơn vị tính "${existing.name}" vì đang có ${productCount} sản phẩm sử dụng! Hãy sửa tên hoặc đổi sản phẩm sang đơn vị tính khác trước.`);
    }

    await prisma.unit.delete({ where: { id } });

    revalidatePath('/inventory/units');
    revalidatePath('/inventory/products');
    return { success: true };
}

export async function ensureUnitExists(unitName?: string | null) {
    if (!unitName) return null;
    const clean = unitName.trim();
    if (!clean) return null;

    try {
        const unit = await prisma.unit.upsert({
            where: { name: clean },
            update: {},
            create: {
                name: clean,
                description: 'Tự động tạo khi người dùng nhập đơn vị tính mới'
            }
        });
        revalidatePath('/inventory/units');
        return unit;
    } catch (e) {
        return null;
    }
}

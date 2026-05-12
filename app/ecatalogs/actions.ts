'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';
import { z } from 'zod';

export async function logEcatalogActivity(ecatalogId: string, userId: string, action: string, details?: string) {
    try {
        await prisma.ecatalogActivityLog.create({
            data: { ecatalogId, userId, action, details }
        });
    } catch (e) {
        console.error("Failed to log activity:", e);
    }
}

export async function getEcatalogs(filterParams: any = {}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return [];

    let whereClause: any = {};
    if (filterParams.search) {
        whereClause.OR = [
            { code: { contains: filterParams.search } },
            { name: { contains: filterParams.search } }
        ];
    }
    if (filterParams.isPublic !== undefined) {
        whereClause.isPublic = filterParams.isPublic === 'true';
    }

    return await prisma.ecatalog.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
            creator: { select: { name: true, email: true, avatar: true } },
            _count: {
                select: { items: true }
            }
        }
    });
}

export async function submitEcatalog(creatorId: string, formData: any) {
    try {
        const user = await verifyActionPermission('SALES_ESTIMATES_CREATE');
        const actualCreatorId = user ? (user as any).id : creatorId;

        if (!formData.name) {
            return { success: false, error: "Thiếu tên Catalog." };
        }

        const code = formData.code || `CAT-${Date.now().toString().slice(-6)}`;

        const ecatalog = await prisma.ecatalog.create({
            data: {
                code: code,
                name: formData.name,
                description: formData.description || null,
                coverImage: formData.coverImage || null,
                isPublic: formData.isPublic !== undefined ? formData.isPublic : true,
                showDealerPrice: formData.showDealerPrice !== undefined ? formData.showDealerPrice : false,
                creatorId: actualCreatorId,
                items: {
                    create: (formData.items || []).map((item: any, index: number) => ({
                        productId: item.productId || null,
                        customSku: item.customSku || null,
                        customName: item.customName || null,
                        customDesc: item.customDesc || null,
                        customPrice: item.customPrice || null,
                        customRetailPrice: item.customRetailPrice || null,
                        customDealerPrice: item.customDealerPrice || null,
                        customOrigin: item.customOrigin || null,
                        customNote: item.customNote || null,
                        imageUrl: item.imageUrl || null,
                        displayOrder: index
                    }))
                }
            }
        });

        await logEcatalogActivity(ecatalog.id, actualCreatorId, 'CREATED', 'Tạo Catalog mới');

        revalidatePath('/ecatalogs');
        return { success: true, data: ecatalog };
    } catch (error: any) {
        console.error("Lỗi khi tạo Catalog:", error);
        return { success: false, error: error.message };
    }
}

export async function getEcatalogDetail(id: string) {
    return await prisma.ecatalog.findUnique({
        where: { id },
        include: {
            creator: { select: { name: true, avatar: true, email: true } },
            items: {
                orderBy: { displayOrder: 'asc' },
                include: { product: true }
            },
            activityLogs: {
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { name: true, avatar: true } } }
            }
        }
    });
}

export async function updateEcatalog(id: string, formData: any, updaterId: string) {
    try {
        const oldEcatalog = await prisma.ecatalog.findUnique({ where: { id } });
        if (!oldEcatalog) return { success: false, error: "Catalog không tồn tại." };

        await verifyActionOwnership('SALES_ESTIMATES', 'EDIT', oldEcatalog.creatorId);

        // Delete old items
        await prisma.ecatalogItem.deleteMany({ where: { ecatalogId: id } });

        const ecatalog = await prisma.ecatalog.update({
            where: { id },
            data: {
                name: formData.name,
                description: formData.description || null,
                coverImage: formData.coverImage || null,
                isPublic: formData.isPublic !== undefined ? formData.isPublic : true,
                showDealerPrice: formData.showDealerPrice !== undefined ? formData.showDealerPrice : false,
                items: {
                    create: formData.items.map((item: any, index: number) => ({
                        productId: item.productId || null,
                        customSku: item.customSku || null,
                        customName: item.customName || null,
                        customDesc: item.customDesc || null,
                        customPrice: item.customPrice || null,
                        customRetailPrice: item.customRetailPrice || null,
                        customDealerPrice: item.customDealerPrice || null,
                        customOrigin: item.customOrigin || null,
                        customNote: item.customNote || null,
                        imageUrl: item.imageUrl || null,
                        displayOrder: index
                    }))
                }
            },
            include: {
                creator: { select: { name: true, avatar: true, email: true } },
                items: {
                    orderBy: { displayOrder: 'asc' },
                    include: { product: true }
                },
                activityLogs: {
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { name: true, avatar: true } } }
                }
            }
        });

        await logEcatalogActivity(id, updaterId, 'UPDATED', 'Cập nhật Catalog');

        revalidatePath('/ecatalogs');
        revalidatePath(`/ecatalogs/${id}`);
        return { success: true, data: ecatalog };
    } catch (error: any) {
        console.error("Lỗi khi cập nhật Catalog:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteEcatalog(id: string, deleterId: string) {
    try {
        const oldEcatalog = await prisma.ecatalog.findUnique({ where: { id } });
        if (!oldEcatalog) return { success: false, error: "Không tìm thấy Catalog." };

        await verifyActionOwnership('SALES_ESTIMATES', 'DELETE', oldEcatalog.creatorId);

        await prisma.ecatalog.delete({ where: { id } });

        revalidatePath('/ecatalogs');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

import fs from 'fs';
import path from 'path';

export async function listServerImages() {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: 'Unauthorized' };

        const uploadDir = path.join(process.cwd(), 'uploads_data', 'documents');
        if (!fs.existsSync(uploadDir)) return { success: true, data: [] };

        const files = fs.readdirSync(uploadDir);
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
        
        const images = files
            .filter(file => imageExtensions.includes(path.extname(file).toLowerCase()))
            .map(file => {
                const stat = fs.statSync(path.join(uploadDir, file));
                return {
                    url: `/api/files/documents/${file}`,
                    name: file,
                    createdAt: stat.mtime
                };
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        return { success: true, data: images };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

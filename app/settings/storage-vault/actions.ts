'use server'

import { prisma } from '@/lib/prisma';

export interface VaultFilterParams {
    tab?: 'vault' | 'audit';
    search?: string;
    entityType?: string;
    fileType?: string;
    action?: string;
    page?: number;
    pageSize?: number;
}

export async function fetchVaultAttachments(params: VaultFilterParams) {
    try {
        const page = Math.max(1, params.page || 1);
        const pageSize = Math.max(1, Math.min(100, params.pageSize || 25));
        const skip = (page - 1) * pageSize;

        const where: any = {};

        if (params.search && params.search.trim()) {
            const s = params.search.trim();
            where.OR = [
                { fileName: { contains: s } },
                { entityId: { contains: s } },
                { entityType: { contains: s } },
                { notes: { contains: s } },
                { uploadedBy: { name: { contains: s } } }
            ];
        }

        if (params.entityType && params.entityType !== 'ALL') {
            where.entityType = params.entityType;
        }

        if (params.fileType && params.fileType !== 'ALL') {
            where.fileType = params.fileType;
        }

        const [total, attachments, sizeAggregate, totalAll] = await Promise.all([
            prisma.systemAttachment.count({ where }),
            prisma.systemAttachment.findMany({
                where,
                include: {
                    uploadedBy: {
                        select: { id: true, name: true, email: true, avatar: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize
            }),
            prisma.systemAttachment.aggregate({
                _sum: { fileSize: true },
                where
            }),
            prisma.systemAttachment.count()
        ]);

        return {
            success: true,
            total,
            totalAll,
            totalSize: sizeAggregate._sum.fileSize || 0,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
            attachments
        };
    } catch (err: any) {
        console.error('Error fetching vault attachments:', err);
        return { success: false, error: err.message, attachments: [], total: 0, totalPages: 1 };
    }
}

export async function fetchVaultAuditLogs(params: VaultFilterParams) {
    try {
        const page = Math.max(1, params.page || 1);
        const pageSize = Math.max(1, Math.min(100, params.pageSize || 25));
        const skip = (page - 1) * pageSize;

        const where: any = {};

        if (params.search && params.search.trim()) {
            const s = params.search.trim();
            where.OR = [
                { action: { contains: s } },
                { entityType: { contains: s } },
                { entityId: { contains: s } },
                { details: { contains: s } },
                { user: { name: { contains: s } } }
            ];
        }

        if (params.entityType && params.entityType !== 'ALL') {
            where.entityType = params.entityType;
        }

        if (params.action && params.action !== 'ALL') {
            where.action = params.action;
        }

        const [total, logs, totalAll] = await Promise.all([
            prisma.unifiedActivityLog.count({ where }),
            prisma.unifiedActivityLog.findMany({
                where,
                include: {
                    user: {
                        select: { id: true, name: true, email: true, avatar: true }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize
            }),
            prisma.unifiedActivityLog.count()
        ]);

        return {
            success: true,
            total,
            totalAll,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize) || 1,
            logs
        };
    } catch (err: any) {
        console.error('Error fetching vault audit logs:', err);
        return { success: false, error: err.message, logs: [], total: 0, totalPages: 1 };
    }
}

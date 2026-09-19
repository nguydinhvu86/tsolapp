'use server'

import { prisma } from '@/lib/prisma';

export async function fetchVaultAndAuditData() {
    try {
        const [attachments, logs] = await Promise.all([
            prisma.systemAttachment.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100
            }),
            prisma.unifiedActivityLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 100
            })
        ]);

        return { success: true, attachments, logs };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

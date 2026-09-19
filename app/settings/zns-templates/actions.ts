'use server'

import { prisma } from '@/lib/prisma';
import { seedZnsTemplates, sendZnsNotification } from '@/lib/omnichannel-crm';

export async function fetchZnsData() {
    try {
        await seedZnsTemplates();

        const [templates, logs] = await Promise.all([
            prisma.znsTemplate.findMany({
                orderBy: { createdAt: 'asc' }
            }),
            prisma.znsLog.findMany({
                include: {
                    template: { select: { templateName: true } }
                },
                orderBy: { sentAt: 'desc' },
                take: 100
            })
        ]);

        return { success: true, templates, logs };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

export async function sendTestZns(input: {
    recipientPhone: string;
    recipientName?: string;
    templateId: string;
    dataPayload: Record<string, any>;
}) {
    try {
        const result = await sendZnsNotification(input);
        return { success: true, result };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}

'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import { verifyActionPermission } from '@/lib/permissions';

export async function getInvoiceSettings() {
    await verifyActionPermission('SETTINGS_VIEW_ALL');

    const settings = await prisma.systemSetting.findMany({
        where: { key: { startsWith: 'INVOICE_SYNC_' } }
    });

    const config: any = {};
    settings.forEach((s: any) => {
        // Redact password for client-side rendering
        if (s.key === 'INVOICE_SYNC_PASSWORD') {
            config[s.key] = s.value ? '********' : '';
        } else {
            config[s.key] = s.value;
        }
    });
    
    return config;
}

export async function saveInvoiceSettings(data: any) {
    await verifyActionPermission('SETTINGS_EDIT_ALL');

    const keys = ['INVOICE_SYNC_EMAIL', 'INVOICE_SYNC_PASSWORD', 'INVOICE_SYNC_HOST', 'INVOICE_SYNC_PORT'];

    for (const key of keys) {
        if (data[key] !== undefined) {
            // Do not override password if it wasn't edited (i.e. remains '********')
            if (key === 'INVOICE_SYNC_PASSWORD' && data[key] === '********') {
                continue;
            }
            await prisma.systemSetting.upsert({
                where: { key },
                update: { value: data[key].toString() },
                create: { key, value: data[key].toString(), description: `IMAP settings for E-Invoices` }
            });
        }
    }

    revalidatePath('/accounting/settings');
    revalidatePath('/accounting/invoices');
    return { success: true };
}

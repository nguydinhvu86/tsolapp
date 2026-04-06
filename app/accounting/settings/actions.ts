'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';

export async function getInvoiceSettings() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const settings = await prisma.systemSetting.findMany({
        where: { key: { startsWith: 'INVOICE_SYNC_' } }
    });

    const config: any = {};
    settings.forEach((s: any) => config[s.key] = s.value);
    
    return config;
}

export async function saveInvoiceSettings(data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error("Unauthorized");

    const keys = ['INVOICE_SYNC_EMAIL', 'INVOICE_SYNC_PASSWORD', 'INVOICE_SYNC_HOST', 'INVOICE_SYNC_PORT'];

    for (const key of keys) {
        if (data[key] !== undefined) {
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

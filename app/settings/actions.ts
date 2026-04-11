'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import { verifyActionPermission } from '@/lib/permissions';

// Các key mặc định
const SETTING_KEYS = [
    'COMPANY_NAME', 'COMPANY_DISPLAY_NAME', 'COMPANY_FULL_NAME',
    'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL',
    'COMPANY_ADDRESS', 'COMPANY_TAX',
    'ESTIMATE_CODE_FORMAT', 'INVOICE_CODE_FORMAT',
    'ESTIMATE_START_SEQ', 'INVOICE_START_SEQ',
    'PUSHER_APP_ID', 'PUSHER_KEY', 'PUSHER_SECRET', 'PUSHER_CLUSTER',
    'WATERMARK_ENABLED', 'WATERMARK_TYPE', 'WATERMARK_TEXT', 'WATERMARK_IMAGE_URL',
    'WATERMARK_OPACITY', 'WATERMARK_ROTATION', 'WATERMARK_COLOR', 'WATERMARK_SIZE',
    'WATERMARK_DOCUMENTS',
    'BANK_INFO_ENABLED', 'BANK_INFO_CONTENT',
    'PBX_URL', 'PBX_KEY', 'PBX_DOMAIN'
];

export async function getSystemSettings() {
    await verifyActionPermission('SETTINGS_VIEW_ALL');

    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: SETTING_KEYS } }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    return settingsMap;
}

export async function updateSystemSettings(data: Record<string, string>) {
    await verifyActionPermission('SETTINGS_EDIT');

    // Upsert từng key
    for (const key of Object.keys(data)) {
        if (!SETTING_KEYS.includes(key)) continue;

        await prisma.systemSetting.upsert({
            where: { key },
            update: { value: data[key] },
            create: { key, value: data[key] }
        });
    }

    revalidatePath('/', 'layout');

    return true;
}

'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';

// Các key mặc định
const SETTING_KEYS = ['COMPANY_NAME', 'COMPANY_DISPLAY_NAME', 'COMPANY_FULL_NAME', 'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_ADDRESS', 'COMPANY_TAX'];

export async function getSystemSettings() {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
    }

    const settings = await prisma.systemSetting.findMany({
        where: { key: { in: SETTING_KEYS } }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);
    return settingsMap;
}

export async function updateSystemSettings(data: Record<string, string>) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        throw new Error('Unauthorized');
    }

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

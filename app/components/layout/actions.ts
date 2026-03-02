'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';

export async function getLayoutSettings() {
    noStore();
    try {
        const settings = await prisma.systemSetting.findMany({
            where: { key: { in: ['COMPANY_DISPLAY_NAME', 'COMPANY_NAME', 'COMPANY_LOGO'] } }
        });

        const settingsMap: Record<string, string> = {};
        settings.forEach(s => settingsMap[s.key] = s.value);

        return {
            name: settingsMap['COMPANY_DISPLAY_NAME'] || settingsMap['COMPANY_NAME'] || 'ContractMgr',
            logo: settingsMap['COMPANY_LOGO'] || null
        };
    } catch (error) {
        return { name: 'ContractMgr', logo: null };
    }
}

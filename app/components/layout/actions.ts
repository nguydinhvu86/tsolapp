'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore } from 'next/cache';

export async function getBrandName() {
    noStore();
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'COMPANY_NAME' }
        });
        return setting?.value || 'ContractMgr';
    } catch (error) {
        return 'ContractMgr';
    }
}

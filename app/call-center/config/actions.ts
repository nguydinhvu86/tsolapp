'use server';

import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authOptions';
import { verifyActionPermission } from '@/lib/permissions';

export async function getPbxConfig() {
    await verifyActionPermission('SETTINGS_VIEW_ALL');
    const config = await (prisma as any).pbxConfig.findFirst();
    return config;
}

export async function savePbxConfig(data: any) {
    await verifyActionPermission('SETTINGS_EDIT_ALL');

    const existing = await (prisma as any).pbxConfig.findFirst();
    if (existing) {
        return await (prisma as any).pbxConfig.update({
            where: { id: existing.id },
            data: {
                pbxEndpoint: data.pbxEndpoint,
                pbxReportEndpoint: data.pbxReportEndpoint,
                apiKey: data.apiKey,
                domain: data.domain,
                cacheDays: Number(data.cacheDays),
                directional: data.directional
            }
        });
    } else {
        return await (prisma as any).pbxConfig.create({
            data: {
                pbxEndpoint: data.pbxEndpoint,
                pbxReportEndpoint: data.pbxReportEndpoint,
                apiKey: data.apiKey,
                domain: data.domain,
                cacheDays: Number(data.cacheDays),
                directional: data.directional
            }
        });
    }
}

'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function getPbxConfig() {
    const config = await (prisma as any).pbxConfig.findFirst();
    return config;
}

export async function savePbxConfig(data: any) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error('Unauthorized');

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

'use server'

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

interface SignatureMetadata {
    location?: string;
    userAgent?: string;
}

export async function saveDocumentSignature(
    entityType: 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE', 
    entityId: string, 
    role: 'CUSTOMER' | 'COMPANY', 
    signatureDataUrl: string, 
    companySignerId?: string,
    meta?: SignatureMetadata
) {
    if (!entityId || !signatureDataUrl) throw new Error('Missing parameters');

    const headersList = headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'Unknown IP');
    const rawUserAgent = headersList.get('user-agent') || meta?.userAgent || 'Unknown Device';

    const updateData: any = {};
    if (role === 'CUSTOMER') {
        updateData.customerSignature = signatureDataUrl;
        updateData.customerSignedAt = new Date();
        updateData.customerSignIP = ip;
        updateData.customerSignDevice = rawUserAgent.substring(0, 190); // Prevent overflow
        if (meta?.location) {
            updateData.customerSignLocation = meta.location;
        }
    } else if (role === 'COMPANY') {
        updateData.companySignature = signatureDataUrl;
        updateData.companySignedAt = new Date();
        if (companySignerId) {
            updateData.companySignerId = companySignerId;
        }
    } else {
         throw new Error('Invalid role');
    }

    try {
        switch (entityType) {
            case 'SALES_ESTIMATE':
                await prisma.salesEstimate.update({ where: { id: entityId }, data: updateData });
                break;
            case 'SALES_ORDER':
                await prisma.salesOrder.update({ where: { id: entityId }, data: updateData });
                break;
            case 'SALES_INVOICE':
                await prisma.salesInvoice.update({ where: { id: entityId }, data: updateData });
                break;
            default:
                throw new Error('Unsupported entity type');
        }
        return { success: true };
    } catch (error) {
        console.error('Save signature error:', error);
        return { success: false, error: 'Failed to save signature' };
    }
}

'use server'

import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

interface SignatureMetadata {
    location?: string;
    userAgent?: string;
}

export async function saveDocumentSignature(
    entityType: 'SALES_ESTIMATE' | 'SALES_ORDER' | 'SALES_INVOICE' | 'CASH_TRANSACTION' | 'SALES_PAYMENT' | 'PURCHASE_PAYMENT', 
    entityId: string, 
    role: 'CUSTOMER' | 'COMPANY' | 'PAYER_RECEIVER' | 'SUPPLIER', 
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
    if (role === 'CUSTOMER' || role === 'PAYER_RECEIVER' || role === 'SUPPLIER') {
        if (entityType === 'CASH_TRANSACTION') {
            updateData.payerSignature = signatureDataUrl;
            updateData.payerSignedAt = new Date();
            updateData.payerSignIP = ip;
            updateData.payerSignDevice = rawUserAgent.substring(0, 190);
            if (meta?.location) updateData.payerSignLocation = meta.location;
        } else if (entityType === 'PURCHASE_PAYMENT') {
            updateData.supplierSignature = signatureDataUrl;
            updateData.supplierSignedAt = new Date();
            updateData.supplierSignIP = ip;
            updateData.supplierSignDevice = rawUserAgent.substring(0, 190);
            if (meta?.location) updateData.supplierSignLocation = meta.location;
        } else {
            updateData.customerSignature = signatureDataUrl;
            updateData.customerSignedAt = new Date();
            updateData.customerSignIP = ip;
            updateData.customerSignDevice = rawUserAgent.substring(0, 190);
            if (meta?.location) updateData.customerSignLocation = meta.location;
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
            case 'CASH_TRANSACTION':
                await prisma.cashTransaction.update({ where: { id: entityId }, data: updateData });
                break;
            case 'SALES_PAYMENT':
                await prisma.salesPayment.update({ where: { id: entityId }, data: updateData });
                break;
            case 'PURCHASE_PAYMENT':
                await prisma.purchasePayment.update({ where: { id: entityId }, data: updateData });
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

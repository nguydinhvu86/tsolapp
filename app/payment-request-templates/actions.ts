'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyActionPermission } from '@/lib/permissions';

export async function createPaymentRequestTemplate(data: { name: string, description?: string, content: string, editorType?: string }) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.paymentRequestTemplate.create({ data });
    revalidatePath('/payment-request-templates');
}

export async function updatePaymentRequestTemplate(id: string, data: { name: string, description?: string, content: string, editorType?: string }) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.paymentRequestTemplate.update({ where: { id }, data });
    revalidatePath('/payment-request-templates');
}

export async function deletePaymentRequestTemplate(id: string) {
    await verifyActionPermission('TEMPLATES_EDIT');
    // Should check if any PaymentRequests use this template before deleting in real app
    await prisma.paymentRequestTemplate.delete({ where: { id } });
    revalidatePath('/payment-request-templates');
}

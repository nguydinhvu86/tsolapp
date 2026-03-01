'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createPaymentRequestTemplate(data: { name: string, description?: string, content: string }) {
    await prisma.paymentRequestTemplate.create({ data });
    revalidatePath('/PaymentRequest-templates');
}

export async function updatePaymentRequestTemplate(id: string, data: { name: string, description?: string, content: string }) {
    await prisma.paymentRequestTemplate.update({ where: { id }, data });
    revalidatePath('/PaymentRequest-templates');
}

export async function deletePaymentRequestTemplate(id: string) {
    // Should check if any PaymentRequests use this template before deleting in real app
    await prisma.paymentRequestTemplate.delete({ where: { id } });
    revalidatePath('/PaymentRequest-templates');
}

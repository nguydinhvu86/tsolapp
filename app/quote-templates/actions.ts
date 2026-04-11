'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyActionPermission } from '@/lib/permissions';

export async function createQuoteTemplate(data: { name: string, description?: string, content: string, editorType?: string }) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.quoteTemplate.create({ data });
    revalidatePath('/quote-templates');
}

export async function updateQuoteTemplate(id: string, data: { name: string, description?: string, content: string, editorType?: string }) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.quoteTemplate.update({ where: { id }, data });
    revalidatePath('/quote-templates');
}

export async function deleteQuoteTemplate(id: string) {
    await verifyActionPermission('TEMPLATES_EDIT');
    // Should check if any quotes use this template before deleting in real app
    await prisma.quoteTemplate.delete({ where: { id } });
    revalidatePath('/quote-templates');
}

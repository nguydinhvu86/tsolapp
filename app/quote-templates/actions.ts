'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createQuoteTemplate(data: { name: string, description?: string, content: string }) {
    await prisma.quoteTemplate.create({ data });
    revalidatePath('/quote-templates');
}

export async function updateQuoteTemplate(id: string, data: { name: string, description?: string, content: string }) {
    await prisma.quoteTemplate.update({ where: { id }, data });
    revalidatePath('/quote-templates');
}

export async function deleteQuoteTemplate(id: string) {
    // Should check if any quotes use this template before deleting in real app
    await prisma.quoteTemplate.delete({ where: { id } });
    revalidatePath('/quote-templates');
}

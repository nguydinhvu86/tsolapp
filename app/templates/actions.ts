'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createTemplate(data: { name: string, description?: string, content: string, editorType?: string }) {
    await prisma.contractTemplate.create({ data });
    revalidatePath('/templates');
}

export async function updateTemplate(id: string, data: { name: string, description?: string, content: string, editorType?: string }) {
    await prisma.contractTemplate.update({ where: { id }, data });
    revalidatePath('/templates');
}

export async function deleteTemplate(id: string) {
    // Should check if any contracts use this template before deleting in real app
    await prisma.contractTemplate.delete({ where: { id } });
    revalidatePath('/templates');
}

'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyActionPermission } from '@/lib/permissions';

export async function createHandoverTemplate(data: { name: string, description?: string, content: string, editorType?: string }) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.handoverTemplate.create({ data });
    revalidatePath('/Handover-templates');
}

export async function updateHandoverTemplate(id: string, data: { name: string, description?: string, content: string, editorType?: string }) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.handoverTemplate.update({ where: { id }, data });
    revalidatePath('/Handover-templates');
}

export async function deleteHandoverTemplate(id: string) {
    await verifyActionPermission('TEMPLATES_EDIT');
    // Should check if any Handovers use this template before deleting in real app
    await prisma.handoverTemplate.delete({ where: { id } });
    revalidatePath('/Handover-templates');
}

'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyActionPermission } from '@/lib/permissions';

export async function createAppendixTemplate(data: { name: string, description?: string, content: string }) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.contractAppendixTemplate.create({ data });
    revalidatePath('/appendix-templates');
}

export async function updateAppendixTemplate(id: string, data: { name: string, description?: string, content: string }) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.contractAppendixTemplate.update({
        where: { id },
        data
    });
    revalidatePath('/appendix-templates');
}

export async function deleteAppendixTemplate(id: string) {
    await verifyActionPermission('TEMPLATES_EDIT');
    await prisma.contractAppendixTemplate.delete({
        where: { id }
    });
    revalidatePath('/appendix-templates');
}

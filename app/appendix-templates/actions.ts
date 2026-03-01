'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createAppendixTemplate(data: { name: string, description?: string, content: string }) {
    await prisma.contractAppendixTemplate.create({ data });
    revalidatePath('/appendix-templates');
}

export async function updateAppendixTemplate(id: string, data: { name: string, description?: string, content: string }) {
    await prisma.contractAppendixTemplate.update({
        where: { id },
        data
    });
    revalidatePath('/appendix-templates');
}

export async function deleteAppendixTemplate(id: string) {
    await prisma.contractAppendixTemplate.delete({
        where: { id }
    });
    revalidatePath('/appendix-templates');
}

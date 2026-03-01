'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createDispatchTemplate(data: { name: string, description?: string, content: string }) {
    await prisma.dispatchTemplate.create({ data });
    revalidatePath('/dispatch-templates');
}

export async function updateDispatchTemplate(id: string, data: { name: string, description?: string, content: string }) {
    await prisma.dispatchTemplate.update({
        where: { id },
        data
    });
    revalidatePath('/dispatch-templates');
}

export async function deleteDispatchTemplate(id: string) {
    await prisma.dispatchTemplate.delete({
        where: { id }
    });
    revalidatePath('/dispatch-templates');
}

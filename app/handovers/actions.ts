'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createHandover(data: { title: string, content: string, variables: string, customerId: string, templateId: string }) {
    const handover = await prisma.handover.create({ data });
    revalidatePath('/handovers');
    return handover;
}

export async function updateHandoverStatus(id: string, status: string) {
    await prisma.handover.update({ where: { id }, data: { status } });
    revalidatePath('/handovers');
}

export async function deleteHandover(id: string) {
    await prisma.handover.delete({ where: { id } });
    revalidatePath('/handovers');
}

export async function updateHandover(id: string, content: string) {
    const handover = await prisma.handover.update({
        where: { id },
        data: { content }
    });
    revalidatePath('/handovers');
    revalidatePath(`/handovers/${id}`);
    return handover;
}

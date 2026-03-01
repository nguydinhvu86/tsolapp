'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function deleteDispatch(id: string) {
    await prisma.dispatch.delete({
        where: { id }
    });
    revalidatePath('/dispatches');
}

export async function updateDispatchStatus(id: string, status: string) {
    await prisma.dispatch.update({
        where: { id },
        data: { status }
    });
    revalidatePath('/dispatches');
}

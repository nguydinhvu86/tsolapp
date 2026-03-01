'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function deleteAppendix(id: string) {
    await prisma.contractAppendix.delete({
        where: { id }
    });
    revalidatePath('/contract-appendices');
    revalidatePath('/contracts'); // Also update contract details
}

export async function updateAppendixStatus(id: string, status: string) {
    await prisma.contractAppendix.update({
        where: { id },
        data: { status }
    });
    revalidatePath('/contract-appendices');
    revalidatePath('/contracts');
}

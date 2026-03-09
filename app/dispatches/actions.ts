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

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function assignDispatchManagers(dispatchId: string, userIds: string[]) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }
    const doc = await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
            managers: {
                connect: userIds.map(id => ({ id }))
            }
        }
    });
    revalidatePath(`/dispatches/${dispatchId}`);
    return doc;
}

export async function removeDispatchManager(dispatchId: string, userId: string) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
        throw new Error("Unauthorized");
    }
    const doc = await prisma.dispatch.update({
        where: { id: dispatchId },
        data: {
            managers: {
                disconnect: { id: userId }
            }
        }
    });
    revalidatePath(`/dispatches/${dispatchId}`);
    return doc;
}

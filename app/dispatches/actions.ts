'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyActionOwnership } from '@/lib/permissions';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export async function deleteDispatch(id: string) {
    const dispatch = await prisma.dispatch.findUnique({ where: { id }, include: { managers: true } });
    if (!dispatch) throw new Error("Không tìm thấy văn thư");
    const managers = dispatch.managers ? dispatch.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('DISPATCHES', 'DELETE', '', managers);

    await prisma.dispatch.delete({
        where: { id }
    });
    revalidatePath('/dispatches');
}

export async function updateDispatchStatus(id: string, status: string) {
    const dispatch = await prisma.dispatch.findUnique({ where: { id }, include: { managers: true } });
    if (!dispatch) throw new Error("Không tìm thấy văn thư");
    const managers = dispatch.managers ? dispatch.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('DISPATCHES', 'EDIT', '', managers);

    await prisma.dispatch.update({
        where: { id },
        data: { status }
    });
    revalidatePath('/dispatches');
}

export async function assignDispatchManagers(dispatchId: string, userIds: string[]) {
    const dispatch = await prisma.dispatch.findUnique({ where: { id: dispatchId }, include: { managers: true } });
    if (!dispatch) throw new Error("Không tìm thấy văn thư");
    const mIds = dispatch.managers ? dispatch.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('DISPATCHES', 'EDIT', '', mIds);

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
    const dispatch = await prisma.dispatch.findUnique({ where: { id: dispatchId }, include: { managers: true } });
    if (!dispatch) throw new Error("Không tìm thấy văn thư");
    const mIds = dispatch.managers ? dispatch.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('DISPATCHES', 'EDIT', '', mIds);

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

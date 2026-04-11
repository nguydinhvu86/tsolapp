'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { verifyActionOwnership } from '@/lib/permissions';

export async function updateDispatchDetails(data: {
    id: string;
    title: string;
    customerId: string;
    templateId: string;
    content: string;
    variables: string;
}) {
    const existing = await prisma.dispatch.findUnique({ where: { id: data.id }, include: { managers: true } });
    if (!existing) throw new Error("Không tìm thấy văn thư");
    const managers = existing.managers ? existing.managers.map((m: any) => m.id) : [];
    await verifyActionOwnership('DISPATCHES', 'EDIT', '', managers);

    const dispatch = await prisma.dispatch.update({
        where: { id: data.id },
        data: {
            title: data.title,
            customerId: data.customerId,
            templateId: data.templateId,
            content: data.content,
            variables: data.variables,
        }
    });

    revalidatePath('/dispatches');
    revalidatePath(`/dispatches/${data.id}`);
    redirect(`/dispatches/${dispatch.id}`);
}

'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { verifyActionPermission } from '@/lib/permissions';

export async function createDispatch(data: {
    title: string;
    customerId: string;
    templateId: string;
    content: string;
    variables: string;
}) {
    await verifyActionPermission('DISPATCHES_CREATE');

    const dispatch = await prisma.dispatch.create({
        data: {
            title: data.title,
            customerId: data.customerId,
            templateId: data.templateId,
            content: data.content,
            variables: data.variables,
            status: 'DRAFT'
        }
    });

    revalidatePath('/dispatches');
    revalidatePath('/customers');
    redirect(`/dispatches/${dispatch.id}`);
}

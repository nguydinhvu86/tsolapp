'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createContractAppendix(data: {
    title: string;
    content: string;
    variables: string;
    contractId: string;
    templateId: string;
}) {
    const appendix = await prisma.contractAppendix.create({
        data: {
            title: data.title,
            content: data.content,
            variables: data.variables,
            contractId: data.contractId,
            templateId: data.templateId,
            status: 'DRAFT'
        }
    });

    revalidatePath('/contracts'); // Revalidate contracts page to show new appendix
    return appendix;
}

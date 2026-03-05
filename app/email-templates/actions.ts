'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getEmailTemplates() {
    return prisma.emailTemplate.findMany({
        orderBy: { createdAt: 'desc' },
        include: { creator: { select: { name: true } } }
    });
}

export async function getEmailTemplate(id: string) {
    return prisma.emailTemplate.findUnique({
        where: { id }
    });
}

export async function createEmailTemplate(data: { name: string, subject: string, body: string, module?: string }, creatorId: string) {
    const template = await prisma.emailTemplate.create({
        data: {
            ...data,
            creatorId
        }
    });
    revalidatePath('/email-templates');
    return template;
}

export async function updateEmailTemplate(id: string, data: { name: string, subject: string, body: string, module?: string }) {
    const template = await prisma.emailTemplate.update({
        where: { id },
        data
    });
    revalidatePath('/email-templates');
    return template;
}

export async function deleteEmailTemplate(id: string) {
    await prisma.emailTemplate.delete({
        where: { id }
    });
    revalidatePath('/email-templates');
}

export async function getTemplatesByModule(module: string) {
    return prisma.emailTemplate.findMany({
        where: { module },
        orderBy: { name: 'asc' }
    });
}

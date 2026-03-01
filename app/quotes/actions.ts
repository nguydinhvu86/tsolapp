'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createQuote(data: { title: string, content: string, variables: string, customerId: string, templateId: string, assignedToId?: string }, creatorId?: string) {
    const quote = await prisma.quote.create({ data });

    // Notify Assignee or Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const targetUserIds = new Set<string>();
    admins.forEach(a => targetUserIds.add(a.id));

    if (data.assignedToId) targetUserIds.add(data.assignedToId);
    if (creatorId) targetUserIds.delete(creatorId);

    try {
        const notifications = Array.from(targetUserIds).map(userId => ({
            userId,
            message: `Báo giá mới đã được tạo: "${quote.title}"`,
            link: `/quotes/${quote.id}`
        }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
    } catch (error) {
        console.error("Failed to create notifications for new quote:", error);
    }

    revalidatePath('/quotes');
    return quote;
}

export async function updateQuoteStatus(id: string, status: string, actorId?: string) {
    const quote = await prisma.quote.update({ where: { id }, data: { status } });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const targetUserIds = new Set<string>();
    admins.forEach(a => targetUserIds.add(a.id));

    if (actorId) targetUserIds.delete(actorId);

    try {
        const notifications = Array.from(targetUserIds).map(userId => ({
            userId,
            message: `Báo giá "${quote.title}" đã chuyển trạng thái thành: ${status}`,
            link: `/quotes/${quote.id}`
        }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
    } catch (error) {
        console.error("Failed to create notifications for quote status update:", error);
    }

    revalidatePath('/quotes');
}

export async function deleteQuote(id: string) {
    await prisma.quote.delete({ where: { id } });
    revalidatePath('/quotes');
}

export async function updateQuote(id: string, content: string) {
    const quote = await prisma.quote.update({
        where: { id },
        data: { content }
    });
    revalidatePath('/quotes');
    revalidatePath(`/quotes/${id}`);
    return quote;
}

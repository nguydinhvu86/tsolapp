'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getUnreadNotifications(userId: string) {
    if (!userId) return [];
    return prisma.notification.findMany({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 20
    });
}

export async function markAsRead(notificationId: string) {
    await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true }
    });
    // Assuming notifications might be checked anywhere, but mostly client-side polling will handle UI updates
}

export async function markAllAsRead(userId: string) {
    if (!userId) return;
    await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
    });
}

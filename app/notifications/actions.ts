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

export async function createNotification(userId: string, title: string, message: string, type: string = "INFO", link: string | null = null) {
    try {
        const notif = await prisma.notification.create({
            data: {
                userId,
                title,
                message,
                type,
                link
            }
        });
        return { success: true, data: notif };
    } catch (error: any) {
        console.error("Error creating notification:", error);
        return { success: false, error: error.message };
    }
}

export async function getAllNotifications(userId: string) {
    if (!userId) return [];
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}

export async function getUnreadCount(userId: string) {
    if (!userId) return 0;
    return prisma.notification.count({
        where: { userId, isRead: false }
    });
}

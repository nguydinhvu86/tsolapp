'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { triggerPusherEvent } from '@/lib/pusher-server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export async function getUnreadNotifications(userId: string) {
    if (!userId) return [];
    const session = await getServerSession(authOptions);
    if (!session || session.user.id !== userId) throw new Error("Unauthorized");
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
    const session = await getServerSession(authOptions);
    if (!session || session.user.id !== userId) throw new Error("Unauthorized");
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

        // Trigger real-time notification
        await triggerPusherEvent(`user-${userId}`, 'new-notification', {
            title,
            message,
            link,
            type
        });

        return { success: true, data: notif };
    } catch (error: any) {
        console.error("Error creating notification:", error);
        return { success: false, error: error.message };
    }
}

export async function getAllNotifications(userId: string) {
    if (!userId) return [];
    const session = await getServerSession(authOptions);
    if (!session || session.user.id !== userId) throw new Error("Unauthorized");
    return prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50
    });
}

export async function getUnreadCount(userId: string) {
    if (!userId) return 0;
    const session = await getServerSession(authOptions);
    if (!session || session.user.id !== userId) return 0;
    return prisma.notification.count({
        where: { userId, isRead: false }
    });
}

export async function createManyNotifications(notifications: { userId: string, title: string, message: string, type?: string, link?: string }[]) {
    try {
        if (!notifications || notifications.length === 0) return { success: true };

        // Ensure type default
        const sanitized = notifications.map(n => ({
            ...n,
            type: n.type || 'INFO'
        }));

        await prisma.notification.createMany({ data: sanitized });

        // Trigger pusher for each
        for (const notif of sanitized) {
            await triggerPusherEvent(`user-${notif.userId}`, 'new-notification', {
                title: notif.title,
                message: notif.message,
                link: notif.link,
                type: notif.type
            });
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error creating many notifications:", error);
        return { success: false, error: error.message };
    }
}

export async function getPusherClientConfig() {
    const settings = await prisma.systemSetting.findMany({
        where: {
            key: { in: ['PUSHER_KEY', 'PUSHER_CLUSTER'] }
        }
    });
    const config = { key: '', cluster: '' };
    settings.forEach(s => {
        if (s.key === 'PUSHER_KEY') config.key = s.value;
        if (s.key === 'PUSHER_CLUSTER') config.cluster = s.value;
    });
    return config;
}

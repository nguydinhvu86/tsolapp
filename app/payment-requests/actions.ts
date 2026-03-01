'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createPaymentRequest(data: { title: string, content: string, variables: string, customerId: string, templateId: string, assignedToId?: string }, creatorId?: string) {
    const paymentRequest = await prisma.paymentRequest.create({ data });

    // Notify Assignee or Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const targetUserIds = new Set<string>();
    admins.forEach(a => targetUserIds.add(a.id));

    if (data.assignedToId) targetUserIds.add(data.assignedToId);
    if (creatorId) targetUserIds.delete(creatorId);

    try {
        const notifications = Array.from(targetUserIds).map(userId => ({
            userId,
            message: `Yêu cầu thanh toán mới đã được tạo: "${paymentRequest.title}"`,
            link: `/payment-requests/${paymentRequest.id}`
        }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
    } catch (error) {
        console.error("Failed to create notifications for new payment request:", error);
    }

    revalidatePath('/payment-requests');
    return paymentRequest;
}

export async function updatePaymentRequestStatus(id: string, status: string, actorId?: string) {
    const paymentRequest = await prisma.paymentRequest.update({ where: { id }, data: { status } });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const targetUserIds = new Set<string>();
    admins.forEach(a => targetUserIds.add(a.id));

    if (actorId) targetUserIds.delete(actorId);

    try {
        const notifications = Array.from(targetUserIds).map(userId => ({
            userId,
            message: `Yêu cầu thanh toán "${paymentRequest.title}" đã chuyển trạng thái thành: ${status}`,
            link: `/payment-requests/${paymentRequest.id}`
        }));

        if (notifications.length > 0) {
            await prisma.notification.createMany({ data: notifications });
        }
    } catch (error) {
        console.error("Failed to create notifications for payment request status update:", error);
    }

    revalidatePath('/payment-requests');
}

export async function deletePaymentRequest(id: string) {
    await prisma.paymentRequest.delete({ where: { id } });
    revalidatePath('/payment-requests');
}

export async function updatePaymentRequest(id: string, content: string) {
    const paymentRequest = await prisma.paymentRequest.update({
        where: { id },
        data: { content }
    });
    revalidatePath('/payment-requests');
    revalidatePath(`/payment-requests/${id}`);
    return paymentRequest;
}

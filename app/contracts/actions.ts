'use server'

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { logCustomerActivity } from "@/lib/customerLogger";
import { createManyNotifications } from '@/app/notifications/actions';
import { buildViewFilter, verifyActionPermission, verifyActionOwnership } from '@/lib/permissions';

export async function createContract(data: { title: string, content: string, variables: string, customerId: string, templateId: string, assignedToId?: string }, creatorId?: string) {
    const user = await verifyActionPermission('CONTRACTS_CREATE');
    const uId = user ? (user as any).id : creatorId;
    const contract = await prisma.contract.create({ data });

    const session = await getServerSession(authOptions);
    if (session?.user?.id && data.customerId) {
        await logCustomerActivity(
            data.customerId,
            session.user.id,
            'TẠO_HỢP_ĐỒNG',
            `Đã tạo Hợp Đồng [${contract.title}]` // Assuming contract.title is used for the message, as contract.code might not exist or be available here.
        );
    }

    // Notify Assginee or Admins
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const targetUserIds = new Set<string>();
    admins.forEach(a => targetUserIds.add(a.id));

    if (data.assignedToId) {
        targetUserIds.add(data.assignedToId);
    }

    // Remove self if creator
    if (creatorId) {
        targetUserIds.delete(creatorId);
    }

    try {
        const notifications = Array.from(targetUserIds).map(userId => ({
            userId,
            title: 'Hợp đồng mới',
            message: `Hợp đồng mới đã được tạo: "${contract.title}"`,
            link: `/contracts/${contract.id}`
        }));

        if (notifications.length > 0) {
            await createManyNotifications(notifications);
        }
    } catch (error) {
        console.error("Failed to create notifications for new contract:", error);
    }

    revalidatePath('/contracts');
    if (data.customerId) revalidatePath(`/customers/${data.customerId}`);
    return contract;
}

export async function updateContractStatus(id: string, status: string, actorId?: string) {
    const ext = await prisma.contract.findUnique({ where: { id } });
    if (!ext) throw new Error("Not found");
    await verifyActionOwnership('CONTRACTS', 'EDIT', ext?.creatorId || '');

    const contract = await prisma.contract.update({ where: { id }, data: { status } });

    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    const targetUserIds = new Set<string>();
    admins.forEach(a => targetUserIds.add(a.id));

    if (actorId) targetUserIds.delete(actorId);

    try {
        const notifications = Array.from(targetUserIds).map(userId => ({
            userId,
            title: 'Cập nhật Hợp đồng',
            message: `Hợp đồng "${contract.title}" đã chuyển trạng thái thành: ${status}`,
            link: `/contracts/${contract.id}`
        }));

        if (notifications.length > 0) {
            await createManyNotifications(notifications);
        }
    } catch (error) {
        console.error("Failed to create notifications for contract status update:", error);
    }

    revalidatePath('/contracts');
}

export async function deleteContract(id: string) {
    const ext = await prisma.contract.findUnique({ where: { id } });
    if (!ext) throw new Error("Not found");
    await verifyActionOwnership('CONTRACTS', 'DELETE', ext?.creatorId || '');

    await prisma.contract.delete({ where: { id } });
    revalidatePath('/contracts');
}

export async function updateContract(id: string, content: string) {
    const ext = await prisma.contract.findUnique({ where: { id } });
    if (!ext) throw new Error("Not found");
    await verifyActionOwnership('CONTRACTS', 'EDIT', ext?.creatorId || '');

    const contract = await prisma.contract.update({
        where: { id },
        data: { content }
    });
    revalidatePath('/contracts');
    revalidatePath(`/contracts/${id}`);
    return contract;
}

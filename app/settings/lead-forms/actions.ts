'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from 'next/cache';

// Require Admin Role for these operations
async function checkAdmin() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        throw new Error("Unauthorized. Admin access required.");
    }
    return session.user;
}

export async function getLeadForms() {
    await checkAdmin();
    return await prisma.leadForm.findMany({
        include: {
            assignee: {
                select: { id: true, name: true, email: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
}

export async function createLeadForm(data: { title: string, source: string, assigneeId?: string, successMessage?: string, isActive?: boolean }) {
    await checkAdmin();

    try {
        const leadForm = await prisma.leadForm.create({
            data: {
                title: data.title,
                source: data.source,
                assigneeId: data.assigneeId || null,
                successMessage: data.successMessage || "Cảm ơn bạn đã để lại thông tin. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.",
                isActive: data.isActive !== undefined ? data.isActive : true
            }
        });
        revalidatePath('/settings/lead-forms');
        revalidatePath('/f/[id]', 'page');
        return { success: true, leadForm };
    } catch (e: any) {
        console.error("Lỗi khi tạo Lead Form:", e);
        return { success: false, error: e.message };
    }
}

export async function updateLeadForm(id: string, data: { title: string, source: string, assigneeId?: string, successMessage?: string, isActive?: boolean }) {
    await checkAdmin();

    try {
        const leadForm = await prisma.leadForm.update({
            where: { id },
            data: {
                title: data.title,
                source: data.source,
                assigneeId: data.assigneeId || null,
                successMessage: data.successMessage || "Cảm ơn bạn đã để lại thông tin. Chúng tôi sẽ liên hệ trong thời gian sớm nhất.",
                isActive: data.isActive
            }
        });
        revalidatePath('/settings/lead-forms');
        revalidatePath('/f/[id]', 'page');
        return { success: true, leadForm };
    } catch (e: any) {
        console.error("Lỗi khi cập nhật Lead Form:", e);
        return { success: false, error: e.message };
    }
}

export async function deleteLeadForm(id: string) {
    await checkAdmin();
    try {
        await prisma.leadForm.delete({ where: { id } });
        revalidatePath('/settings/lead-forms');
        return { success: true };
    } catch (e: any) {
        console.error("Lỗi khi xóa Lead Form:", e);
        return { success: false, error: e.message };
    }
}

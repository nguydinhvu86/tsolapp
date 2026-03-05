'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from "next/cache";
import { logCustomerActivity } from "@/lib/customerLogger";

export async function getCustomerWithRelations(id: string) {
    try {
        const customer = await prisma.customer.findUnique({
            where: { id },
            include: {
                quotes: {
                    orderBy: { createdAt: 'desc' }
                },
                contracts: {
                    orderBy: { createdAt: 'desc' },
                    include: { template: true, appendices: true }
                },
                handovers: {
                    orderBy: { createdAt: 'desc' }
                },
                paymentRequests: {
                    orderBy: { createdAt: 'desc' }
                },
                dispatches: {
                    orderBy: { createdAt: 'desc' },
                    include: { template: true }
                },
                salesEstimates: { orderBy: { createdAt: 'desc' } },
                salesOrders: { orderBy: { createdAt: 'desc' } },
                salesInvoices: { orderBy: { createdAt: 'desc' } },
                salesPayments: { orderBy: { createdAt: 'desc' } },
                leads: { orderBy: { createdAt: 'desc' } },
                notes: {
                    include: { user: { select: { name: true, avatar: true } } },
                    orderBy: { createdAt: 'desc' }
                },
                activityLogs: {
                    include: { user: { select: { name: true, avatar: true } } },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        return customer;
    } catch (e) {
        console.error("Failed to fetch customer relations", e);
        return null;
    }
}

// --- CUSTOMER NOTE ACTIONS ---

export async function createCustomerNote(customerId: string, content: string, attachment?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        const userId = session.user.id;

        const note = await prisma.customerNote.create({
            data: {
                customerId,
                userId,
                content,
                attachment
            },
            include: {
                user: { select: { name: true, avatar: true } }
            }
        });

        await logCustomerActivity(
            customerId,
            userId,
            'THÊM_GHI_CHÚ',
            `Thêm ghi chú mới: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
        );

        revalidatePath(`/customers/${customerId}`);
        return { success: true, data: note };
    } catch (error: any) {
        console.error("Lỗi khi thêm ghi chú:", error);
        return { success: false, error: error.message };
    }
}

export async function deleteCustomerNote(noteId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) return { success: false, error: "Unauthorized" };
        const userId = session.user.id;

        const note = await prisma.customerNote.findUnique({ where: { id: noteId } });
        if (!note) return { success: false, error: "Không tìm thấy ghi chú" };

        if (note.userId !== userId) {
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user?.role !== 'ADMIN') {
                return { success: false, error: "Bạn không có quyền xóa ghi chú này" };
            }
        }

        await prisma.customerNote.delete({ where: { id: noteId } });

        await logCustomerActivity(
            note.customerId,
            userId,
            'XÓA_GHI_CHÚ',
            `Đã xóa một ghi chú`
        );

        revalidatePath(`/customers/${note.customerId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi khi xóa ghi chú:", error);
        return { success: false, error: error.message };
    }
}

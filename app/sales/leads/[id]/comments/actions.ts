'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from 'next/cache';

export async function getLeadComments(leadId: string) {
    try {
        const comments = await prisma.leadComment.findMany({
            where: { leadId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return comments;
    } catch (error: any) {
        console.error("Lỗi khi tải bình luận:", error);
        return [];
    }
}

export async function createLeadComment(leadId: string, content: string, images?: string, files?: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) throw new Error("Chưa đăng nhập");
        const userId = session.user.id;

        if (!content && !images && !files) {
            throw new Error("Nội dung không được để trống");
        }

        const comment = await prisma.leadComment.create({
            data: {
                content: content || "",
                leadId,
                userId: userId,
                images,
                files,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        // Ghi log hoạt động
        let logMessage = `Đã thêm bình luận mới.`;
        if (images || files) {
            logMessage = `Đã tải lên tệp đính kèm mới.`;
        }
        await prisma.leadActivityLog.create({
            data: {
                action: 'COMMENTED',
                leadId: leadId,
                userId: userId,
                details: logMessage,
            }
        });

        revalidatePath(`/sales/leads/${leadId}`);
        return { success: true, data: comment };
    } catch (error: any) {
        console.error("Lỗi tạo bình luận:", error);
        return { success: false, error: error.message || "Không thể tạo bình luận" };
    }
}

export async function deleteLeadComment(commentId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) throw new Error("Chưa đăng nhập");
        const userId = session.user.id;
        const userRole = session.user.role;

        const comment = await prisma.leadComment.findUnique({
            where: { id: commentId },
        });

        if (!comment) throw new Error("Không tìm thấy bình luận");

        if (comment.userId !== userId && userRole !== 'ADMIN') {
            throw new Error("Không có quyền xóa");
        }

        await prisma.leadComment.delete({
            where: { id: commentId },
        });

        // Xóa Activity Log
        await prisma.leadActivityLog.create({
            data: {
                action: 'COMMENT_DELETED',
                leadId: comment.leadId,
                userId: userId,
                details: `Đã xóa một bình luận của: ${session.user.name}`,
            }
        });

        revalidatePath(`/sales/leads/${comment.leadId}`);
        return { success: true };
    } catch (error: any) {
        console.error("Lỗi xóa bình luận:", error);
        return { success: false, error: error.message || "Không thể xóa bình luận" };
    }
}

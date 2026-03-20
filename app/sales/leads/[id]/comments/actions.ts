'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";
import { revalidatePath } from 'next/cache';
import { createManyNotifications } from '@/app/notifications/actions';
import { sendWebPushNotification } from '@/lib/notifications/webPush';

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
                        email: true,
                    },
                },
                reactions: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
        return comments;
    } catch (error: any) {
        console.error("Lỗi khi tải bình luận:", error);
        return [];
    }
}

export async function createLeadComment(leadId: string, content: string, parentId?: string, images?: string, files?: string) {
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
                parentId: parentId || null,
                images,
                files,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        email: true
                    },
                },
                reactions: true
            },
        });

        // Ghi log hoạt động
        let logMessage = `Đã thêm bình luận mới.`;
        if (parentId) {
            logMessage = `Đã trả lời bình luận.`;
        } else if (images || files) {
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

        const { notifyLeadStakeholders } = await import('@/app/sales/leads/actions');
        let notificationMsg = 'đã bình luận';
        if (images || files) notificationMsg += ' và đính kèm tệp';
        await notifyLeadStakeholders(leadId, userId, notificationMsg, session.user.name || 'Ai đó');

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

export async function toggleLeadCommentReaction(commentId: string, emoji: string, userId: string) {
    try {
        const existing = await prisma.leadCommentReaction.findUnique({
            where: {
                commentId_userId_emoji: {
                    commentId,
                    userId,
                    emoji
                }
            }
        });

        if (existing) {
            await prisma.leadCommentReaction.delete({ where: { id: existing.id } });
        } else {
            await prisma.leadCommentReaction.create({
                data: {
                    commentId,
                    userId,
                    emoji
                }
            });
        }

        const comment = await prisma.leadComment.findUnique({
            where: { id: commentId },
            select: { leadId: true, userId: true, user: { select: { name: true } }, lead: { select: { name: true } } }
        });
        if (comment) {
            // Notifications
            if (!existing && comment.userId !== userId) {
                const reactor = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
                const message = `${reactor?.name || 'Ai đó'} đã bày tỏ cảm xúc ${emoji} về bình luận của bạn trong Cơ hội: "${comment.lead?.name || 'Không tên'}".`;

                await createManyNotifications([{
                    userId: comment.userId,
                    title: 'Có người tương tác bình luận',
                    message,
                    type: 'INFO',
                    link: `/sales/leads/${comment.leadId}`
                }]);

                sendWebPushNotification(comment.userId, {
                    title: 'Tương tác mới',
                    body: message,
                    url: `/sales/leads/${comment.leadId}`
                });
            }

            revalidatePath(`/sales/leads/${comment.leadId}`);
        }
        return { success: true };
    } catch (error) {
        console.error('Toggle reaction error:', error);
        return { success: false };
    }
}

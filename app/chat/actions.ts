'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { sendEmailWithTracking } from '@/lib/mailer';
import { sendWebPushNotification } from '@/lib/notifications/webPush';

export async function getSessionUserId() {
    const session = await getServerSession(authOptions);
    return session?.user?.id;
}

export async function getActiveUsersForChat() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Unauthorized');

    // Fetch users for the directory, excluding sensitive fields
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true
        },
        orderBy: { name: 'asc' }
    });

    return users;
}

export async function getChatRooms() {
    const userId = await getSessionUserId();
    if (!userId) return [];

    return await prisma.chatRoom.findMany({
        where: {
            participants: {
                some: { userId }
            }
        },
        include: {
            participants: {
                include: { user: { select: { id: true, name: true, email: true } } }
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        },
        orderBy: { updatedAt: 'desc' }
    });
}

export async function getChatMessages(roomId: string) {
    const userId = await getSessionUserId();
    if (!userId) return [];

    // Tự động mark as read khi lấy tin nhắn
    await markRoomAsRead(roomId);

    return await prisma.chatMessage.findMany({
        where: { roomId },
        orderBy: { createdAt: 'asc' },
        include: {
            sender: { select: { id: true, name: true, email: true } },
            replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
            reactions: { include: { user: { select: { id: true, name: true } } } }
        }
    });
}

export async function sendMessage(roomId: string, content: string, attachmentUrl?: string, replyToId?: string) {
    const userId = await getSessionUserId();
    if (!userId || (!content.trim() && !attachmentUrl)) throw new Error('Unauthorized or empty content');

    const message = await prisma.chatMessage.create({
        data: {
            roomId,
            senderId: userId,
            content: content.trim(),
            attachmentUrl,
            replyToId
        },
        include: {
            sender: { select: { id: true, name: true, email: true } },
            replyTo: { select: { id: true, content: true, sender: { select: { name: true } } } },
            reactions: { include: { user: { select: { id: true, name: true } } } }
        }
    });

    // Cập nhật lastRead cho người gửi và đẩy updatedAt của Room lên đầu
    await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() }
    });

    await markRoomAsRead(roomId);

    // Notifications
    try {
        const room = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            include: { participants: { include: { user: true } } }
        });

        if (room) {
            const userIdsToNotify = room.participants
                .filter(p => p.userId !== userId)
                .map(p => p.userId);

            if (userIdsToNotify.length > 0) {
                const roomNameText = room.isGroup && room.name ? ` trong nhóm ${room.name}` : '';
                const titleText = `Tin nhắn mới từ ${message.sender.name}${roomNameText}`;
                const bodyText = content.trim() || 'Đã gửi một hình ảnh đính kèm';
                await sendChatNotifications(userIdsToNotify, titleText, bodyText, '/', message.sender.name);
            }
        }
    } catch (err) {
        console.error('Failed to process notifications:', err);
    }

    return message;
}

export async function createDirectChat(targetUserId: string) {
    const currentUserId = await getSessionUserId();
    if (!currentUserId) throw new Error('Unauthorized');
    if (currentUserId === targetUserId) throw new Error('Không thể chat với chính mình');

    // Tìm xem đã có phòng chat 1-1 giữa 2 người này chưa
    const existingRooms = await prisma.chatRoom.findMany({
        where: {
            isGroup: false,
            AND: [
                { participants: { some: { userId: currentUserId } } },
                { participants: { some: { userId: targetUserId } } }
            ]
        }
    });

    if (existingRooms.length > 0) {
        return existingRooms[0].id; // Trả về ID phòng đã có
    }

    // Tạo phòng mới
    const newRoom = await prisma.chatRoom.create({
        data: {
            isGroup: false,
            participants: {
                create: [
                    { userId: currentUserId },
                    { userId: targetUserId }
                ]
            }
        }
    });

    return newRoom.id;
}

export async function createGroupChat(name: string, memberIds: string[]) {
    const currentUserId = await getSessionUserId();
    if (!currentUserId) throw new Error('Unauthorized');

    const allMemberIds = Array.from(new Set([...memberIds, currentUserId]));

    if (allMemberIds.length < 2) throw new Error('Nhóm phải có ít nhất 2 thành viên');

    const newRoom = await prisma.chatRoom.create({
        data: {
            isGroup: true,
            name: name.trim() || 'Nhóm Mới',
            participants: {
                create: allMemberIds.map(id => ({ userId: id }))
            }
        }
    });

    return newRoom.id;
}

export async function markRoomAsRead(roomId: string) {
    const userId = await getSessionUserId();
    if (!userId) return;

    await prisma.chatParticipant.updateMany({
        where: { roomId, userId },
        data: { lastRead: new Date() }
    });
}

export async function getUnreadCount() {
    const userId = await getSessionUserId();
    if (!userId) return 0;

    const rooms = await prisma.chatRoom.findMany({
        where: { participants: { some: { userId } } },
        include: {
            participants: { where: { userId } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
    });

    let count = 0;
    rooms.forEach((room: any) => {
        const myParticipant = room.participants[0];
        const lastMsg = room.messages[0];
        if (myParticipant && lastMsg && new Date(lastMsg.createdAt) > new Date(myParticipant.lastRead)) {
            count++;
        }
    });

    return count;
}

export async function toggleReaction(messageId: string, emoji: string) {
    const userId = await getSessionUserId();
    if (!userId) throw new Error('Unauthorized');

    const existingReaction = await prisma.chatMessageReaction.findUnique({
        where: {
            messageId_userId_emoji: {
                messageId,
                userId,
                emoji
            }
        }
    });

    if (existingReaction) {
        await prisma.chatMessageReaction.delete({
            where: { id: existingReaction.id }
        });
        return { action: 'removed' };
    } else {
        const reaction = await prisma.chatMessageReaction.create({
            data: { messageId, userId, emoji },
            include: { message: { include: { sender: true } }, user: true }
        });

        // Notify original sender
        if (reaction.message.senderId !== userId) {
            await sendChatNotifications(
                [reaction.message.senderId],
                `${reaction.user.name} đã bày tỏ cảm xúc ${emoji}`,
                `Về tin nhắn: "${reaction.message.content.substring(0, 50)}..."`,
                '/',
                reaction.user.name
            );
        }

        return { action: 'added', reaction };
    }
}

async function sendChatNotifications(
    userIds: string[],
    title: string,
    body: string,
    url: string,
    fromSenderName: string | null
) {
    const senderDisplayName = fromSenderName || 'Ai đó';
    for (const uId of userIds) {
        // 1. Hệ thống Notification
        await prisma.notification.create({
            data: {
                userId: uId,
                title,
                message: body,
                type: 'INFO',
                link: url
            }
        }).catch(e => console.error('System Notification error:', e));

        // 2 & 3. Push Browser / Mobile Device
        sendWebPushNotification(uId, {
            title,
            body,
            url
        }).catch(e => console.error('Push error:', e));

        // 4. Email
        const user = await prisma.user.findUnique({ where: { id: uId } });
        if (user?.email) {
            sendEmailWithTracking({
                to: user.email,
                subject: `[Thông báo mới] ${title}`,
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <p>Chào ${user.name},</p>
                        <p>Bạn có thông báo mới từ <strong>${senderDisplayName}</strong>:</p>
                        <blockquote style="border-left: 4px solid #3b82f6; padding-left: 12px; margin: 16px 0; color: #475569; font-style: italic; background-color: #f8fafc; padding: 12px; border-radius: 0 8px 8px 0;">
                            ${body}
                        </blockquote>
                        <p style="margin-top: 24px;">
                            <a href="${process.env.NEXTAUTH_URL || 'https://inside.tsol.vn'}${url}" style="display:inline-block;padding:12px 24px;background-color:#3b82f6;color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
                                Xem thông báo
                            </a>
                        </p>
                    </div>
                `
            }).catch(e => console.error('Email error:', e));
        }
    }
}

'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

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
            sender: { select: { id: true, name: true, email: true } }
        }
    });
}

export async function sendMessage(roomId: string, content: string, attachmentUrl?: string) {
    const userId = await getSessionUserId();
    if (!userId || (!content.trim() && !attachmentUrl)) throw new Error('Unauthorized or empty content');

    const message = await prisma.chatMessage.create({
        data: {
            roomId,
            senderId: userId,
            content: content.trim(),
            attachmentUrl
        },
        include: {
            sender: { select: { id: true, name: true, email: true } }
        }
    });

    // Cập nhật lastRead cho người gửi và đẩy updatedAt của Room lên đầu
    await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() }
    });

    await markRoomAsRead(roomId);

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

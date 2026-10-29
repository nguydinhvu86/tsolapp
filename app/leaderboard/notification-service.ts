import { prisma } from '@/lib/prisma';
import { createNotification } from '@/app/notifications/actions';
import { sendEmailWithTracking } from '@/lib/mailer';

// =========================================================================
// 1. MENTION RESOLUTION HELPER
// Scans content for @UserName tags as well as merges explicit mentioned IDs
// =========================================================================
export async function resolveMentionedUserIds(
    content: string,
    explicitUserIds: string[] = []
): Promise<string[]> {
    const userIds = new Set<string>(explicitUserIds.filter(Boolean));
    if (!content || !content.includes('@')) {
        return Array.from(userIds);
    }

    try {
        const users = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, name: true }
        });

        const normalizedContent = content.toLowerCase();
        for (const u of users) {
            if (u.name && u.name.trim().length >= 2) {
                const tag = `@${u.name.toLowerCase().trim()}`;
                if (normalizedContent.includes(tag)) {
                    userIds.add(u.id);
                }
            }
        }
    } catch (e) {
        console.warn('Lỗi khi tự động trích xuất người dùng được mention:', e);
    }

    return Array.from(userIds);
}

// =========================================================================
// 2. EMAIL TEMPLATES (Responsive, TSOL Branded)
// =========================================================================

export async function sendMentionEmail(params: {
    targetEmail: string;
    targetName: string;
    senderName: string;
    senderId?: string;
    snippet: string;
    isComment: boolean;
    postId: string;
    commentId?: string;
}) {
    try {
        const appUrl = process.env.NEXTAUTH_URL || 'https://inside.tsol.vn';
        const link = params.commentId
            ? `${appUrl}/leaderboard?postId=${params.postId}&commentId=${params.commentId}`
            : `${appUrl}/leaderboard?postId=${params.postId}`;

        const contextDesc = params.isComment
            ? 'vừa nhắc đến bạn trong một bình luận trên Mạng xã hội thi đua.'
            : 'vừa nhắc đến bạn trong bài viết trên Bảng Vinh Danh & Thi Đua.';

        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; color: #1e293b;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 14px; background: #ecfdf5; border-radius: 50%; color: #059669; font-size: 32px; line-height: 1;">📢</div>
                    <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px; font-weight: 800;">Bạn vừa được nhắc tên trên Bảng Vinh Danh!</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Mạng Xã Hội Thi Đua & Vinh Danh Nội Bộ TSOL</p>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 18px; border-left: 4px solid #10b981; margin-bottom: 20px;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 8px;">
                        ${params.senderName} ${contextDesc}
                    </div>
                    <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap; font-style: italic; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        &ldquo;${params.snippet}&rdquo;
                    </div>
                </div>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="${link}" style="display: inline-block; padding: 12px 28px; background: #059669; color: #ffffff; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                        👉 Xem Thảo Luận & Tương Tác Ngay
                    </a>
                </div>
                <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    Email này được gửi tự động từ Hệ thống Thi Đua & Bảng Vinh Danh Nội Bộ TSOL.
                </div>
            </div>
        `;

        await sendEmailWithTracking({
            to: params.targetEmail,
            subject: `📢 ${params.senderName} vừa nhắc đến bạn trên Mạng xã hội thi đua`,
            htmlBody: emailHtml,
            senderId: params.senderId
        });
    } catch (err) {
        console.warn('Lỗi gửi email mention:', err);
    }
}

export async function sendCommentActivityEmail(params: {
    targetEmail: string;
    targetName: string;
    senderName: string;
    senderId?: string;
    commentSnippet: string;
    reasonText: string;
    postId: string;
    commentId?: string;
}) {
    try {
        const appUrl = process.env.NEXTAUTH_URL || 'https://inside.tsol.vn';
        const link = params.commentId
            ? `${appUrl}/leaderboard?postId=${params.postId}&commentId=${params.commentId}`
            : `${appUrl}/leaderboard?postId=${params.postId}`;

        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; color: #1e293b;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 14px; background: #eff6ff; border-radius: 50%; color: #0284c7; font-size: 32px; line-height: 1;">💬</div>
                    <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px; font-weight: 800;">Bình luận liên quan mới</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Mạng Xã Hội Thi Đua & Vinh Danh Nội Bộ TSOL</p>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 18px; border-left: 4px solid #0284c7; margin-bottom: 20px;">
                    <div style="font-weight: 700; color: #0f172a; font-size: 14px; margin-bottom: 8px;">
                        ${params.senderName} ${params.reasonText}:
                    </div>
                    <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap; font-style: italic; background: #ffffff; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
                        &ldquo;${params.commentSnippet}&rdquo;
                    </div>
                </div>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="${link}" style="display: inline-block; padding: 12px 28px; background: #0284c7; color: #ffffff; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);">
                        👉 Xem Chi Tiết Thảo Luận
                    </a>
                </div>
                <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    Email này được gửi tự động từ Hệ thống Thi Đua & Bảng Vinh Danh Nội Bộ TSOL.
                </div>
            </div>
        `;

        await sendEmailWithTracking({
            to: params.targetEmail,
            subject: `💬 ${params.senderName} ${params.reasonText}`,
            htmlBody: emailHtml,
            senderId: params.senderId
        });
    } catch (err) {
        console.warn('Lỗi gửi email bình luận liên quan:', err);
    }
}

export async function sendCompetitionGroupEmail(params: {
    targetEmail: string;
    targetName: string;
    groupName: string;
    slogan?: string | null;
    targetRevenue?: number;
    role: 'LEADER' | 'MEMBER';
    senderName?: string;
    senderId?: string;
}) {
    try {
        const appUrl = process.env.NEXTAUTH_URL || 'https://inside.tsol.vn';
        const link = `${appUrl}/leaderboard?tab=team`;
        const roleLabel = params.role === 'LEADER' ? '👑 ĐỘI TRƯỞNG' : '🛡️ CHIẾN BINH THÀNH VIÊN';
        const formattedTarget = params.targetRevenue
            ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(params.targetRevenue)
            : '0 ₫';

        const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; color: #1e293b;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="display: inline-block; padding: 14px; background: #fef3c7; border-radius: 50%; color: #d97706; font-size: 36px; line-height: 1;">🏆</div>
                    <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px; font-weight: 800;">Chào mừng bạn gia nhập Nhóm Thi Đua!</h2>
                    <p style="color: #64748b; font-size: 13px; margin: 0;">Bảng Vinh Danh Chiến Binh & Thi Đua Nội Bộ TSOL</p>
                </div>
                
                <div style="background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); border-radius: 14px; padding: 22px; color: #ffffff; text-align: center; margin-bottom: 20px; box-shadow: 0 4px 16px rgba(6, 78, 59, 0.25);">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #6ee7b7; margin-bottom: 6px;">
                        ĐỘI THI ĐUA CHÍNH THỨC
                    </div>
                    <div style="font-size: 24px; font-weight: 900; color: #ffffff; margin-bottom: 8px; letter-spacing: 0.5px;">
                        ${params.groupName.toUpperCase()}
                    </div>
                    ${params.slogan ? `<div style="font-size: 13px; color: #e2e8f0; font-style: italic; margin-bottom: 14px;">&ldquo;${params.slogan}&rdquo;</div>` : ''}
                    <div style="display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.22); border-radius: 20px; font-size: 12px; font-weight: 800; color: #ffffff; border: 1px solid rgba(255,255,255,0.3);">
                        ${roleLabel}
                    </div>
                </div>

                <div style="background: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 13px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                        <span style="color: #64748b;">Mục tiêu doanh số kỳ:</span>
                        <strong style="color: #059669; font-size: 15px; font-weight: 800;">${formattedTarget}</strong>
                    </div>
                    <div style="font-size: 13px; color: #475569; line-height: 1.6;">
                        Chúc bạn và đồng đội sát cánh kề vai, bứt phá doanh số rực rỡ và giành ngôi vị Quán Quân kỳ này! 🔥🚀
                    </div>
                </div>

                <div style="text-align: center; margin-top: 24px;">
                    <a href="${link}" style="display: inline-block; padding: 12px 28px; background: #059669; color: #ffffff; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);">
                        👉 Vào Bảng Vinh Danh & Xem Đội Của Bạn
                    </a>
                </div>
                <div style="margin-top: 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                    Email này được gửi tự động từ Hệ thống Thi Đua & Bảng Vinh Danh Nội Bộ TSOL.
                </div>
            </div>
        `;

        await sendEmailWithTracking({
            to: params.targetEmail,
            subject: `🏆 Bạn vừa được thêm vào Nhóm Thi Đua "${params.groupName}" | T-SOLUTION`,
            htmlBody: emailHtml,
            senderId: params.senderId
        });
    } catch (err) {
        console.warn('Lỗi gửi email nhóm thi đua:', err);
    }
}

// =========================================================================
// 3. HIGH-LEVEL DISPATCHERS FOR LEADERBOARD MODULE
// =========================================================================

/**
 * Dispatch notifications when a new comment is posted
 * Handles: Mentions in comment, Parent comment reply, Post author, and thread participants
 */
export async function dispatchCommentNotifications(params: {
    postId: string;
    commentId: string;
    content: string;
    parentId?: string | null;
    explicitMentionedUserIds?: string[];
    currentUser: { id: string; name?: string | null; email?: string | null };
}) {
    const { postId, commentId, content, parentId, explicitMentionedUserIds = [], currentUser } = params;
    const commentSnippet = content.length > 80 ? content.slice(0, 80) + '...' : content;
    const notifiedUserIds = new Set<string>([currentUser.id]);

    try {
        // Fetch post details
        const post = await prisma.leaderboardPost.findUnique({
            where: { id: postId },
            select: {
                id: true,
                authorId: true,
                content: true,
                groupId: true,
                author: { select: { id: true, name: true, email: true } }
            }
        });

        if (!post) return;

        // Fetch parent comment if reply
        let parentComment: any = null;
        if (parentId) {
            parentComment = await prisma.leaderboardComment.findUnique({
                where: { id: parentId },
                select: {
                    id: true,
                    authorId: true,
                    content: true,
                    author: { select: { id: true, name: true, email: true } }
                }
            });
        }

        // 1. MENTIONED USERS IN COMMENT
        const allMentionedIds = await resolveMentionedUserIds(content, explicitMentionedUserIds);
        const validMentionedIds = allMentionedIds.filter(id => !notifiedUserIds.has(id));

        for (const targetUserId of validMentionedIds) {
            notifiedUserIds.add(targetUserId);

            // Record mention in DB
            try {
                const mentionId = 'cm' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
                await prisma.leaderboardMention.create({
                    data: {
                        id: mentionId,
                        commentId,
                        mentionedUserId: targetUserId
                    }
                });
            } catch (e) {
                console.warn('Failed to record comment mention:', e);
            }

            // In-app & Web Push Notification
            await createNotification(
                targetUserId,
                parentId ? '💬 Bạn được nhắc đến trong câu trả lời' : '💬 Bạn được nhắc đến trong bình luận',
                `${currentUser.name || 'Đồng nghiệp'} vừa nhắc đến bạn: "${commentSnippet}"`,
                'SUCCESS',
                `/leaderboard?postId=${postId}&commentId=${commentId}`
            );

            // Email alert
            prisma.user.findUnique({
                where: { id: targetUserId },
                select: { email: true, name: true }
            }).then(u => {
                if (u?.email) {
                    sendMentionEmail({
                        targetEmail: u.email,
                        targetName: u.name || 'Đồng nghiệp',
                        senderName: currentUser.name || 'Đồng nghiệp',
                        senderId: currentUser.id,
                        snippet: content,
                        isComment: true,
                        postId,
                        commentId
                    });
                }
            }).catch(e => console.warn('Email fetch error:', e));
        }

        // 2. PARENT COMMENT AUTHOR (if reply to a specific comment)
        if (parentComment?.authorId && !notifiedUserIds.has(parentComment.authorId)) {
            notifiedUserIds.add(parentComment.authorId);

            await createNotification(
                parentComment.authorId,
                '💬 Phản hồi mới cho bình luận của bạn',
                `${currentUser.name || 'Đồng nghiệp'} vừa trả lời bình luận của bạn: "${commentSnippet}"`,
                'INFO',
                `/leaderboard?postId=${postId}&commentId=${commentId}`
            );

            if (parentComment.author?.email) {
                sendCommentActivityEmail({
                    targetEmail: parentComment.author.email,
                    targetName: parentComment.author.name || 'Đồng nghiệp',
                    senderName: currentUser.name || 'Đồng nghiệp',
                    senderId: currentUser.id,
                    commentSnippet: content,
                    reasonText: 'vừa trả lời bình luận của bạn',
                    postId,
                    commentId
                });
            }
        }

        // 3. POST AUTHOR (if not already notified)
        if (post.authorId && !notifiedUserIds.has(post.authorId)) {
            notifiedUserIds.add(post.authorId);

            await createNotification(
                post.authorId,
                '💬 Bình luận mới trên bài viết của bạn',
                `${currentUser.name || 'Đồng nghiệp'} vừa bình luận: "${commentSnippet}"`,
                'INFO',
                `/leaderboard?postId=${postId}&commentId=${commentId}`
            );

            if (post.author?.email) {
                sendCommentActivityEmail({
                    targetEmail: post.author.email,
                    targetName: post.author.name || 'Đồng nghiệp',
                    senderName: currentUser.name || 'Đồng nghiệp',
                    senderId: currentUser.id,
                    commentSnippet: content,
                    reasonText: 'vừa bình luận trên bài viết của bạn',
                    postId,
                    commentId
                });
            }
        }

        // 4. THREAD PARTICIPANTS (Other staff who commented previously on this post)
        try {
            const previousCommenters = await prisma.leaderboardComment.findMany({
                where: {
                    postId,
                    authorId: { notIn: Array.from(notifiedUserIds) }
                },
                select: {
                    authorId: true,
                    author: { select: { id: true, name: true, email: true } }
                },
                distinct: ['authorId']
            });

            for (const p of previousCommenters) {
                notifiedUserIds.add(p.authorId);

                await createNotification(
                    p.authorId,
                    '💬 Hoạt động mới trong thảo luận bạn quan tâm',
                    `${currentUser.name || 'Đồng nghiệp'} vừa thêm bình luận mới vào thảo luận: "${commentSnippet}"`,
                    'INFO',
                    `/leaderboard?postId=${postId}&commentId=${commentId}`
                );
            }
        } catch (partErr) {
            console.warn('Lỗi gửi thông báo cho thành viên tham gia thảo luận:', partErr);
        }

    } catch (err) {
        console.error('Lỗi dispatchCommentNotifications:', err);
    }
}

/**
 * Dispatch notifications when a new post is created
 * Handles: Mentions in post and competition group member announcements
 */
export async function dispatchPostNotifications(params: {
    postId: string;
    content: string;
    groupId?: string | null;
    explicitMentionedUserIds?: string[];
    currentUser: { id: string; name?: string | null; email?: string | null };
}) {
    const { postId, content, groupId, explicitMentionedUserIds = [], currentUser } = params;
    const notifiedUserIds = new Set<string>([currentUser.id]);

    try {
        // 1. MENTIONED USERS IN POST
        const allMentionedIds = await resolveMentionedUserIds(content, explicitMentionedUserIds);
        const validMentionedIds = allMentionedIds.filter(id => !notifiedUserIds.has(id));

        for (const targetUserId of validMentionedIds) {
            notifiedUserIds.add(targetUserId);

            // Record mention in DB
            try {
                const mentionId = 'cm' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
                await prisma.leaderboardMention.create({
                    data: {
                        id: mentionId,
                        postId,
                        mentionedUserId: targetUserId
                    }
                });
            } catch (e) {
                console.warn('Failed to record post mention:', e);
            }

            // In-app & Web Push Notification
            await createNotification(
                targetUserId,
                '🎉 Bạn được nhắc đến trên Bảng Vinh Danh!',
                `${currentUser.name || 'Một đồng nghiệp'} vừa nhắc đến bạn trong bài viết trên Mạng xã hội thi đua.`,
                'SUCCESS',
                `/leaderboard?postId=${postId}`
            );

            // Email
            prisma.user.findUnique({
                where: { id: targetUserId },
                select: { email: true, name: true }
            }).then(u => {
                if (u?.email) {
                    sendMentionEmail({
                        targetEmail: u.email,
                        targetName: u.name || 'Đồng nghiệp',
                        senderName: currentUser.name || 'Đồng nghiệp',
                        senderId: currentUser.id,
                        snippet: content,
                        isComment: false,
                        postId
                    });
                }
            }).catch(e => console.warn('Email fetch error:', e));
        }

        // 2. COMPETITION GROUP MEMBERS (if post is tagged to a team)
        if (groupId) {
            const groupMembers = await prisma.competitionGroupMember.findMany({
                where: {
                    groupId,
                    userId: { notIn: Array.from(notifiedUserIds) }
                },
                include: {
                    group: { select: { name: true } }
                }
            });

            for (const gm of groupMembers) {
                notifiedUserIds.add(gm.userId);

                await createNotification(
                    gm.userId,
                    `🛡️ Bài viết mới về Nhóm Thi Đua "${gm.group?.name || 'của bạn'}"`,
                    `${currentUser.name || 'Đồng nghiệp'} vừa chia sẻ bài viết mới liên quan đến nhóm thi đua của bạn trên Bảng Vinh Danh. Cùng vào xem và cổ vũ nhé! 🔥`,
                    'INFO',
                    `/leaderboard?postId=${postId}`
                );
            }
        }
    } catch (err) {
        console.error('Lỗi dispatchPostNotifications:', err);
    }
}

/**
 * Dispatch notifications when users are added to a competition group
 * or assigned as group leader (on create or update)
 */
export async function dispatchGroupMemberNotifications(params: {
    groupId: string;
    groupName: string;
    slogan?: string | null;
    targetRevenue?: number;
    leaderId?: string | null;
    targetUserIds: string[];
    isNewlyCreated?: boolean;
    currentUser: { id: string; name?: string | null };
}) {
    const { groupId, groupName, slogan, targetRevenue, leaderId, targetUserIds, isNewlyCreated = false, currentUser } = params;

    for (const userId of targetUserIds) {
        if (userId === currentUser.id) continue;

        const role = userId === leaderId ? 'LEADER' : 'MEMBER';
        const isLeader = role === 'LEADER';

        let notifTitle = '';
        let notifMessage = '';

        if (isLeader) {
            notifTitle = `👑 Bạn được bổ nhiệm làm Đội Trưởng: ${groupName}`;
            notifMessage = isNewlyCreated
                ? `Chúc mừng bạn! Bạn đã được bổ nhiệm làm Đội Trưởng đội thi đua "${groupName}". Slogan: "${slogan || 'Quyết chiến quyết thắng!'}"`
                : `Bạn vừa được bổ nhiệm làm Đội Trưởng đội thi đua "${groupName}". Hãy dẫn dắt các chiến binh vươn tới vị trí Quán quân! 🏆`;
        } else {
            notifTitle = isNewlyCreated
                ? `🛡️ Bạn vừa được thêm vào Nhóm Thi Đua mới!`
                : `🛡️ Bạn vừa được thêm vào Nhóm Thi Đua: ${groupName}`;
            notifMessage = isNewlyCreated
                ? `Chào mừng bạn gia nhập đội thi đua "${groupName}"! Slogan: "${slogan || 'Quyết chiến quyết thắng!'}" Cùng đồng đội bứt phá doanh số! 🔥`
                : `Bạn vừa được thêm vào đội thi đua "${groupName}". Cùng đồng đội tăng tốc về đích và giành cúp Quán Quân! 🚀`;
        }

        // In-app & Web Push Notification
        await createNotification(
            userId,
            notifTitle,
            notifMessage,
            'SUCCESS',
            `/leaderboard?tab=team`
        );

        // Branded Welcome Email
        prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true }
        }).then(u => {
            if (u?.email) {
                sendCompetitionGroupEmail({
                    targetEmail: u.email,
                    targetName: u.name || 'Chiến binh',
                    groupName,
                    slogan,
                    targetRevenue,
                    role,
                    senderName: currentUser.name || 'Ban Quản Trị',
                    senderId: currentUser.id
                });
            }
        }).catch(e => console.warn('Email fetch error for group member:', e));
    }
}

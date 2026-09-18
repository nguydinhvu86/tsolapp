'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createNotification } from '@/app/notifications/actions';
import { sendEmailWithTracking } from '@/lib/mailer';
import { revalidatePath } from 'next/cache';

export type TimeRangeKey = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';
export type CriteriaKey = 'REVENUE' | 'CUSTOMERS' | 'LEADS' | 'ESTIMATES' | 'CONVERSION_RATE';
export type ReactionEmoji = 'HEART' | 'FIRE' | 'CLAP' | 'CELEBRATE' | 'ROCKET' | 'TROPHY';

// Helper: Calculate Date Range
function getDateBounds(timeRange: TimeRangeKey, customStart?: string, customEnd?: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    let prevStart = new Date(now);
    let prevEnd = new Date(now);

    switch (timeRange) {
        case 'TODAY': {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            // Previous day
            prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 1);
            prevEnd = new Date(end);
            prevEnd.setDate(prevEnd.getDate() - 1);
            break;
        }
        case 'THIS_WEEK': {
            const dayOfWeek = now.getDay() || 7; // 1 = Monday, 7 = Sunday
            start.setDate(now.getDate() - dayOfWeek + 1);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            // Previous week
            prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 7);
            prevEnd = new Date(end);
            prevEnd.setDate(prevEnd.getDate() - 7);
            break;
        }
        case 'THIS_MONTH': {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            // Previous month
            prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            break;
        }
        case 'THIS_QUARTER': {
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
            // Previous quarter
            prevStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1, 0, 0, 0, 0);
            prevEnd = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
            break;
        }
        case 'THIS_YEAR': {
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
            // Previous year
            prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
            prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
            break;
        }
        case 'CUSTOM': {
            if (customStart) start = new Date(customStart);
            if (customEnd) end = new Date(customEnd);
            end.setHours(23, 59, 59, 999);
            const duration = end.getTime() - start.getTime();
            prevEnd = new Date(start.getTime() - 1);
            prevStart = new Date(prevEnd.getTime() - duration);
            break;
        }
    }

    return { start, end, prevStart, prevEnd };
}

// 1. GET LEADERBOARD STATS
export async function getLeaderboardData(params: {
    criteria?: CriteriaKey;
    timeRange?: TimeRangeKey;
    customStart?: string;
    customEnd?: string;
}) {
    const criteria = params.criteria || 'REVENUE';
    const timeRange = params.timeRange || 'THIS_MONTH';
    const { start, end, prevStart, prevEnd } = getDateBounds(timeRange, params.customStart, params.customEnd);

    // Get all active users
    const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            employeeProfile: {
                select: {
                    department: true,
                    position: true
                }
            }
        }
    });

    // Helper to calculate user scores for a specific timeframe
    async function calculateUserScores(periodStart: Date, periodEnd: Date) {
        // Query relevant metrics in parallel
        const [
            invoices,
            payments,
            customers,
            leads,
            estimates
        ] = await Promise.all([
            // Invoices in period
            prisma.salesInvoice.findMany({
                where: {
                    createdAt: { gte: periodStart, lte: periodEnd },
                    status: { in: ['ISSUED', 'PARTIAL_PAID', 'PAID'] }
                },
                select: {
                    id: true,
                    totalAmount: true,
                    creatorId: true,
                    salespersonId: true
                }
            }),
            // Payments in period
            prisma.salesPayment.findMany({
                where: {
                    date: { gte: periodStart, lte: periodEnd },
                    status: { not: 'CANCELLED' }
                },
                select: {
                    id: true,
                    amount: true,
                    creatorId: true
                }
            }),
            // Customers created / managed in period
            prisma.customer.findMany({
                where: {
                    createdAt: { gte: periodStart, lte: periodEnd }
                },
                select: {
                    id: true,
                    managers: { select: { id: true } }
                }
            }),
            // Leads in period
            prisma.lead.findMany({
                where: {
                    createdAt: { gte: periodStart, lte: periodEnd }
                },
                select: {
                    id: true,
                    status: true,
                    estimatedValue: true,
                    creatorId: true,
                    assignedToId: true,
                    assignees: { select: { userId: true } }
                }
            }),
            // Estimates in period
            prisma.salesEstimate.findMany({
                where: {
                    createdAt: { gte: periodStart, lte: periodEnd }
                },
                select: {
                    id: true,
                    totalAmount: true,
                    status: true,
                    creatorId: true,
                    salespersonId: true
                }
            })
        ]);

        const userScoreMap: Record<string, {
            revenue: number;
            invoicesCount: number;
            customersCount: number;
            leadsCount: number;
            leadsWonCount: number;
            pipelineValue: number;
            estimatesCount: number;
            estimatesAcceptedCount: number;
            estimatesValue: number;
            conversionRate: number;
        }> = {};

        // Initialize user map
        users.forEach(u => {
            userScoreMap[u.id] = {
                revenue: 0,
                invoicesCount: 0,
                customersCount: 0,
                leadsCount: 0,
                leadsWonCount: 0,
                pipelineValue: 0,
                estimatesCount: 0,
                estimatesAcceptedCount: 0,
                estimatesValue: 0,
                conversionRate: 0
            };
        });

        // 1. Process Revenue (from Invoices & Payments)
        invoices.forEach(inv => {
            const userId = inv.salespersonId || inv.creatorId;
            if (userId && userScoreMap[userId]) {
                userScoreMap[userId].revenue += (inv.totalAmount || 0);
                userScoreMap[userId].invoicesCount += 1;
            }
        });

        // 2. Process Customers
        customers.forEach(c => {
            if (c.managers && c.managers.length > 0) {
                c.managers.forEach(m => {
                    if (userScoreMap[m.id]) {
                        userScoreMap[m.id].customersCount += 1;
                    }
                });
            }
        });

        // 3. Process Leads & Conversion
        leads.forEach(l => {
            const userIds = new Set<string>();
            if (l.creatorId) userIds.add(l.creatorId);
            if (l.assignedToId) userIds.add(l.assignedToId);
            if (l.assignees) (l.assignees as any[]).forEach(a => userIds.add(a.userId));

            const isWon = ['WON', 'CONVERTED', 'DEAL_WON', 'SUCCESS'].includes((l.status || '').toUpperCase());

            userIds.forEach(uid => {
                if (userScoreMap[uid]) {
                    userScoreMap[uid].leadsCount += 1;
                    userScoreMap[uid].pipelineValue += (l.estimatedValue || 0);
                    if (isWon) {
                        userScoreMap[uid].leadsWonCount += 1;
                    }
                }
            });
        });

        // 4. Process Estimates
        estimates.forEach(est => {
            const userId = est.salespersonId || est.creatorId;
            const isAccepted = ['ACCEPTED', 'APPROVED', 'ORDER_CREATED'].includes((est.status || '').toUpperCase());
            if (userId && userScoreMap[userId]) {
                userScoreMap[userId].estimatesCount += 1;
                userScoreMap[userId].estimatesValue += (est.totalAmount || 0);
                if (isAccepted) {
                    userScoreMap[userId].estimatesAcceptedCount += 1;
                }
            }
        });

        // Compute conversion rates
        Object.keys(userScoreMap).forEach(uid => {
            const item = userScoreMap[uid];
            if (item.leadsCount > 0) {
                item.conversionRate = Math.round((item.leadsWonCount / item.leadsCount) * 1000) / 10; // e.g. 75.5%
            } else if (item.estimatesCount > 0) {
                item.conversionRate = Math.round((item.estimatesAcceptedCount / item.estimatesCount) * 1000) / 10;
            }
        });

        return userScoreMap;
    }

    const [currentScores, prevScores] = await Promise.all([
        calculateUserScores(start, end),
        calculateUserScores(prevStart, prevEnd)
    ]);

    // Rank helper
    const getCriteriaScore = (item: any, crit: CriteriaKey) => {
        switch (crit) {
            case 'REVENUE': return item.revenue;
            case 'CUSTOMERS': return item.customersCount;
            case 'LEADS': return item.leadsCount;
            case 'ESTIMATES': return item.estimatesCount;
            case 'CONVERSION_RATE': return item.conversionRate;
            default: return item.revenue;
        }
    };

    // Calculate previous period rankings to determine rank movement (delta)
    const prevRankedList = users
        .map(u => ({ id: u.id, score: getCriteriaScore(prevScores[u.id] || {}, criteria) }))
        .sort((a, b) => b.score - a.score);

    const prevRankMap: Record<string, number> = {};
    prevRankedList.forEach((item, index) => {
        prevRankMap[item.id] = index + 1;
    });

    // Build current full leaderboard
    const rankedUsers = users.map(user => {
        const stats = currentScores[user.id] || {
            revenue: 0,
            invoicesCount: 0,
            customersCount: 0,
            leadsCount: 0,
            leadsWonCount: 0,
            pipelineValue: 0,
            estimatesCount: 0,
            estimatesAcceptedCount: 0,
            estimatesValue: 0,
            conversionRate: 0
        };

        const score = getCriteriaScore(stats, criteria);
        return {
            user,
            stats,
            score,
            prevRank: prevRankMap[user.id] || 999
        };
    });

    // Sort by primary score descending
    rankedUsers.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tie breaker 1: Revenue
        if (b.stats.revenue !== a.stats.revenue) return b.stats.revenue - a.stats.revenue;
        // Tie breaker 2: Leads won
        return b.stats.leadsWonCount - a.stats.leadsWonCount;
    });

    // Max score for relative percentage bars
    const maxScore = rankedUsers[0]?.score || 1;

    // Attach rank positions, deltas, and badges
    const leaderboard = rankedUsers.map((item, index) => {
        const rank = index + 1;
        const delta = item.prevRank - rank; // positive = moved up, negative = dropped

        let badge = '';
        if (rank === 1) badge = '👑 Quán Quân';
        else if (rank === 2) badge = '🥈 Á Quân 1';
        else if (rank === 3) badge = '🥉 Á Quân 2';
        else if (item.stats.revenue >= 100000000) badge = '💎 Doanh Thu Khủng';
        else if (item.stats.conversionRate >= 80 && item.stats.leadsCount >= 3) badge = '🎯 Bách Phát Bách Trúng';
        else if (item.stats.leadsCount >= 10) badge = '🔥 Thợ Săn Khách Hàng';
        else if (delta >= 2) badge = '🚀 Bứt Phá';

        return {
            rank,
            user: item.user,
            stats: item.stats,
            score: item.score,
            percentageOfTop: Math.min(100, Math.round((item.score / Math.max(1, maxScore)) * 100)),
            delta,
            badge
        };
    });

    // Summary totals for the timeframe
    const totalRevenue = Object.values(currentScores).reduce((acc, cur) => acc + cur.revenue, 0);
    const totalCustomers = Object.values(currentScores).reduce((acc, cur) => acc + cur.customersCount, 0);
    const totalLeads = Object.values(currentScores).reduce((acc, cur) => acc + cur.leadsCount, 0);
    const totalEstimates = Object.values(currentScores).reduce((acc, cur) => acc + cur.estimatesCount, 0);

    return {
        criteria,
        timeRange,
        dateRange: {
            start: start.toISOString(),
            end: end.toISOString()
        },
        summary: {
            totalRevenue,
            totalCustomers,
            totalLeads,
            totalEstimates,
            activeMembers: users.length
        },
        topThree: leaderboard.slice(0, 3),
        fullList: leaderboard
    };
}

function genId(): string {
    return 'cm' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// 2. GET SOCIAL FEED
export async function getSocialFeed(params?: { page?: number; limit?: number }) {
    const page = params?.page || 1;
    const limit = params?.limit || 20;
    const skip = (page - 1) * limit;

    let formattedPosts: any[] = [];
    let total = 0;
    let ormSuccess = false;

    if (prisma.leaderboardPost) {
        try {
            const [posts, totalCount] = await Promise.all([
                prisma.leaderboardPost.findMany({
                    skip,
                    take: limit,
                    orderBy: [
                        { isPinned: 'desc' },
                        { createdAt: 'desc' }
                    ],
                    include: {
                        author: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                email: true,
                                role: true,
                                employeeProfile: {
                                    select: {
                                        department: true,
                                        position: true
                                    }
                                }
                            }
                        },
                        reactions: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        avatar: true
                                    }
                                }
                            }
                        },
                        comments: {
                            orderBy: { createdAt: 'asc' },
                            include: {
                                author: {
                                    select: {
                                        id: true,
                                        name: true,
                                        avatar: true
                                    }
                                },
                                mentions: {
                                    include: {
                                        mentionedUser: {
                                            select: {
                                                id: true,
                                                name: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        mentions: {
                            include: {
                                mentionedUser: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.leaderboardPost.count()
            ]);
            total = totalCount;
            formattedPosts = posts.map((post: any) => {
                let parsedImages: string[] = [];
                if (post.images) {
                    try {
                        parsedImages = JSON.parse(post.images);
                    } catch (e) {
                        if (typeof post.images === 'string') parsedImages = [post.images];
                    }
                }

                let parsedMetadata: any = null;
                if (post.metadata) {
                    try {
                        parsedMetadata = JSON.parse(post.metadata);
                    } catch (e) {}
                }

                const reactionCounts: Record<string, { count: number; users: { id: string; name: string; avatar?: string | null }[] }> = {};
                (post.reactions || []).forEach((r: any) => {
                    if (!reactionCounts[r.emoji]) {
                        reactionCounts[r.emoji] = { count: 0, users: [] };
                    }
                    reactionCounts[r.emoji].count += 1;
                    reactionCounts[r.emoji].users.push(r.user);
                });

                return {
                    ...post,
                    images: parsedImages,
                    metadata: parsedMetadata,
                    reactionCounts,
                    commentsCount: (post.comments || []).length
                };
            });
            ormSuccess = true;
        } catch (err) {
            console.warn('Prisma ORM failed on leaderboardPost, using SQL fallback:', err);
        }
    }

    if (!ormSuccess) {
        // Fallback SQL query with exact case table names
        try {
            const [rawPosts, countRes] = (await Promise.all([
                prisma.$queryRawUnsafe(`
                    SELECT p.*, 
                           u.name as authorName, u.avatar as authorAvatar, u.email as authorEmail, u.role as authorRole,
                           ep.department as authorDepartment, ep.position as authorPosition
                    FROM \`LeaderboardPost\` p
                    LEFT JOIN \`User\` u ON p.authorId = u.id
                    LEFT JOIN \`EmployeeProfile\` ep ON u.id = ep.userId
                    ORDER BY p.isPinned DESC, p.createdAt DESC
                    LIMIT ${limit} OFFSET ${skip}
                `),
                prisma.$queryRawUnsafe(`SELECT COUNT(*) as total FROM \`LeaderboardPost\``)
            ])) as [any[], any[]];

            total = Number(countRes[0]?.total || 0);

            const postIds = rawPosts.map((p: any) => p.id);
            let reactionsByPost: Record<string, any[]> = {};
            let commentsByPost: Record<string, any[]> = {};

            if (postIds.length > 0) {
                const inList = postIds.map((id: string) => `'${id}'`).join(',');
                const [rawReactions, rawComments] = (await Promise.all([
                    prisma.$queryRawUnsafe(`
                        SELECT r.*, u.name as userName, u.avatar as userAvatar
                        FROM \`LeaderboardReaction\` r
                        LEFT JOIN \`User\` u ON r.userId = u.id
                        WHERE r.postId IN (${inList})
                    `),
                    prisma.$queryRawUnsafe(`
                        SELECT c.*, u.name as authorName, u.avatar as authorAvatar
                        FROM \`LeaderboardComment\` c
                        LEFT JOIN \`User\` u ON c.authorId = u.id
                        WHERE c.postId IN (${inList})
                        ORDER BY c.createdAt ASC
                    `)
                ])) as [any[], any[]];

                rawReactions.forEach((r: any) => {
                    if (!reactionsByPost[r.postId]) reactionsByPost[r.postId] = [];
                    reactionsByPost[r.postId].push({
                        id: r.id,
                        emoji: r.emoji,
                        user: { id: r.userId, name: r.userName, avatar: r.userAvatar }
                    });
                });

                rawComments.forEach((c: any) => {
                    if (!commentsByPost[c.postId]) commentsByPost[c.postId] = [];
                    commentsByPost[c.postId].push({
                        id: c.id,
                        content: c.content,
                        createdAt: c.createdAt,
                        parentId: c.parentId,
                        image: c.image,
                        author: { id: c.authorId, name: c.authorName, avatar: c.authorAvatar },
                        mentions: []
                    });
                });
            }

            formattedPosts = rawPosts.map((post: any) => {
                let parsedImages: string[] = [];
                if (post.images) {
                    try {
                        parsedImages = JSON.parse(post.images);
                    } catch (e) {
                        if (typeof post.images === 'string') parsedImages = [post.images];
                    }
                }

                let parsedMetadata: any = null;
                if (post.metadata) {
                    try {
                        parsedMetadata = JSON.parse(post.metadata);
                    } catch (e) {}
                }

                const postReactions = reactionsByPost[post.id] || [];
                const postComments = commentsByPost[post.id] || [];
                const reactionCounts: Record<string, { count: number; users: { id: string; name: string; avatar?: string | null }[] }> = {};

                postReactions.forEach((r: any) => {
                    if (!reactionCounts[r.emoji]) {
                        reactionCounts[r.emoji] = { count: 0, users: [] };
                    }
                    reactionCounts[r.emoji].count += 1;
                    reactionCounts[r.emoji].users.push(r.user);
                });

                return {
                    id: post.id,
                    authorId: post.authorId,
                    content: post.content,
                    images: parsedImages,
                    type: post.type,
                    isPinned: Boolean(post.isPinned),
                    metadata: parsedMetadata,
                    createdAt: post.createdAt,
                    updatedAt: post.updatedAt,
                    author: {
                        id: post.authorId,
                        name: post.authorName,
                        avatar: post.authorAvatar,
                        email: post.authorEmail,
                        role: post.authorRole,
                        employeeProfile: post.authorDepartment ? {
                            department: post.authorDepartment,
                            position: post.authorPosition
                        } : null
                    },
                    reactions: postReactions,
                    comments: postComments,
                    mentions: [],
                    reactionCounts,
                    commentsCount: postComments.length
                };
            });
        } catch (sqlErr) {
            console.error('SQL fallback failed for social feed:', sqlErr);
        }
    }

    return {
        posts: formattedPosts,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
        }
    };
}

// 3. CREATE SOCIAL POST
export async function createSocialPost(data: {
    content: string;
    images?: string[];
    mentionedUserIds?: string[];
    type?: string;
    metadata?: any;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
        throw new Error('Vui lòng đăng nhập để đăng bài.');
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, email: true, avatar: true }
    });

    if (!currentUser) throw new Error('Không tìm thấy thông tin tài khoản.');

    const imagesJson = data.images && data.images.length > 0 ? JSON.stringify(data.images) : null;
    const metadataJson = data.metadata ? JSON.stringify(data.metadata) : null;
    const postId = genId();
    const postType = data.type || 'USER_POST';

    // 1. Create post (Try Prisma ORM, fallback to SQL)
    let newPost: any = null;
    if (prisma.leaderboardPost) {
        try {
            newPost = await prisma.leaderboardPost.create({
                data: {
                    id: postId,
                    authorId: currentUser.id,
                    content: data.content,
                    images: imagesJson,
                    type: postType,
                    metadata: metadataJson,
                }
            });
        } catch (e) {
            newPost = null;
        }
    }

    if (!newPost) {
        const escapedContent = data.content.replace(/'/g, "\\'");
        const escapedImages = imagesJson ? `'${imagesJson.replace(/'/g, "\\'")}'` : 'NULL';
        const escapedMeta = metadataJson ? `'${metadataJson.replace(/'/g, "\\'")}'` : 'NULL';

        await prisma.$executeRawUnsafe(`
            INSERT INTO \`LeaderboardPost\` (id, authorId, content, images, type, isPinned, metadata, createdAt, updatedAt)
            VALUES ('${postId}', '${currentUser.id}', '${escapedContent}', ${escapedImages}, '${postType}', 0, ${escapedMeta}, NOW(3), NOW(3))
        `);
        newPost = { id: postId, authorId: currentUser.id, content: data.content };
    }

    // 2. Handle mentions
    const mentionedIds = Array.from(new Set(data.mentionedUserIds || []));
    if (mentionedIds.length > 0) {
        await Promise.all(
            mentionedIds.map(async (targetUserId) => {
                if (targetUserId === currentUser.id) return; // Don't notify self

                const mentionId = genId();
                if (prisma.leaderboardMention) {
                    try {
                        await prisma.leaderboardMention.create({
                            data: {
                                id: mentionId,
                                postId: newPost.id,
                                mentionedUserId: targetUserId
                            }
                        });
                    } catch (e) {
                        await prisma.$executeRawUnsafe(`
                            INSERT INTO \`LeaderboardMention\` (id, postId, mentionedUserId, createdAt)
                            VALUES ('${mentionId}', '${newPost.id}', '${targetUserId}', NOW(3))
                        `);
                    }
                } else {
                    await prisma.$executeRawUnsafe(`
                        INSERT INTO \`LeaderboardMention\` (id, postId, mentionedUserId, createdAt)
                        VALUES ('${mentionId}', '${newPost.id}', '${targetUserId}', NOW(3))
                    `);
                }

                // In-app Notification
                await createNotification(
                    targetUserId,
                    '🎉 Bạn được nhắc đến trên Bảng Vinh Danh!',
                    `${currentUser.name || 'Một đồng nghiệp'} vừa nhắc đến bạn trong bài viết trên Mạng xã hội thi đua.`,
                    'SUCCESS',
                    `/leaderboard?postId=${newPost.id}`
                );

                // Send email alert to mentioned user
                try {
                    const targetUser = await prisma.user.findUnique({
                        where: { id: targetUserId },
                        select: { email: true, name: true }
                    });

                    if (targetUser?.email) {
                        const appUrl = process.env.NEXTAUTH_URL || 'https://inside.tsol.vn';
                        const emailHtml = `
                            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
                                <div style="text-align: center; margin-bottom: 24px;">
                                    <div style="display: inline-block; padding: 12px; background: #ecfdf5; border-radius: 50%; color: #059669; font-size: 32px;">🏆</div>
                                    <h2 style="color: #0f172a; margin: 12px 0 4px 0; font-size: 20px;">Bạn vừa được nhắc đến trên Bảng Vinh Danh!</h2>
                                    <p style="color: #64748b; font-size: 14px; margin: 0;">Mạng xã hội thi đua nội bộ công ty</p>
                                </div>
                                <div style="background: #f8fafc; border-radius: 12px; padding: 16px; border-left: 4px solid #10b981; margin-bottom: 20px;">
                                    <div style="font-weight: bold; color: #1e293b; font-size: 14px; margin-bottom: 6px;">
                                        ${currentUser.name || 'Đồng nghiệp'}:
                                    </div>
                                    <div style="color: #334155; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">
                                        ${data.content}
                                    </div>
                                </div>
                                <div style="text-align: center; margin-top: 24px;">
                                    <a href="${appUrl}/leaderboard" style="display: inline-block; padding: 12px 28px; background: #059669; color: #ffffff; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 10px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">
                                        👉 Xem Bài Viết & Giao Lưu Ngay
                                    </a>
                                </div>
                            </div>
                        `;

                        await sendEmailWithTracking({
                            to: targetUser.email,
                            subject: `🏆 ${currentUser.name || 'Đồng nghiệp'} vừa nhắc đến bạn trên Bảng Vinh Danh`,
                            htmlBody: emailHtml,
                            senderId: currentUser.id
                        });
                    }
                } catch (emailErr) {
                    console.error('Lỗi khi gửi email tag tên:', emailErr);
                }
            })
        );
    }

    revalidatePath('/leaderboard');
    return { success: true, post: newPost };
}

// 4. TOGGLE POST REACTION
export async function togglePostReaction(postId: string, emoji: ReactionEmoji) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true }
    });
    if (!currentUser) throw new Error('Tài khoản không hợp lệ.');

    const existingRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT id FROM \`LeaderboardReaction\` 
        WHERE postId = '${postId}' AND userId = '${currentUser.id}' AND emoji = '${emoji}'
        LIMIT 1
    `);

    if (existingRows.length > 0) {
        await prisma.$executeRawUnsafe(`
            DELETE FROM \`LeaderboardReaction\` WHERE id = '${existingRows[0].id}'
        `);
        revalidatePath('/leaderboard');
        return { success: true, action: 'REMOVED' };
    } else {
        const reactionId = genId();
        await prisma.$executeRawUnsafe(`
            INSERT INTO \`LeaderboardReaction\` (id, postId, userId, emoji, createdAt)
            VALUES ('${reactionId}', '${postId}', '${currentUser.id}', '${emoji}', NOW(3))
        `);

        // Notify post author
        const postRows: any[] = await prisma.$queryRawUnsafe(`
            SELECT authorId FROM \`LeaderboardPost\` WHERE id = '${postId}' LIMIT 1
        `);
        const postAuthorId = postRows[0]?.authorId;

        if (postAuthorId && postAuthorId !== currentUser.id) {
            const emojiLabels: Record<string, string> = {
                HEART: '❤️ thả tim',
                FIRE: '🔥 khích lệ nhiệt huyết',
                CLAP: '👏 vỗ tay cổ vũ',
                CELEBRATE: '🎉 chúc mừng',
                ROCKET: '🚀 bắn tim bứt phá',
                TROPHY: '🏆 tặng cúp vô địch'
            };
            await createNotification(
                postAuthorId,
                '🌟 Tương tác mới trên bài viết của bạn',
                `${currentUser.name || 'Đồng nghiệp'} vừa ${emojiLabels[emoji] || 'thả biểu cảm'} vào bài viết của bạn trên Bảng Vinh Danh.`,
                'INFO',
                `/leaderboard?postId=${postId}`
            );
        }

        revalidatePath('/leaderboard');
        return { success: true, action: 'ADDED' };
    }
}

// 5. ADD POST COMMENT
export async function addPostComment(data: {
    postId: string;
    content: string;
    parentId?: string;
    mentionedUserIds?: string[];
    image?: string;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true }
    });
    if (!currentUser) throw new Error('Tài khoản không hợp lệ.');

    const commentId = genId();
    const escapedContent = data.content.replace(/'/g, "\\'");
    const parentVal = data.parentId ? `'${data.parentId}'` : 'NULL';
    const imageVal = data.image ? `'${data.image.replace(/'/g, "\\'")}'` : 'NULL';

    await prisma.$executeRawUnsafe(`
        INSERT INTO \`LeaderboardComment\` (id, postId, authorId, content, parentId, image, createdAt, updatedAt)
        VALUES ('${commentId}', '${data.postId}', '${currentUser.id}', '${escapedContent}', ${parentVal}, ${imageVal}, NOW(3), NOW(3))
    `);

    const newComment = {
        id: commentId,
        postId: data.postId,
        authorId: currentUser.id,
        content: data.content,
        parentId: data.parentId || null,
        image: data.image || null,
        author: { id: currentUser.id, name: currentUser.name }
    };

    // Notify post author
    const postRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT authorId FROM \`LeaderboardPost\` WHERE id = '${data.postId}' LIMIT 1
    `);
    const postAuthorId = postRows[0]?.authorId;

    if (postAuthorId && postAuthorId !== currentUser.id) {
        await createNotification(
            postAuthorId,
            '💬 Bình luận mới trên bài viết của bạn',
            `${currentUser.name || 'Đồng nghiệp'} vừa bình luận: "${data.content.slice(0, 80)}..."`,
            'INFO',
            `/leaderboard?postId=${data.postId}`
        );
    }

    // Handle mentions in comment
    const mentionedIds = Array.from(new Set(data.mentionedUserIds || []));
    if (mentionedIds.length > 0) {
        await Promise.all(
            mentionedIds.map(async (targetUserId) => {
                if (targetUserId === currentUser.id) return;
                const mentionId = genId();
                await prisma.$executeRawUnsafe(`
                    INSERT INTO \`LeaderboardMention\` (id, commentId, mentionedUserId, createdAt)
                    VALUES ('${mentionId}', '${commentId}', '${targetUserId}', NOW(3))
                `);

                await createNotification(
                    targetUserId,
                    '💬 Bạn được tag trong bình luận',
                    `${currentUser.name || 'Đồng nghiệp'} vừa nhắc đến bạn trong một bình luận trên Bảng Vinh Danh.`,
                    'INFO',
                    `/leaderboard?postId=${data.postId}`
                );
            })
        );
    }

    revalidatePath('/leaderboard');
    return { success: true, comment: newComment };
}

// 6. PIN / UNPIN POST (Admin / Manager)
export async function pinSocialPost(postId: string, isPinned: boolean) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { role: true }
    });

    if (currentUser?.role !== 'ADMIN') {
        throw new Error('Chỉ Quản trị viên mới có quyền ghim bài viết.');
    }

    await prisma.$executeRawUnsafe(`
        UPDATE \`LeaderboardPost\` SET isPinned = ${isPinned ? 1 : 0}, updatedAt = NOW(3)
        WHERE id = '${postId}'
    `);

    revalidatePath('/leaderboard');
    return { success: true };
}

// 7. DELETE POST
export async function deleteSocialPost(postId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true }
    });

    const postRows: any[] = await prisma.$queryRawUnsafe(`
        SELECT authorId FROM \`LeaderboardPost\` WHERE id = '${postId}' LIMIT 1
    `);

    if (postRows.length === 0) throw new Error('Bài viết không tồn tại.');
    if (postRows[0].authorId !== currentUser?.id && currentUser?.role !== 'ADMIN') {
        throw new Error('Bạn không có quyền xóa bài viết này.');
    }

    await prisma.$executeRawUnsafe(`DELETE FROM \`LeaderboardMention\` WHERE postId = '${postId}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM \`LeaderboardReaction\` WHERE postId = '${postId}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM \`LeaderboardComment\` WHERE postId = '${postId}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM \`LeaderboardPost\` WHERE id = '${postId}'`);

    revalidatePath('/leaderboard');
    return { success: true };
}

// 8. SEARCH MENTION USERS
export async function searchMentionUsers(query: string = '') {
    const users = await prisma.user.findMany({
        where: {
            isActive: true,
            name: { contains: query }
        },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            employeeProfile: {
                select: {
                    department: true,
                    position: true
                }
            }
        },
        take: 10
    });

    return users;
}

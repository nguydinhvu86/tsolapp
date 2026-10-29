'use server'

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { createNotification } from '@/app/notifications/actions';
import { dispatchCommentNotifications, dispatchPostNotifications, dispatchGroupMemberNotifications } from './notification-service';
import { sendEmailWithTracking } from '@/lib/mailer';
import { revalidatePath } from 'next/cache';

export type TimeRangeKey = 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';
export type CriteriaKey = 'REVENUE' | 'CUSTOMERS' | 'LEADS' | 'ESTIMATES' | 'CONVERSION_RATE';
export type ReactionEmoji = 'HEART' | 'FIRE' | 'CLAP' | 'CELEBRATE' | 'ROCKET' | 'TROPHY';
export type LeaderboardMode = 'INDIVIDUAL' | 'TEAM';

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
            prevStart = new Date(start);
            prevStart.setDate(prevStart.getDate() - 7);
            prevEnd = new Date(end);
            prevEnd.setDate(prevEnd.getDate() - 7);
            break;
        }
        case 'THIS_MONTH': {
            start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
            prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
            break;
        }
        case 'THIS_QUARTER': {
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);
            prevStart = new Date(now.getFullYear(), (quarter - 1) * 3, 1, 0, 0, 0, 0);
            prevEnd = new Date(now.getFullYear(), quarter * 3, 0, 23, 59, 59, 999);
            break;
        }
        case 'THIS_YEAR': {
            start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
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

function genId(): string {
    return 'cm' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

// -------------------------------------------------------------
// CORE SCORING AGGREGATOR (Shared by Individual & Team Leaders)
// -------------------------------------------------------------
async function calculateUserScores(users: any[], periodStart: Date, periodEnd: Date) {
    const [
        invoices,
        payments,
        customers,
        leads,
        estimates
    ] = await Promise.all([
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
        prisma.customer.findMany({
            where: {
                createdAt: { gte: periodStart, lte: periodEnd }
            },
            select: {
                id: true,
                managers: { select: { id: true } }
            }
        }),
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

    // Revenue
    invoices.forEach(inv => {
        const userId = inv.salespersonId || inv.creatorId;
        if (userId && userScoreMap[userId]) {
            userScoreMap[userId].revenue += (inv.totalAmount || 0);
            userScoreMap[userId].invoicesCount += 1;
        }
    });

    // Customers
    customers.forEach(c => {
        if (c.managers && c.managers.length > 0) {
            c.managers.forEach(m => {
                if (userScoreMap[m.id]) {
                    userScoreMap[m.id].customersCount += 1;
                }
            });
        }
    });

    // Leads & Win
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

    // Estimates
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

    // Conversion rate calculation
    Object.keys(userScoreMap).forEach(uid => {
        const item = userScoreMap[uid];
        if (item.leadsCount > 0) {
            item.conversionRate = Math.round((item.leadsWonCount / item.leadsCount) * 1000) / 10;
        } else if (item.estimatesCount > 0) {
            item.conversionRate = Math.round((item.estimatesAcceptedCount / item.estimatesCount) * 1000) / 10;
        }
    });

    return userScoreMap;
}

const getCriteriaScore = (item: any, crit: CriteriaKey) => {
    switch (crit) {
        case 'REVENUE': return item.revenue || 0;
        case 'CUSTOMERS': return item.customersCount || 0;
        case 'LEADS': return item.leadsCount || 0;
        case 'ESTIMATES': return item.estimatesCount || 0;
        case 'CONVERSION_RATE': return item.conversionRate || 0;
        default: return item.revenue || 0;
    }
};

// =============================================================
// 1. GET INDIVIDUAL LEADERBOARD
// =============================================================
export async function getLeaderboardData(params: {
    criteria?: CriteriaKey;
    timeRange?: TimeRangeKey;
    customStart?: string;
    customEnd?: string;
}) {
    const criteria = params.criteria || 'REVENUE';
    const timeRange = params.timeRange || 'THIS_MONTH';
    const { start, end, prevStart, prevEnd } = getDateBounds(timeRange, params.customStart, params.customEnd);

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
                    position: true,
                    phoneNumber: true
                }
            }
        }
    });

    const [currentScores, prevScores] = await Promise.all([
        calculateUserScores(users, start, end),
        calculateUserScores(users, prevStart, prevEnd)
    ]);

    // Calculate previous period rank
    const prevRankedList = users
        .map(u => ({ id: u.id, score: getCriteriaScore(prevScores[u.id] || {}, criteria) }))
        .sort((a, b) => b.score - a.score);

    const prevRankMap: Record<string, number> = {};
    prevRankedList.forEach((item, index) => {
        prevRankMap[item.id] = index + 1;
    });

    // Build current ranked users
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

    rankedUsers.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.stats.revenue !== a.stats.revenue) return b.stats.revenue - a.stats.revenue;
        return b.stats.leadsWonCount - a.stats.leadsWonCount;
    });

    const maxScore = rankedUsers[0]?.score || 1;

    const leaderboard = rankedUsers.map((item, index) => {
        const rank = index + 1;
        const delta = item.prevRank - rank;

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

    const totalRevenue = Object.values(currentScores).reduce((acc, cur) => acc + cur.revenue, 0);
    const totalCustomers = Object.values(currentScores).reduce((acc, cur) => acc + cur.customersCount, 0);
    const totalLeads = Object.values(currentScores).reduce((acc, cur) => acc + cur.leadsCount, 0);
    const totalEstimates = Object.values(currentScores).reduce((acc, cur) => acc + cur.estimatesCount, 0);

    return {
        mode: 'INDIVIDUAL' as LeaderboardMode,
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

// =============================================================
// 2. GET COMPETITION GROUP LEADERBOARD (TẬP THỂ / NHÓM THI ĐUA)
// =============================================================
export async function getGroupLeaderboardData(params: {
    criteria?: CriteriaKey;
    timeRange?: TimeRangeKey;
    customStart?: string;
    customEnd?: string;
}) {
    const criteria = params.criteria || 'REVENUE';
    const timeRange = params.timeRange || 'THIS_MONTH';
    const { start, end, prevStart, prevEnd } = getDateBounds(timeRange, params.customStart, params.customEnd);

    // 1. Fetch groups with members
    let groups: any[] = [];
    try {
        groups = await prisma.competitionGroup.findMany({
            where: { isActive: true },
            include: {
                leader: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        email: true,
                        employeeProfile: { select: { department: true, position: true } }
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                email: true,
                                employeeProfile: { select: { department: true, position: true } }
                            }
                        }
                    }
                }
            }
        });
    } catch (e) {
        console.error('Failed to fetch competition groups in getGroupLeaderboardData:', e);
        groups = [];
    }

    // 2. Fetch all users for score calculations
    const allUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true, name: true, avatar: true }
    });

    const [currentScores, prevScores] = await Promise.all([
        calculateUserScores(allUsers, start, end),
        calculateUserScores(allUsers, prevStart, prevEnd)
    ]);

    // 3. Aggregate stats per group
    const aggregateGroupStats = (group: any, scoreMap: Record<string, any>) => {
        const memberUsers = (group.members || []).map((m: any) => m.user).filter(Boolean);
        const stats = {
            revenue: 0,
            invoicesCount: 0,
            customersCount: 0,
            leadsCount: 0,
            leadsWonCount: 0,
            pipelineValue: 0,
            estimatesCount: 0,
            estimatesAcceptedCount: 0,
            estimatesValue: 0,
            conversionRate: 0,
            memberCount: memberUsers.length,
            targetRevenue: group.targetRevenue || 0,
            targetProgress: 0,
            topContributor: null as any
        };

        let topMember: any = null;
        let topMemberRevenue = -1;

        memberUsers.forEach((user: any) => {
            const uStat = scoreMap[user.id] || { revenue: 0, invoicesCount: 0, customersCount: 0, leadsCount: 0, leadsWonCount: 0, pipelineValue: 0, estimatesCount: 0 };
            stats.revenue += uStat.revenue;
            stats.invoicesCount += uStat.invoicesCount;
            stats.customersCount += uStat.customersCount;
            stats.leadsCount += uStat.leadsCount;
            stats.leadsWonCount += uStat.leadsWonCount;
            stats.pipelineValue += uStat.pipelineValue;
            stats.estimatesCount += uStat.estimatesCount;

            if (uStat.revenue > topMemberRevenue) {
                topMemberRevenue = uStat.revenue;
                topMember = {
                    id: user.id,
                    name: user.name,
                    avatar: user.avatar,
                    revenue: uStat.revenue
                };
            }
        });

        stats.topContributor = topMember;
        if (stats.targetRevenue > 0) {
            stats.targetProgress = Math.round((stats.revenue / stats.targetRevenue) * 100);
        }
        if (stats.leadsCount > 0) {
            stats.conversionRate = Math.round((stats.leadsWonCount / stats.leadsCount) * 1000) / 10;
        }

        return stats;
    };

    // Calculate previous group scores
    const prevGroupRanks = groups.map(g => {
        const stats = aggregateGroupStats(g, prevScores);
        return { id: g.id, score: getCriteriaScore(stats, criteria) };
    }).sort((a, b) => b.score - a.score);

    const prevRankMap: Record<string, number> = {};
    prevGroupRanks.forEach((item, index) => {
        prevRankMap[item.id] = index + 1;
    });

    // Build current ranked groups
    const rankedGroups = groups.map(group => {
        const stats = aggregateGroupStats(group, currentScores);
        const score = getCriteriaScore(stats, criteria);
        return {
            group,
            stats,
            score,
            prevRank: prevRankMap[group.id] || 999
        };
    });

    rankedGroups.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.stats.revenue !== a.stats.revenue) return b.stats.revenue - a.stats.revenue;
        return b.stats.leadsWonCount - a.stats.leadsWonCount;
    });

    const maxScore = rankedGroups[0]?.score || 1;

    const leaderboard = rankedGroups.map((item, index) => {
        const rank = index + 1;
        const delta = item.prevRank - rank;

        let badge = '';
        if (rank === 1) badge = '👑 Đội Vô Địch (Quán Quân)';
        else if (rank === 2) badge = '🥈 Đội Á Quân 1';
        else if (rank === 3) badge = '🥉 Đội Á Quân 2';
        else if (item.stats.targetProgress >= 100) badge = '🎯 Vượt Chỉ Tiêu Kỳ';
        else if (item.stats.revenue >= 300000000) badge = '💎 Doanh Thu Khủng';
        else if (delta >= 1) badge = '🚀 Đội Nhóm Bứt Phá';

        return {
            rank,
            group: item.group,
            stats: item.stats,
            score: item.score,
            percentageOfTop: Math.min(100, Math.round((item.score / Math.max(1, maxScore)) * 100)),
            delta,
            badge
        };
    });

    const totalRevenue = rankedGroups.reduce((acc, cur) => acc + cur.stats.revenue, 0);
    const totalCustomers = rankedGroups.reduce((acc, cur) => acc + cur.stats.customersCount, 0);
    const totalLeads = rankedGroups.reduce((acc, cur) => acc + cur.stats.leadsCount, 0);
    const totalEstimates = rankedGroups.reduce((acc, cur) => acc + cur.stats.estimatesCount, 0);
    const totalCompetingMembers = rankedGroups.reduce((acc, cur) => acc + cur.stats.memberCount, 0);

    return {
        mode: 'TEAM' as LeaderboardMode,
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
            activeGroups: groups.length,
            activeMembers: totalCompetingMembers
        },
        topThree: leaderboard.slice(0, 3),
        fullList: leaderboard
    };
}

// =============================================================
// 3. GROUP MANAGEMENT ACTIONS (ADMIN / MANAGER)
// =============================================================
export async function getCompetitionGroups() {
    try {
        const groups = await prisma.competitionGroup.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                leader: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                        email: true,
                        employeeProfile: { select: { department: true, position: true } }
                    }
                },
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                                email: true,
                                employeeProfile: { select: { department: true, position: true } }
                            }
                        }
                    }
                }
            }
        });
        return groups;
    } catch (e) {
        console.error('Failed to fetch competition groups in getAllCompetitionGroups:', e);
        return [];
    }
}

export async function createCompetitionGroup(data: {
    name: string;
    code?: string;
    slogan?: string;
    description?: string;
    avatar?: string;
    color?: string;
    targetRevenue?: number;
    leaderId?: string;
    memberIds?: string[];
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, role: true }
    });

    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
        throw new Error('Chỉ Quản trị viên hoặc Quản lý mới có quyền tạo nhóm thi đua.');
    }

    const groupId = genId();
    const targetRev = data.targetRevenue || 0;
    const color = data.color || '#059669';

    // 1. Create group via ORM or SQL
    try {
        await prisma.competitionGroup.create({
            data: {
                id: groupId,
                name: data.name,
                code: data.code || null,
                slogan: data.slogan || null,
                description: data.description || null,
                avatar: data.avatar || null,
                color,
                targetRevenue: targetRev,
                leaderId: data.leaderId || null,
                isActive: true
            }
        });
    } catch (e: any) {
        console.error('Failed to create competition group:', e);
        throw new Error('Không thể tạo nhóm thi đua: ' + (e?.message || e));
    }

    // 2. Add members
    const allMemberIds = new Set<string>(data.memberIds || []);
    if (data.leaderId) allMemberIds.add(data.leaderId);

    const memberList = Array.from(allMemberIds);
    if (memberList.length > 0) {
        for (const userId of memberList) {
            const memberId = genId();
            const role = userId === data.leaderId ? 'LEADER' : 'MEMBER';
            try {
                await prisma.competitionGroupMember.upsert({
                    where: {
                        groupId_userId: { groupId, userId }
                    },
                    update: { role },
                    create: {
                        id: memberId,
                        groupId,
                        userId,
                        role
                    }
                });
            } catch (err) {
                console.warn('Failed to add competition group member:', err);
            }
        }

        // Send notifications (In-app, Web Push, and Welcome Email) to added members
        await dispatchGroupMemberNotifications({
            groupId,
            groupName: data.name,
            slogan: data.slogan,
            targetRevenue: targetRev,
            leaderId: data.leaderId,
            targetUserIds: memberList,
            isNewlyCreated: true,
            currentUser: { id: currentUser.id, name: currentUser.name }
        });
    }

    // 3. Create celebration announcement post on Social Wall
    try {
        const announcementPostId = genId();
        const postContent = '🎉 CHÀO MỪNG ĐỘI THI ĐUA MỚI: ' + data.name.toUpperCase() + '!\n\n' +
            '🎯 Slogan: "' + (data.slogan || 'Quyết chiến quyết thắng!') + '"\n' +
            '🏆 Mục tiêu doanh số: ' + new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(targetRev) + '\n' +
            '👥 Thành viên: ' + memberList.length + ' chiến binh đã sẵn sàng xuất kích!\n\n' +
            'Chúc đội gặt hái nhiều thắng lợi rực rỡ và giành ngôi vị Quán Quân kỳ này! 🔥🚀';

        await prisma.leaderboardPost.create({
            data: {
                id: announcementPostId,
                authorId: currentUser.id,
                groupId,
                content: postContent,
                images: null,
                type: 'ACHIEVEMENT_ANNOUNCEMENT',
                isPinned: true,
                metadata: JSON.stringify({ isGroupLaunch: true, groupName: data.name })
            }
        });
    } catch (postErr) {
        console.error('Failed to create launch post for group:', postErr);
    }

    revalidatePath('/leaderboard');
    return { success: true, groupId };
}

export async function updateCompetitionGroup(groupId: string, data: {
    name?: string;
    code?: string;
    slogan?: string;
    description?: string;
    avatar?: string;
    color?: string;
    targetRevenue?: number;
    leaderId?: string;
    memberIds?: string[];
    isActive?: boolean;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true, role: true }
    });

    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
        throw new Error('Chỉ Quản trị viên hoặc Quản lý mới có quyền chỉnh sửa nhóm thi đua.');
    }

    // Fetch existing group to check previous members & leader
    const existingGroup = await prisma.competitionGroup.findUnique({
        where: { id: groupId },
        include: {
            members: { select: { userId: true, role: true } }
        }
    });

    if (!existingGroup) throw new Error('Không tìm thấy nhóm thi đua.');

    const oldMemberIds = new Set(existingGroup.members.map(m => m.userId));
    const previousLeaderId = existingGroup.leaderId;

    // Update group basic info
    const updatedGroup = await prisma.competitionGroup.update({
        where: { id: groupId },
        data: {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.slogan !== undefined ? { slogan: data.slogan } : {}),
            ...(data.description !== undefined ? { description: data.description } : {}),
            ...(data.avatar !== undefined ? { avatar: data.avatar } : {}),
            ...(data.color !== undefined ? { color: data.color } : {}),
            ...(data.targetRevenue !== undefined ? { targetRevenue: data.targetRevenue } : {}),
            ...(data.leaderId !== undefined ? { leaderId: data.leaderId } : {}),
            ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        }
    });

    const groupName = data.name || updatedGroup.name;
    const groupSlogan = data.slogan !== undefined ? data.slogan : updatedGroup.slogan;
    const groupTargetRevenue = data.targetRevenue !== undefined ? data.targetRevenue : updatedGroup.targetRevenue;

    // Synchronize members if provided
    if (data.memberIds !== undefined) {
        const allMemberIds = new Set<string>(data.memberIds);
        if (data.leaderId) allMemberIds.add(data.leaderId);
        const memberIdArray = Array.from(allMemberIds);

        // Delete members not in new list
        if (memberIdArray.length > 0) {
            await prisma.competitionGroupMember.deleteMany({
                where: {
                    groupId,
                    userId: { notIn: memberIdArray }
                }
            });
        } else {
            await prisma.competitionGroupMember.deleteMany({
                where: { groupId }
            });
        }

        // Add or update members
        for (const userId of memberIdArray) {
            const memberId = genId();
            const role = userId === data.leaderId ? 'LEADER' : 'MEMBER';
            await prisma.competitionGroupMember.upsert({
                where: {
                    groupId_userId: { groupId, userId }
                },
                update: { role },
                create: {
                    id: memberId,
                    groupId,
                    userId,
                    role
                }
            });
        }

        // Send notifications (In-app, Web Push, Email) to newly added members
        const newlyAddedIds = memberIdArray.filter(uid => !oldMemberIds.has(uid));
        if (newlyAddedIds.length > 0) {
            await dispatchGroupMemberNotifications({
                groupId,
                groupName,
                slogan: groupSlogan,
                targetRevenue: groupTargetRevenue,
                leaderId: data.leaderId,
                targetUserIds: newlyAddedIds,
                isNewlyCreated: false,
                currentUser: { id: currentUser.id, name: currentUser.name }
            });
        }

        // If leader changed and the new leader wasn't already in newlyAddedIds
        if (data.leaderId && data.leaderId !== previousLeaderId && !newlyAddedIds.includes(data.leaderId)) {
            await dispatchGroupMemberNotifications({
                groupId,
                groupName,
                slogan: groupSlogan,
                targetRevenue: groupTargetRevenue,
                leaderId: data.leaderId,
                targetUserIds: [data.leaderId],
                isNewlyCreated: false,
                currentUser: { id: currentUser.id, name: currentUser.name }
            });
        }
    }

    revalidatePath('/leaderboard');
    return { success: true };
}

export async function deleteCompetitionGroup(groupId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true }
    });

    if (currentUser?.role !== 'ADMIN') {
        throw new Error('Chỉ Quản trị viên mới có quyền xóa nhóm thi đua.');
    }

    await prisma.competitionGroupMember.deleteMany({ where: { groupId } });
    await prisma.competitionGroup.delete({ where: { id: groupId } });

    revalidatePath('/leaderboard');
    return { success: true };
}

// =============================================================
// 4. USER MINI SOCIAL PROFILE & WALL OF FAME
// =============================================================
export async function getUserSocialProfile(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            
            role: true,
            createdAt: true,
            employeeProfile: {
                select: {
                    department: true,
                    position: true,
                    
                }
            }
        }
    });

    if (!user) throw new Error('Không tìm thấy người dùng.');

    // 1. Group membership
    let groupMembership: any = null;
    try {
        const mem = await prisma.competitionGroupMember.findFirst({
            where: { userId },
            include: {
                group: {
                    select: {
                        id: true,
                        name: true,
                        slogan: true,
                        avatar: true,
                        color: true,
                        targetRevenue: true
                    }
                }
            }
        });
        if (mem) {
            groupMembership = {
                role: mem.role,
                joinedAt: mem.joinedAt,
                group: mem.group
            };
        }
    } catch (e) {
        groupMembership = null;
    }

    // 2. Performance metrics (This Month)
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const scores = await calculateUserScores([user], monthStart, monthEnd);
    const stats = scores[user.id] || {
        revenue: 0,
        invoicesCount: 0,
        customersCount: 0,
        leadsCount: 0,
        leadsWonCount: 0,
        pipelineValue: 0,
        estimatesCount: 0,
        conversionRate: 0
    };

    // 3. Reaction & Praise count received
    let totalReactionsReceived = 0;
    try {
        const reactionCountRes: any[] = await prisma.$queryRaw`
            SELECT COUNT(r.id) as count
            FROM \`LeaderboardReaction\` r
            INNER JOIN \`LeaderboardPost\` p ON r.postId = p.id
            WHERE p.authorId = ${userId}
        `;
        totalReactionsReceived = Number(reactionCountRes[0]?.count || 0);
    } catch (e) {}

    // 4. Badges earned
    const badges: string[] = [];
    if (stats.revenue >= 100000000) badges.push('💎 Câu Lạc Bộ Trăm Triệu');
    if (stats.revenue >= 500000000) badges.push('👑 Chiến Thần Doanh Số');
    if (stats.conversionRate >= 75 && stats.leadsCount >= 2) badgeSafePush(badges, '🎯 Thiện Xạ Chốt Sale');
    if (stats.customersCount >= 5) badgeSafePush(badges, '🌟 Bàn Tay Vàng Thu Hút Khách Hàng');
    if (stats.leadsCount >= 10) badgeSafePush(badges, '🔥 Thợ Săn Cơ Hội');
    if (groupMembership?.role === 'LEADER') badgeSafePush(badges, '🛡️ Đội Trưởng Tiên Phong');

    // 5. Recent wall posts authored by this user
    let recentPosts: any[] = [];
    try {
        recentPosts = await prisma.leaderboardPost.findMany({
            where: { authorId: userId },
            take: 3,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                content: true,
                createdAt: true,
                type: true
            }
        });
    } catch (e) {
        recentPosts = [];
    }

    return {
        user,
        stats,
        groupMembership,
        totalReactionsReceived,
        badges,
        recentPosts
    };
}

function badgeSafePush(arr: string[], val: string) {
    if (!arr.includes(val)) arr.push(val);
}

// =============================================================
// 5. GET SOCIAL FEED
// =============================================================
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
                        group: {
                            select: {
                                id: true,
                                name: true,
                                slogan: true,
                                avatar: true,
                                color: true
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
            console.error('Failed to load leaderboard posts via Prisma:', err);
            formattedPosts = [];
            total = 0;
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

// =============================================================
// 6. CREATE SOCIAL POST & HONOR
// =============================================================
export async function createSocialPost(data: {
    content: string;
    images?: string[];
    groupId?: string;
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
    const groupId = data.groupId || null;

    let newPost: any = null;
    try {
        newPost = await prisma.leaderboardPost.create({
            data: {
                id: postId,
                authorId: currentUser.id,
                groupId,
                content: data.content,
                images: imagesJson,
                type: postType,
                metadata: metadataJson,
            }
        });
    } catch (e: any) {
        console.error('Failed to create leaderboard post:', e);
        throw new Error('Không thể tạo bài viết: ' + (e?.message || e));
    }

    // Dispatch mentions and team announcements
    await dispatchPostNotifications({
        postId: newPost.id,
        content: data.content,
        groupId,
        explicitMentionedUserIds: data.mentionedUserIds,
        currentUser: { id: currentUser.id, name: currentUser.name, email: currentUser.email }
    });

    revalidatePath('/leaderboard');
    return { success: true, post: newPost };
}

export async function togglePostReaction(postId: string, emoji: ReactionEmoji) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, name: true }
    });
    if (!currentUser) throw new Error('Tài khoản không hợp lệ.');

    const existingReaction = await prisma.leaderboardReaction.findUnique({
        where: {
            postId_userId_emoji: {
                postId,
                userId: currentUser.id,
                emoji
            }
        }
    });

    if (existingReaction) {
        await prisma.leaderboardReaction.delete({
            where: { id: existingReaction.id }
        });
        revalidatePath('/leaderboard');
        return { success: true, action: 'REMOVED' };
    } else {
        const reactionId = genId();
        await prisma.leaderboardReaction.create({
            data: {
                id: reactionId,
                postId,
                userId: currentUser.id,
                emoji
            }
        });

        // Notify post author
        const post = await prisma.leaderboardPost.findUnique({
            where: { id: postId },
            select: { authorId: true }
        });
        const postAuthorId = post?.authorId;

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
        select: { id: true, name: true, email: true }
    });
    if (!currentUser) throw new Error('Tài khoản không hợp lệ.');

    const commentId = genId();
    await prisma.leaderboardComment.create({
        data: {
            id: commentId,
            postId: data.postId,
            authorId: currentUser.id,
            content: data.content,
            parentId: data.parentId || null,
            image: data.image || null
        }
    });

    const newComment = {
        id: commentId,
        postId: data.postId,
        authorId: currentUser.id,
        content: data.content,
        parentId: data.parentId || null,
        image: data.image || null,
        author: { id: currentUser.id, name: currentUser.name }
    };

    // Dispatch comprehensive relevant comment notifications:
    // 1) Users mentioned in comment (@mentions)
    // 2) Parent comment author (if this is a reply)
    // 3) Post author
    // 4) Other thread participants (previous commenters)
    await dispatchCommentNotifications({
        postId: data.postId,
        commentId,
        content: data.content,
        parentId: data.parentId,
        explicitMentionedUserIds: data.mentionedUserIds,
        currentUser: { id: currentUser.id, name: currentUser.name, email: currentUser.email }
    });

    revalidatePath('/leaderboard');
    return { success: true, comment: newComment };
}

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

    await prisma.leaderboardPost.update({
        where: { id: postId },
        data: { isPinned }
    });

    revalidatePath('/leaderboard');
    return { success: true };
}

export async function deleteSocialPost(postId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) throw new Error('Vui lòng đăng nhập.');

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true }
    });

    const post = await prisma.leaderboardPost.findUnique({
        where: { id: postId },
        select: { authorId: true }
    });

    if (!post) throw new Error('Bài viết không tồn tại.');
    if (post.authorId !== currentUser?.id && currentUser?.role !== 'ADMIN') {
        throw new Error('Bạn không có quyền xóa bài viết này.');
    }

    await prisma.leaderboardMention.deleteMany({ where: { postId } });
    await prisma.leaderboardReaction.deleteMany({ where: { postId } });
    await prisma.leaderboardComment.deleteMany({ where: { postId } });
    await prisma.leaderboardPost.delete({ where: { id: postId } });

    revalidatePath('/leaderboard');
    return { success: true };
}

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

export async function getAllUsersForManagement() {
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
        },
        orderBy: { name: 'asc' }
    });

    return users;
}

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
        // Fallback SQL query
        try {
            const rawGroups: any[] = await prisma.$queryRawUnsafe(`
                SELECT g.*, u.name as leaderName, u.avatar as leaderAvatar, u.email as leaderEmail
                FROM \`CompetitionGroup\` g
                LEFT JOIN \`User\` u ON g.leaderId = u.id
                WHERE g.isActive = 1
            `);
            const groupIds = rawGroups.map(g => `'${g.id}'`);
            let membersMap: Record<string, any[]> = {};

            if (groupIds.length > 0) {
                const rawMembers: any[] = await prisma.$queryRawUnsafe(`
                    SELECT m.*, u.name as userName, u.avatar as userAvatar, u.email as userEmail
                    FROM \`CompetitionGroupMember\` m
                    LEFT JOIN \`User\` u ON m.userId = u.id
                    WHERE m.groupId IN (${groupIds.join(',')})
                `);
                rawMembers.forEach(m => {
                    if (!membersMap[m.groupId]) membersMap[m.groupId] = [];
                    membersMap[m.groupId].push({
                        id: m.id,
                        groupId: m.groupId,
                        userId: m.userId,
                        role: m.role,
                        user: { id: m.userId, name: m.userName, avatar: m.userAvatar, email: m.userEmail }
                    });
                });
            }

            groups = rawGroups.map(g => ({
                id: g.id,
                name: g.name,
                code: g.code,
                description: g.description,
                slogan: g.slogan,
                avatar: g.avatar,
                color: g.color || '#059669',
                targetRevenue: Number(g.targetRevenue || 0),
                leaderId: g.leaderId,
                leader: g.leaderId ? { id: g.leaderId, name: g.leaderName, avatar: g.leaderAvatar, email: g.leaderEmail } : null,
                members: membersMap[g.id] || []
            }));
        } catch (sqlErr) {
            console.error('Failed to load competition groups:', sqlErr);
            groups = [];
        }
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
        // SQL Fallback
        const rawGroups: any[] = await prisma.$queryRawUnsafe(`
            SELECT g.*, u.name as leaderName, u.avatar as leaderAvatar, u.email as leaderEmail
            FROM \`CompetitionGroup\` g
            LEFT JOIN \`User\` u ON g.leaderId = u.id
            ORDER BY g.createdAt DESC
        `);
        const groupIds = rawGroups.map(g => `'${g.id}'`);
        let membersMap: Record<string, any[]> = {};

        if (groupIds.length > 0) {
            const rawMembers: any[] = await prisma.$queryRawUnsafe(`
                SELECT m.*, u.name as userName, u.avatar as userAvatar, u.email as userEmail
                FROM \`CompetitionGroupMember\` m
                LEFT JOIN \`User\` u ON m.userId = u.id
                WHERE m.groupId IN (${groupIds.join(',')})
            `);
            rawMembers.forEach(m => {
                if (!membersMap[m.groupId]) membersMap[m.groupId] = [];
                membersMap[m.groupId].push({
                    id: m.id,
                    groupId: m.groupId,
                    userId: m.userId,
                    role: m.role,
                    user: { id: m.userId, name: m.userName, avatar: m.userAvatar, email: m.userEmail }
                });
            });
        }

        return rawGroups.map(g => ({
            id: g.id,
            name: g.name,
            code: g.code,
            description: g.description,
            slogan: g.slogan,
            avatar: g.avatar,
            color: g.color || '#059669',
            targetRevenue: Number(g.targetRevenue || 0),
            leaderId: g.leaderId,
            isActive: Boolean(g.isActive),
            leader: g.leaderId ? { id: g.leaderId, name: g.leaderName, avatar: g.leaderAvatar, email: g.leaderEmail } : null,
            members: membersMap[g.id] || []
        }));
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
    } catch (e) {
        const escName = data.name.replace(/'/g, "\\'");
        const escCode = data.code ? `'${data.code.replace(/'/g, "\\'")}'` : 'NULL';
        const escSlogan = data.slogan ? `'${data.slogan.replace(/'/g, "\\'")}'` : 'NULL';
        const escDesc = data.description ? `'${data.description.replace(/'/g, "\\'")}'` : 'NULL';
        const escAvatar = data.avatar ? `'${data.avatar.replace(/'/g, "\\'")}'` : 'NULL';
        const escLeader = data.leaderId ? `'${data.leaderId}'` : 'NULL';

        await prisma.$executeRawUnsafe(`
            INSERT INTO \`CompetitionGroup\` (id, name, code, slogan, description, avatar, color, targetRevenue, leaderId, isActive, createdAt, updatedAt)
            VALUES ('${groupId}', '${escName}', ${escCode}, ${escSlogan}, ${escDesc}, ${escAvatar}, '${color}', ${targetRev}, ${escLeader}, 1, NOW(3), NOW(3))
        `);
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
                await prisma.competitionGroupMember.create({
                    data: {
                        id: memberId,
                        groupId,
                        userId,
                        role
                    }
                });
            } catch (err) {
                await prisma.$executeRawUnsafe(`
                    INSERT INTO \`CompetitionGroupMember\` (id, groupId, userId, role, joinedAt)
                    VALUES ('${memberId}', '${groupId}', '${userId}', '${role}', NOW(3))
                    ON DUPLICATE KEY UPDATE role = '${role}'
                `);
            }

            // In-app Notification to member
            if (userId !== currentUser.id) {
                await createNotification(
                    userId,
                    '🛡️ Bạn vừa được thêm vào Nhóm Thi Đua mới!',
                    `Chào mừng bạn gia nhập nhóm thi đua "${data.name}"! Cùng đồng đội chinh phục mục tiêu rực rỡ! 🔥`,
                    'SUCCESS',
                    '/leaderboard'
                );
            }
        }
    }

    // 3. Create celebration announcement post on Social Wall
    try {
        const announcementPostId = genId();
        const postContent = `🎉 CHÀO MỪNG ĐỘI THI ĐUA MỚI: ${data.name.toUpperCase()}!\n\n` +
            `🎯 Slogan: "${data.slogan || 'Quyết chiến quyết thắng!'}"\n` +
            `🏆 Mục tiêu doanh số: ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(targetRev)}\n` +
            `👥 Thành viên: ${memberList.length} chiến binh đã sẵn sàng xuất kích!\n\n` +
            `Chúc đội gặt hái nhiều thắng lợi rực rỡ và giành ngôi vị Quán Quân kỳ này! 🔥🚀`;

        await prisma.$executeRawUnsafe(`
            INSERT INTO \`LeaderboardPost\` (id, authorId, groupId, content, images, type, isPinned, metadata, createdAt, updatedAt)
            VALUES ('${announcementPostId}', '${currentUser.id}', '${groupId}', '${postContent.replace(/'/g, "\\'")}', NULL, 'ACHIEVEMENT_ANNOUNCEMENT', 1, '{"isGroupLaunch": true, "groupName": "${data.name.replace(/'/g, "\\'")}"}', NOW(3), NOW(3))
        `);
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
        select: { id: true, role: true }
    });

    if (currentUser?.role !== 'ADMIN' && currentUser?.role !== 'MANAGER') {
        throw new Error('Chỉ Quản trị viên hoặc Quản lý mới có quyền chỉnh sửa nhóm thi đua.');
    }

    // Update group basic info
    const updates: string[] = [];
    if (data.name !== undefined) updates.push(`name = '${data.name.replace(/'/g, "\\'")}'`);
    if (data.slogan !== undefined) updates.push(`slogan = '${(data.slogan || '').replace(/'/g, "\\'")}'`);
    if (data.description !== undefined) updates.push(`description = '${(data.description || '').replace(/'/g, "\\'")}'`);
    if (data.avatar !== undefined) updates.push(`avatar = '${(data.avatar || '').replace(/'/g, "\\'")}'`);
    if (data.color !== undefined) updates.push(`color = '${data.color}'`);
    if (data.targetRevenue !== undefined) updates.push(`targetRevenue = ${data.targetRevenue}`);
    if (data.leaderId !== undefined) updates.push(`leaderId = ${data.leaderId ? `'${data.leaderId}'` : 'NULL'}`);
    if (data.isActive !== undefined) updates.push(`isActive = ${data.isActive ? 1 : 0}`);
    updates.push(`updatedAt = NOW(3)`);

    if (updates.length > 0) {
        await prisma.$executeRawUnsafe(`
            UPDATE \`CompetitionGroup\` SET ${updates.join(', ')} WHERE id = '${groupId}'
        `);
    }

    // Synchronize members if provided
    if (data.memberIds !== undefined) {
        const allMemberIds = new Set<string>(data.memberIds);
        if (data.leaderId) allMemberIds.add(data.leaderId);

        // Delete members not in new list
        const inListStr = Array.from(allMemberIds).map(id => `'${id}'`).join(',');
        if (inListStr.length > 0) {
            await prisma.$executeRawUnsafe(`
                DELETE FROM \`CompetitionGroupMember\` WHERE groupId = '${groupId}' AND userId NOT IN (${inListStr})
            `);
        } else {
            await prisma.$executeRawUnsafe(`
                DELETE FROM \`CompetitionGroupMember\` WHERE groupId = '${groupId}'
            `);
        }

        // Add or update members
        for (const userId of Array.from(allMemberIds)) {
            const memberId = genId();
            const role = userId === data.leaderId ? 'LEADER' : 'MEMBER';
            await prisma.$executeRawUnsafe(`
                INSERT INTO \`CompetitionGroupMember\` (id, groupId, userId, role, joinedAt)
                VALUES ('${memberId}', '${groupId}', '${userId}', '${role}', NOW(3))
                ON DUPLICATE KEY UPDATE role = '${role}'
            `);
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

    await prisma.$executeRawUnsafe(`DELETE FROM \`CompetitionGroupMember\` WHERE groupId = '${groupId}'`);
    await prisma.$executeRawUnsafe(`DELETE FROM \`CompetitionGroup\` WHERE id = '${groupId}'`);

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
        // SQL fallback
        const rawMems: any[] = await prisma.$queryRawUnsafe(`
            SELECT m.*, g.name as groupName, g.slogan as groupSlogan, g.avatar as groupAvatar, g.color as groupColor
            FROM \`CompetitionGroupMember\` m
            LEFT JOIN \`CompetitionGroup\` g ON m.groupId = g.id
            WHERE m.userId = '${userId}'
            LIMIT 1
        `);
        if (rawMems.length > 0) {
            const m = rawMems[0];
            groupMembership = {
                role: m.role,
                joinedAt: m.joinedAt,
                group: {
                    id: m.groupId,
                    name: m.groupName,
                    slogan: m.groupSlogan,
                    avatar: m.groupAvatar,
                    color: m.groupColor
                }
            };
        }
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
        const reactionCountRes: any[] = await prisma.$queryRawUnsafe(`
            SELECT COUNT(r.id) as count
            FROM \`LeaderboardReaction\` r
            INNER JOIN \`LeaderboardPost\` p ON r.postId = p.id
            WHERE p.authorId = '${userId}'
        `);
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
        const rawPosts: any[] = await prisma.$queryRawUnsafe(`
            SELECT id, content, createdAt, type
            FROM \`LeaderboardPost\`
            WHERE authorId = '${userId}'
            ORDER BY createdAt DESC
            LIMIT 3
        `);
        recentPosts = rawPosts;
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
            console.warn('Prisma ORM failed on leaderboardPost, fallback to SQL:', err);
        }
    }

    if (!ormSuccess) {
        try {
            const [rawPosts, countRes] = (await Promise.all([
                prisma.$queryRawUnsafe(`
                    SELECT p.*, 
                           u.name as authorName, u.avatar as authorAvatar, u.email as authorEmail, u.role as authorRole,
                           ep.department as authorDepartment, ep.position as authorPosition,
                           g.name as groupName, g.slogan as groupSlogan, g.avatar as groupAvatar, g.color as groupColor
                    FROM \`LeaderboardPost\` p
                    LEFT JOIN \`User\` u ON p.authorId = u.id
                    LEFT JOIN \`EmployeeProfile\` ep ON u.id = ep.userId
                    LEFT JOIN \`CompetitionGroup\` g ON p.groupId = g.id
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
                    groupId: post.groupId,
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
                    group: post.groupId ? {
                        id: post.groupId,
                        name: post.groupName,
                        slogan: post.groupSlogan,
                        avatar: post.groupAvatar,
                        color: post.groupColor
                    } : null,
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
    if (prisma.leaderboardPost) {
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
        } catch (e) {
            newPost = null;
        }
    }

    if (!newPost) {
        const escapedContent = data.content.replace(/'/g, "\\'");
        const escapedImages = imagesJson ? `'${imagesJson.replace(/'/g, "\\'")}'` : 'NULL';
        const escapedMeta = metadataJson ? `'${metadataJson.replace(/'/g, "\\'")}'` : 'NULL';
        const escapedGroup = groupId ? `'${groupId}'` : 'NULL';

        await prisma.$executeRawUnsafe(`
            INSERT INTO \`LeaderboardPost\` (id, authorId, groupId, content, images, type, isPinned, metadata, createdAt, updatedAt)
            VALUES ('${postId}', '${currentUser.id}', ${escapedGroup}, '${escapedContent}', ${escapedImages}, '${postType}', 0, ${escapedMeta}, NOW(3), NOW(3))
        `);
        newPost = { id: postId, authorId: currentUser.id, content: data.content };
    }

    // Handle mentions
    const mentionedIds = Array.from(new Set(data.mentionedUserIds || []));
    if (mentionedIds.length > 0) {
        await Promise.all(
            mentionedIds.map(async (targetUserId) => {
                if (targetUserId === currentUser.id) return;

                const mentionId = genId();
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
                    console.error('Lỗi gửi email tag tên:', emailErr);
                }
            })
        );
    }

    revalidatePath('/leaderboard');
    return { success: true, post: newPost };
}

// =============================================================
// 7. INTERACTIONS (REACTION, COMMENT, PIN, DELETE, SEARCH)
// =============================================================
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

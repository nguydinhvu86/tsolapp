import React from 'react';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getLeaderboardData, getSocialFeed } from './actions';
import LeaderboardClient from './LeaderboardClient';

export const metadata: Metadata = {
    title: 'Bảng Vinh Danh & Thi Đua Nội Bộ | T-SOLUTION',
    description: 'Nơi vinh danh các chiến binh xuất sắc, xếp hạng thi đua doanh số, khách hàng và không gian chia sẻ nội bộ.',
};

export default async function LeaderboardPage() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        redirect('/login');
    }

    const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email },
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

    if (!currentUser) {
        redirect('/login');
    }

    const [initialLeaderboard, initialFeed] = await Promise.all([
        getLeaderboardData({ criteria: 'REVENUE', timeRange: 'THIS_MONTH' }),
        getSocialFeed({ page: 1, limit: 20 })
    ]);

    return (
        <LeaderboardClient
            initialLeaderboard={initialLeaderboard}
            initialFeed={initialFeed}
            currentUser={currentUser}
        />
    );
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import MonitoringClient from './MonitoringClient';

export const dynamic = 'force-dynamic';

export default async function PersonnelMonitoringPage() {
    // Chỉ Admin hoặc HR mới được xem
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
        redirect('/dashboard');
    }

    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            lastActiveAt: true,
            currentPlatform: true,
            _count: {
                select: { loginLogs: true }
            }
        },
        orderBy: {
            name: 'asc'
        }
    });

    return <MonitoringClient users={users} />;
}

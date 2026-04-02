'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';

export async function toggleUserActiveStatus(userId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return { success: false, error: 'Unauthorized' };
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { isActive: true, email: true }
        });

        if (!user) {
            return { success: false, error: 'Người dùng không tồn tại' };
        }

        // Prevent deactivating super admin (optional safeguard)
        if (user.email === 'nguydinhvu86@gmail.com' || user.email === 'admin@tsol.vn') {
            return { success: false, error: 'Không thể khóa tài khoản quản trị viên cấp cao.' };
        }

        const newStatus = !user.isActive;

        await prisma.user.update({
            where: { id: userId },
            data: { isActive: newStatus }
        });

        revalidatePath('/hr/monitoring');

        return {
            success: true,
            message: newStatus ? 'Đã kích hoạt tài khoản thành công.' : 'Đã khóa tài khoản thành công.'
        };

    } catch (error: any) {
        console.error('Toggle User Status Error:', error);
        return { success: false, error: error.message || 'Lỗi hệ thống' };
    }
}

export async function getUserLoginLogs(userId: string) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== 'ADMIN') {
            return { success: false, error: 'Unauthorized' };
        }

        const logs = await prisma.loginLog.findMany({
            where: { userId },
            orderBy: { loginAt: 'desc' },
            take: 50
        });

        return { success: true, data: logs };
    } catch (error: any) {
        console.error('Get Login Logs Error:', error);
        return { success: false, error: 'Lỗi hệ thống khi tải lịch sử' };
    }
}

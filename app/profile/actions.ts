'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function getProfile() {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatar: true,
            twoFactorEnabled: true
        }
    });

    if (!user) throw new Error('Không tìm thấy người dùng');
    return user;
}

export type UpdateProfileData = {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
};

export async function updateProfile(data: UpdateProfileData) {
    const session = await getServerSession(authOptions);
    if (!session) {
        throw new Error('Unauthorized');
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
            id: true,
            name: true,
            password: true,
            email: true,
            role: true
        }
    });

    if (!user) {
        throw new Error('Không tìm thấy tài khoản người dùng');
    }

    const updateData: any = {};

    if (data.name !== undefined && data.name !== user.name) {
        updateData.name = data.name;
    }

    // Nếu muốn đổi mật khẩu, phải xác minh mật khẩu cũ
    if (data.newPassword && data.newPassword.trim() !== '') {
        if (!data.currentPassword) {
            throw new Error('Vui lòng nhập mật khẩu hiện tại để xác minh.');
        }

        const isPasswordValid = await bcrypt.compare(data.currentPassword, user.password);
        if (!isPasswordValid) {
            throw new Error('Mật khẩu hiện tại không chính xác.');
        }

        updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    // Nếu không có gì để update
    if (Object.keys(updateData).length === 0) {
        return user;
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData
    });

    revalidatePath('/profile');
    // Có thể cần refresh cả layout nếu tên hiển thị trên Header thay đổi
    revalidatePath('/', 'layout');

    return { success: true };
}

export async function getEnhancedProfileStats() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) throw new Error('Unauthorized');
    const userId = session.user.id;

    // 1. Total Revenue and Debt from Sales Invoices where user is salesperson
    const invoices = await prisma.salesInvoice.findMany({
        where: {
            salespersonId: userId,
            status: { notIn: ['DRAFT', 'CANCELLED'] }
        },
        select: { totalAmount: true, paidAmount: true }
    });

    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalDebt = invoices.reduce((sum, inv) => sum + ((inv.totalAmount || 0) - (inv.paidAmount || 0)), 0);

    // 2. Active Tasks assigned to user
    const assignedTasks = await prisma.task.findMany({
        where: {
            assignees: { some: { userId } },
            status: { in: ['TODO', 'IN_PROGRESS', 'REVIEW'] }
        },
        include: {
            customer: { select: { name: true } }
        },
        orderBy: [
            { priority: 'asc' }, // usually URGENT/HIGH are ordered? Wait, let's sort by dueDate
            { dueDate: 'asc' }
        ],
        take: 10
    });

    // 3. Recent Activities (combining a few logs)
    // Prisma doesn't support UNION easily, so we fetch top 5 from Customer, Task, Estimate, Invoice Activity Logs and merge in memory.
    const [customerLogs, taskLogs, estimateLogs, invoiceLogs] = await Promise.all([
        prisma.customerActivityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10, include: { customer: { select: { name: true } } } }),
        prisma.taskActivityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10, include: { task: { select: { title: true } } } }),
        prisma.salesEstimateActivityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10, include: { estimate: { select: { code: true } } } }),
        prisma.salesInvoiceActivityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 10, include: { invoice: { select: { code: true } } } }),
    ]);

    let activities = [
        ...customerLogs.map(l => ({ id: `cust-${l.id}`, date: l.createdAt, action: l.action, details: l.details, entity: l.customer?.name, type: 'CUSTOMER' })),
        ...taskLogs.map(l => ({ id: `task-${l.id}`, date: l.createdAt, action: l.action, details: l.details, entity: l.task?.title, type: 'TASK' })),
        ...estimateLogs.map(l => ({ id: `est-${l.id}`, date: l.createdAt, action: l.action, details: l.details, entity: l.estimate?.code, type: 'ESTIMATE' })),
        ...invoiceLogs.map(l => ({ id: `inv-${l.id}`, date: l.createdAt, action: l.action, details: l.details, entity: l.invoice?.code, type: 'INVOICE' }))
    ];

    // Sort descending by date and take top 15
    activities.sort((a, b) => b.date.getTime() - a.date.getTime());
    activities = activities.slice(0, 15);

    return {
        revenue: totalRevenue,
        debt: totalDebt,
        tasks: assignedTasks,
        activities
    };
}

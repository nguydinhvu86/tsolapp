import React from 'react';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SupplierDetailClient } from './SupplierDetailClient';

export default async function SupplierDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session) {
        redirect('/login');
    }

    // Fetch supplier with related data
    const supplier = await prisma.supplier.findUnique({
        where: { id: params.id },
        include: {
            products: {
                include: { product: true }
            },
            orders: {
                orderBy: { date: 'desc' },
                include: { _count: { select: { items: true } } }
            },
            bills: {
                orderBy: { date: 'desc' },
                include: { _count: { select: { items: true } } }
            },
            payments: {
                orderBy: { date: 'desc' }
            },
            tasks: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!supplier) {
        return (
            <div className="p-8 text-center bg-gray-50 flex items-center justify-center min-h-[50vh]">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Không tìm thấy Nhà cung cấp</h2>
                    <p className="text-gray-500">ID nhà cung cấp không hợp lệ hoặc đã bị xóa.</p>
                </div>
            </div>
        );
    }

    // Note: We already fetch supplier.tasks above, but to use TaskPanel we can query rich tasks with assignees
    const tasks = await prisma.task.findMany({
        where: { supplierId: params.id },
        include: {
            assignees: { include: { user: { select: { name: true, email: true } } } },
            checklists: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true }, orderBy: { name: 'asc' } });

    return <SupplierDetailClient supplier={supplier} users={users} tasks={tasks} />;
}

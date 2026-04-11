import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PurchaseBillDetailClient } from './PurchaseBillDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export default async function PurchaseBillDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    const perms = (session.user.permissions as string[]) || [];
    const viewFilter = buildViewFilter(session.user.id, perms, 'PURCHASE_BILLS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return notFound();

    const bill = await prisma.purchaseBill.findFirst({
        where: { id: params.id, ...viewFilter },
        include: {
            supplier: true,
            order: true,
            items: {
                include: {
                    product: true
                }
            },
            allocations: {
                include: {
                    payment: true
                }
            },
            creator: {
                select: { name: true, email: true }
            }
        }
    });

    if (!bill) {
        notFound();
    }

    const tasks = await prisma.task.findMany({
        where: { purchaseBillId: bill.id },
        include: {
            assignees: {
                include: {
                    user: {
                        select: { name: true, email: true }
                    }
                }
            },
            checklists: true
        },
        orderBy: { createdAt: 'desc' }
    });

    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' }
    });

    const warehouses = await prisma.warehouse.findMany({
        select: { id: true, name: true }
    });

    return <PurchaseBillDetailClient bill={bill} tasks={tasks} users={users} warehouses={warehouses} />;
}

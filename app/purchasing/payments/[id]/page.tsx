import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PurchasePaymentDetailClient } from './PurchasePaymentDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export default async function PurchasePaymentDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    const perms = (session.user.permissions as string[]) || [];
    const viewFilter = buildViewFilter(session.user.id, perms, 'PURCHASE_PAYMENTS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return notFound();

    const payment = await prisma.purchasePayment.findFirst({
        where: { id: params.id, ...viewFilter },
        include: {
            supplier: true,
            allocations: {
                include: {
                    bill: true
                }
            },
            creator: {
                select: { name: true, email: true }
            }
        }
    });

    if (!payment) {
        notFound();
    }

    const tasks = await prisma.task.findMany({
        where: { purchasePaymentId: payment.id },
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

    return <PurchasePaymentDetailClient payment={payment} tasks={tasks} users={users} />;
}

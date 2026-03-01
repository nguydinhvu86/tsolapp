import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PurchasePaymentDetailClient } from './PurchasePaymentDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function PurchasePaymentDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const payment = await prisma.purchasePayment.findUnique({
        where: { id: params.id },
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

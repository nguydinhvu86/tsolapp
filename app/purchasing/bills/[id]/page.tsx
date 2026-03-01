import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PurchaseBillDetailClient } from './PurchaseBillDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function PurchaseBillDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const bill = await prisma.purchaseBill.findUnique({
        where: { id: params.id },
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

    return <PurchaseBillDetailClient bill={bill} tasks={tasks} users={users} />;
}

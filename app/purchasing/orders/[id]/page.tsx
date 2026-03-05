import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PurchaseOrderDetailClient } from './PurchaseOrderDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getTemplatesByModule } from '@/app/email-templates/actions';

export default async function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const order = await prisma.purchaseOrder.findUnique({
        where: { id: params.id },
        include: {
            supplier: true,
            items: {
                include: {
                    product: true
                }
            },
            bills: true,
            creator: {
                select: { name: true, email: true }
            }
        }
    });

    if (!order) {
        notFound();
    }

    const tasks = await prisma.task.findMany({
        where: { purchaseOrderId: order.id },
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

    const poTemplates = await getTemplatesByModule('PURCHASE_ORDER');
    const generalTemplates = await getTemplatesByModule('GENERAL');
    const allTemplates = [...poTemplates, ...generalTemplates];

    return <PurchaseOrderDetailClient order={order} tasks={tasks} users={users} emailTemplates={allTemplates} />;
}

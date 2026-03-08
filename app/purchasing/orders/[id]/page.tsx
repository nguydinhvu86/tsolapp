import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PurchaseOrderDetailClient } from './PurchaseOrderDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getTemplatesByModule } from '@/app/email-templates/actions';
import { buildViewFilter } from '@/lib/permissions';

export default async function PurchaseOrderDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    const perms = (session.user.permissions as string[]) || [];
    const viewFilter = buildViewFilter(session.user.id, perms, 'PURCHASE_ORDERS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return notFound();

    const order = await prisma.purchaseOrder.findFirst({
        where: { id: params.id, ...viewFilter },
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

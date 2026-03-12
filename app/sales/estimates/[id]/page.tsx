import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import { getTemplatesByModule } from '@/app/email-templates/actions';
import SalesEstimateDetailClient from './SalesEstimateDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { buildViewFilter } from '@/lib/permissions';

export default async function SalesEstimateDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const session = await getServerSession(authOptions);
    if (!session || !session.user) return notFound();

    const perms = (session.user.permissions as string[]) || [];
    const viewFilter = buildViewFilter(session.user.id, perms, 'SALES_ESTIMATES', 'creatorId', true);
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') return notFound();

    const estimate = await prisma.salesEstimate.findFirst({
        where: { id, ...viewFilter },
        include: {
            customer: true,
            creator: { select: { id: true, name: true, email: true } },
            items: {
                include: {
                    product: true
                }
            },
            activityLogs: {
                include: { user: { select: { name: true, email: true } } },
                orderBy: { createdAt: 'desc' }
            },
            EmailLog: {
                include: { sender: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            },
            tasks: {
                include: {
                    assignees: { include: { user: true } },
                    checklists: { include: { completedBy: true } },
                    comments: { include: { user: true } },
                    creator: true,
                    observers: { include: { user: true } }
                },
                orderBy: { createdAt: 'desc' }
            },
            managers: true
        }
    });

    if (!estimate) {
        notFound();
    }

    // Lazy evaluate EXPIRED status
    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0, 0, 0, 0);

    if (estimate.status === 'SENT' && estimate.validUntil && new Date(estimate.validUntil).setHours(0, 0, 0, 0) < todayAtMidnight.getTime()) {
        await prisma.salesEstimate.update({
            where: { id: estimate.id },
            data: { status: 'EXPIRED' }
        });
        estimate.status = 'EXPIRED';
    }

    const [customers, products, users, templates] = await Promise.all([
        getCustomers(),
        getProducts(),
        prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: 'asc' }
        }),
        getTemplatesByModule('ESTIMATE')
    ]);

    const generalTemplates = await getTemplatesByModule('GENERAL');
    const allTemplates = [...templates, ...generalTemplates];

    // Map EmailLog to emailLogs for standardized Client usage
    const mappedEstimate = {
        ...estimate,
        emailLogs: estimate.EmailLog || []
    };

    return (
        <SalesEstimateDetailClient
            initialData={mappedEstimate}
            customers={customers}
            products={products.filter((p: any) => p.isActive)}
            users={users.filter((u: any) => u.role !== 'SYSTEM')}
            emailTemplates={allTemplates}
        />
    );
}

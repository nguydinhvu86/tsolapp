import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { SalesPaymentDetailClient } from './SalesPaymentDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { getTemplatesByModule } from '@/app/email-templates/actions';

export default async function SalesPaymentDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    const perms = (session.user.permissions as string[]) || [];
    const isViewAll = perms.includes('SALES_PAYMENTS_VIEW_ALL');
    const isViewOwn = perms.includes('SALES_PAYMENTS_VIEW_OWN');

    if (!isViewAll && !isViewOwn) return notFound();

    const authFilter = (!isViewAll && isViewOwn) ? { creatorId: session.user.id } : {};

    const payment = await prisma.salesPayment.findFirst({
        where: { id: params.id, ...authFilter },
        include: {
            customer: true,
            allocations: {
                include: {
                    invoice: true
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
        where: { salesPaymentId: payment.id },
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

    const unpaidInvoices = await prisma.salesInvoice.findMany({
        where: {
            customerId: payment.customerId,
            status: { in: ['ISSUED', 'PARTIAL_PAID'] }
        },
        include: {
            allocations: true
        }
    });

    const paymentTemplates = await getTemplatesByModule('PAYMENT_CONFIRMATION');
    const generalTemplates = await getTemplatesByModule('GENERAL');
    const allTemplates = [...paymentTemplates, ...generalTemplates];

    return <SalesPaymentDetailClient payment={payment} tasks={tasks} users={users} unpaidInvoices={unpaidInvoices} emailTemplates={allTemplates} />;
}

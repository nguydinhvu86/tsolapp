import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import { getTemplatesByModule } from '@/app/email-templates/actions';
import SalesInvoiceDetailClient from './SalesInvoiceDetailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function SalesInvoiceDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const session = await getServerSession(authOptions);
    if (!session || !session.user) return notFound();

    const perms = (session.user.permissions as string[]) || [];
    const isViewAll = perms.includes('SALES_INVOICES_VIEW_ALL');
    const isViewOwn = perms.includes('SALES_INVOICES_VIEW_OWN');

    if (!isViewAll && !isViewOwn) return notFound();

    const authFilter = (!isViewAll && isViewOwn) ? {
        OR: [{ creatorId: session.user.id }, { salespersonId: session.user.id }]
    } : {};

    const invoice = await prisma.salesInvoice.findFirst({
        where: { id, ...authFilter },
        include: {
            customer: true,
            order: true,
            allocations: {
                include: {
                    payment: true
                }
            },
            creator: { select: { id: true, name: true, email: true } },
            items: {
                include: {
                    product: true
                }
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
            invoiceNotes: {
                include: { user: true },
                orderBy: { createdAt: 'desc' }
            },
            activityLogs: {
                include: { user: true },
                orderBy: { createdAt: 'desc' }
            },
            emailLogs: {
                include: { sender: { select: { name: true } } },
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!invoice) {
        notFound();
    }

    const [customers, products, users, templates] = await Promise.all([
        getCustomers(),
        getProducts(),
        prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: 'asc' }
        }),
        getTemplatesByModule('INVOICE')
    ]);

    const generalTemplates = await getTemplatesByModule('GENERAL');
    const allTemplates = [...templates, ...generalTemplates];

    return (
        <SalesInvoiceDetailClient
            initialData={invoice}
            customers={customers}
            products={products.filter((p: any) => p.isActive)}
            users={users.filter((u: any) => u.role !== 'SYSTEM')}
            emailTemplates={allTemplates}
        />
    );
}

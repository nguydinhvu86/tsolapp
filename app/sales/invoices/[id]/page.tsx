import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import SalesInvoiceDetailClient from './SalesInvoiceDetailClient';

export default async function SalesInvoiceDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const invoice = await prisma.salesInvoice.findUnique({
        where: { id },
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
            }
        }
    });

    if (!invoice) {
        notFound();
    }

    const [customers, products, users] = await Promise.all([
        getCustomers(),
        getProducts(),
        prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true },
            orderBy: { name: 'asc' }
        })
    ]);

    return (
        <SalesInvoiceDetailClient
            initialData={invoice}
            customers={customers}
            products={products.filter((p: any) => p.isActive)}
            users={users.filter((u: any) => u.role !== 'SYSTEM')}
        />
    );
}

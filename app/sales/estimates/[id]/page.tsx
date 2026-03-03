import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import SalesEstimateDetailClient from './SalesEstimateDetailClient';

export default async function SalesEstimateDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const estimate = await prisma.salesEstimate.findUnique({
        where: { id },
        include: {
            customer: true,
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

    if (!estimate) {
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
        <SalesEstimateDetailClient
            initialData={estimate}
            customers={customers}
            products={products.filter((p: any) => p.isActive)}
            users={users.filter((u: any) => u.role !== 'SYSTEM')}
        />
    );
}

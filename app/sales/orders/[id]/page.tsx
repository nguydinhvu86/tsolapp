import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import SalesOrderDetailClient from './SalesOrderDetailClient';

export default async function SalesOrderDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const order = await prisma.salesOrder.findUnique({
        where: { id },
        include: {
            customer: true,
            creator: { select: { id: true, name: true, email: true } },
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!order) {
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
        <SalesOrderDetailClient
            initialData={order}
            customers={customers}
            products={products.filter((p: any) => p.isActive)}
            users={users.filter((u: any) => u.role !== 'SYSTEM')}
        />
    );
}

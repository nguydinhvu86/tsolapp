import { getPurchaseBills, getSuppliers, getPurchaseOrders } from '@/app/purchasing/actions';
import { prisma } from '@/lib/prisma';
import { PurchaseBillClient } from './PurchaseBillClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function PurchaseBillsPage({ searchParams }: { searchParams: { action?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canCreate = permissions.includes('PURCHASE_BILLS_CREATE') || (session?.user as any)?.role === 'ADMIN';
    if (searchParams?.action === 'new' && !canCreate) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }

    const bills = await getPurchaseBills();
    const suppliers = await getSuppliers();
    const orders = await getPurchaseOrders();

    const warehouses = await prisma.warehouse.findMany({
        orderBy: { name: 'asc' }
    });

    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, unit: true, importPrice: true, taxRate: true, description: true }
    });

    const projects = await (prisma as any).project.findMany({
        where: { status: { notIn: ['CANCELLED'] } },
        select: { id: true, name: true, code: true }
    });

    return (
        <PurchaseBillClient
            initialBills={bills as any[]}
            suppliers={suppliers}
            orders={orders as any[]}
            warehouses={warehouses}
            products={products}
            projects={projects}
        />
    );
}

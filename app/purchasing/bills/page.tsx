import { getPurchaseBills, getSuppliers, getPurchaseOrders } from '@/app/purchasing/actions';
import { prisma } from '@/lib/prisma';
import { PurchaseBillClient } from './PurchaseBillClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function PurchaseBillsPage() {
    const session = await getServerSession(authOptions);
    if (!session) return null;

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

    return (
        <PurchaseBillClient
            initialBills={bills as any[]}
            suppliers={suppliers}
            orders={orders as any[]}
            warehouses={warehouses}
            products={products}
        />
    );
}

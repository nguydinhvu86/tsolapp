import { getPurchaseOrders, getSuppliers } from '@/app/purchasing/actions';
import { prisma } from '@/lib/prisma';
import { PurchaseOrderClient } from './PurchaseOrderClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function PurchaseOrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const orders = await getPurchaseOrders();
    const suppliers = await getSuppliers();
    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, unit: true, importPrice: true }
    });

    return <PurchaseOrderClient initialOrders={orders as any[]} suppliers={suppliers} products={products} />;
}

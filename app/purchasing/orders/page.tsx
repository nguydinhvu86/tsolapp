import { getPurchaseOrders, getSuppliers } from '@/app/purchasing/actions';
import { prisma } from '@/lib/prisma';
import { PurchaseOrderClient } from './PurchaseOrderClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PurchaseOrdersPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) redirect('/login');

    const isAdmin = session.user.role === 'ADMIN';
    const perms = (session.user.permissions as string[]) || [];
    const isViewAll = isAdmin || perms.includes('PURCHASE_ORDERS_VIEW_ALL');
    const isViewOwn = perms.includes('PURCHASE_ORDERS_VIEW_OWN');

    if (!isViewAll && !isViewOwn) {
        return (
            <div className="p-8 text-center text-slate-500 font-semibold">
                Bạn không có quyền truy cập Đơn Mua Hàng.
            </div>
        );
    }

    const orders = await getPurchaseOrders();
    const suppliers = await getSuppliers();
    const products = await prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, sku: true, unit: true, importPrice: true, taxRate: true, description: true }
    });

    return <PurchaseOrderClient initialOrders={orders as any[]} suppliers={suppliers} products={products} />;
}

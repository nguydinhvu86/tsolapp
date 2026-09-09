import { getStockValuation } from '../report-actions';
import { getProducts, getWarehouses } from '../actions';
import { prisma } from '@/lib/prisma';
import ReportsClient from './ReportsClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

export default async function ReportsPage(props: { searchParams: Promise<any> }) {
    const session = await getServerSession(authOptions);
    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canView = permissions.includes('INVENTORY_TX_VIEW_ALL') || permissions.includes('INVENTORY_TX_VIEW_OWN') || (session?.user as any)?.role === 'ADMIN';
    if (!canView) {
        redirect('/dashboard');
    }

    const searchParams = await props.searchParams;
    const warehouseId = searchParams?.warehouseId || undefined;
    const groupId = searchParams?.groupId || undefined;

    // Server fetch for initial dashboard data
    const valuationData = await getStockValuation(warehouseId, undefined, groupId);

    // Dictionaries for the Ledger filter
    const products = await getProducts('PRODUCT');
    const warehouses = await getWarehouses();
    const productGroups = await (prisma as any).productGroup.findMany({ orderBy: { name: 'asc' } });

    return (
        <div className="space-y-6 w-full">
            <ReportsClient
                initialValuation={valuationData}
                products={products}
                warehouses={warehouses}
                productGroups={productGroups}
            />
        </div>
    );
}

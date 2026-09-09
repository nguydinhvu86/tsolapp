import { prisma } from '@/lib/prisma';
import WarehouseClient from './WarehouseClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

export default async function WarehousesPage() {
    const session = await getServerSession(authOptions);
    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canView = permissions.includes('WAREHOUSES_VIEW_ALL') || permissions.includes('WAREHOUSES_VIEW_OWN') || (session?.user as any)?.role === 'ADMIN';
    if (!canView) {
        redirect('/dashboard');
    }
    const warehouses = await (prisma as any).warehouse.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="space-y-6 w-full">
            <WarehouseClient initialWarehouses={warehouses} />
        </div>
    );
}

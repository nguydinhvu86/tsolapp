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
        <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Danh Sách Kho Hàng
            </h1>
            <WarehouseClient initialWarehouses={warehouses} />
        </div>
    );
}

import { prisma } from '@/lib/prisma';
import WarehouseClient from './WarehouseClient';

export default async function WarehousesPage() {
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

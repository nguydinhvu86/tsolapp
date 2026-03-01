import { prisma } from '@/lib/prisma';
import { CustomerClient } from './CustomerClient';

export default async function CustomersPage() {
    const customers = await prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Quản lý Khách hàng</h1>
            </div>
            <CustomerClient initialData={customers} />
        </div>
    );
}

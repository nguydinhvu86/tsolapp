import { prisma } from '@/lib/prisma';
import { CustomerClient } from './CustomerClient';

export default async function CustomersPage() {
    const rawCustomers = await prisma.customer.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            salesInvoices: {
                select: {
                    status: true,
                    totalAmount: true
                }
            },
            activityLogs: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { createdAt: true }
            }
        }
    });

    const customersWithStats = rawCustomers.map((c: any) => {
        // Calculate revenue from valid invoices
        const revenue = c.salesInvoices.reduce((sum: number, inv: any) => {
            if (['ISSUED', 'PARTIAL_PAID', 'PAID'].includes(inv.status)) {
                return sum + inv.totalAmount;
            }
            return sum;
        }, 0);

        // Get last activity date or fallback to customer creation date
        const lastActivityAt = c.activityLogs?.length > 0
            ? c.activityLogs[0].createdAt
            : c.createdAt;

        // Strip included relations to keep payload light, or ignore them in client
        const { salesInvoices, activityLogs, ...rest } = c;

        return {
            ...rest,
            revenue,
            lastActivityAt
        };
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Quản lý Khách hàng</h1>
            </div>
            <CustomerClient initialData={customersWithStats as any} />
        </div>
    );
}

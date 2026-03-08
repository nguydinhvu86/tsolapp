import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CustomerClient } from './CustomerClient';

export default async function CustomersPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        redirect('/login');
    }

    const employeeIdFromUrl = typeof searchParams?.employeeId === 'string' ? searchParams.employeeId : undefined;
    const isAdminOrManager = session.user.role === 'ADMIN' || session.user.role === 'MANAGER';

    let effectiveEmployeeId: string | undefined = undefined;
    if (!isAdminOrManager) {
        effectiveEmployeeId = session.user.id;
    } else if (employeeIdFromUrl) {
        effectiveEmployeeId = employeeIdFromUrl;
    }

    const customerFilter = effectiveEmployeeId ? {
        OR: [
            { creatorId: effectiveEmployeeId },
            {
                salesInvoices: {
                    some: {
                        OR: [
                            { creatorId: effectiveEmployeeId },
                            { salespersonId: effectiveEmployeeId }
                        ]
                    }
                }
            },
            {
                salesEstimates: {
                    some: {
                        OR: [
                            { creatorId: effectiveEmployeeId },
                            { salespersonId: effectiveEmployeeId }
                        ]
                    }
                }
            }
        ]
    } : {};

    const [rawCustomers, users] = await Promise.all([
        prisma.customer.findMany({
            where: customerFilter,
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
                }
            }
        }),
        isAdminOrManager ? prisma.user.findMany({ select: { id: true, name: true, avatar: true }, orderBy: { name: 'asc' } }) : Promise.resolve([])
    ]);
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
            <CustomerClient
                initialData={customersWithStats as any}
                users={users}
                isAdminOrManager={isAdminOrManager}
            />
        </div>
    );
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { CustomerClient } from './CustomerClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        redirect('/login');
    }

    const permissions = session.user.permissions as string[] || [];
    const canCreate = permissions.includes('CUSTOMERS_CREATE') || session.user.role === 'ADMIN';
    if (searchParams?.action === 'new' && !canCreate) {
        redirect('/dashboard');
    }

    const employeeIdFromUrl = typeof searchParams?.employeeId === 'string' ? searchParams.employeeId : undefined;
    const viewAll = permissions.includes('CUSTOMERS_VIEW_ALL');
    const isAdminOrManager = session.user.role === 'ADMIN' || session.user.role === 'MANAGER' || viewAll;

    let effectiveEmployeeId: string | undefined = undefined;
    if (!isAdminOrManager) {
        effectiveEmployeeId = session.user.id;
    } else if (employeeIdFromUrl) {
        effectiveEmployeeId = employeeIdFromUrl;
    }

    const customerFilter = effectiveEmployeeId ? {
        OR: [
            { activityLogs: { some: { userId: effectiveEmployeeId } } },
            { managers: { some: { id: effectiveEmployeeId } } },
            { quotes: { some: { creatorId: effectiveEmployeeId } } },
            { contracts: { some: { creatorId: effectiveEmployeeId } } },
            { leads: { some: { creatorId: effectiveEmployeeId } } },
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
            },
            {
                salesOrders: {
                    some: {
                        creatorId: effectiveEmployeeId
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
                        totalAmount: true,
                        paidAmount: true
                    }
                },
                activityLogs: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: { createdAt: true }
                }
            }
        }),
        isAdminOrManager ? prisma.user.findMany({ select: { id: true, name: true, avatar: true }, orderBy: { name: 'asc' } }) : Promise.resolve([])
    ]);

    const customersWithStats = rawCustomers.map((c: any) => {
        // Filter valid invoices (ignoring DRAFT and CANCELLED)
        const validInvoices = (c.salesInvoices || []).filter((inv: any) => !['DRAFT', 'CANCELLED'].includes(inv.status));
        
        // Calculate revenue from valid invoices
        const revenue = validInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.totalAmount) || 0), 0);
        
        // Calculate paid amount from valid invoices
        const exactPayments = validInvoices.reduce((sum: number, inv: any) => sum + (Number(inv.paidAmount) || 0), 0);
        
        // Dynamic live debt matching customer details and statement
        const computedDebt = revenue - exactPayments;

        // Get last activity date or fallback to customer creation date
        const lastActivityAt = c.activityLogs?.length > 0
            ? c.activityLogs[0].createdAt
            : c.createdAt;

        // Strip included relations to keep payload light, or ignore them in client
        const { salesInvoices, activityLogs, ...rest } = c;

        return {
            ...rest,
            totalDebt: computedDebt,
            createdAt: rest.createdAt ? rest.createdAt.toISOString() : null,
            updatedAt: rest.updatedAt ? rest.updatedAt.toISOString() : null,
            revenue,
            lastActivityAt: lastActivityAt ? new Date(lastActivityAt).toISOString() : null
        };
    });

    return (
        <CustomerClient
            initialData={customersWithStats as any}
            users={users}
            isAdminOrManager={isAdminOrManager}
            initialEmployeeId={employeeIdFromUrl}
        />
    );
}

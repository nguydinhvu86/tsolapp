import { getSalesReportData } from './actions';
import { SalesReportClient } from './SalesReportClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';

export default async function SalesReportsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);
    const [data, users] = await Promise.all([
        getSalesReportData(typeof searchParams?.employeeId === 'string' ? searchParams.employeeId : undefined),
        prisma.user.findMany({ select: { id: true, name: true, avatar: true }, orderBy: { name: 'asc' } })
    ]);

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <SalesReportClient
                customers={data.customers}
                invoices={data.invoices}
                payments={data.payments}
                expenses={data.expenses}
                estimates={data.estimates}
                users={users}
                isAdminOrManager={session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER'}
            />
        </div>
    );
}

import { getSalesEstimates, getNextEstimateCode } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import { getLeads } from '@/app/sales/leads/actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import SalesEstimateClient from './SalesEstimateClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Báo Giá Kinh Doanh | ContractMgr',
};

export const dynamic = 'force-dynamic';

export default async function SalesEstimatesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);

    // Accept URL parameter for filtering
    const employeeId = typeof searchParams?.employeeId === 'string' ? searchParams.employeeId : undefined;

    const [estimates, customers, products, leads, nextCode, users] = await Promise.all([
        getSalesEstimates(employeeId),
        getCustomers(),
        getProducts(),
        getLeads(employeeId),
        getNextEstimateCode(),
        prisma.user.findMany({ select: { id: true, name: true, avatar: true }, orderBy: { name: 'asc' } })
    ]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                Quản Lý Báo Giá Bán Hàng (ERP)
            </h1>
            <div className="text-xs bg-gray-100 p-2 text-red-600 mb-4 whitespace-pre-wrap max-h-[100px] overflow-auto">
                DEBUG PERMISSIONS ({session?.user?.name}): {JSON.stringify(session?.user?.permissions, null, 2)}
            </div>
            <SalesEstimateClient
                initialEstimates={estimates}
                customers={customers}
                products={products.filter((p: any) => p.isActive)}
                leads={leads}
                users={users}
                currentUserId={session?.user?.id}
                nextCode={nextCode}
                initialAction={typeof searchParams?.action === 'string' ? searchParams.action : undefined}
                initialCustomerId={typeof searchParams?.customerId === 'string' ? searchParams.customerId : undefined}
                initialLeadId={typeof searchParams?.leadId === 'string' ? searchParams.leadId : undefined}
                isAdminOrManager={session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER'}
            />
        </div>
    );
}

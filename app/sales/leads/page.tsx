import { getLeads } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { LeadsClient } from './LeadsClient';
import { Metadata } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Cơ Hội Bán Hàng (Leads) | ContractMgr',
};

export default async function LeadsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);
    const isAdminOrManager = session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';

    const employeeId = typeof searchParams?.employeeId === 'string' ? searchParams.employeeId : undefined;
    const leads = await getLeads(employeeId);

    const customers = await getCustomers();
    const { prisma } = await import('@/lib/prisma');
    const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });

    return <LeadsClient leads={leads} customers={customers} users={users} isAdminOrManager={isAdminOrManager} />;
}

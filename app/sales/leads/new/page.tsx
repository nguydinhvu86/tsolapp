import { Metadata } from 'next';
import { getCustomers } from '@/app/customers/actions';
import { LeadFormClient } from './LeadFormClient';

export const metadata: Metadata = {
    title: 'Thêm Cơ Hội Mới | ContractMgr',
};

export default async function NewLeadPage() {
    const customers = await getCustomers();
    const { prisma } = await import('@/lib/prisma');
    const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });

    return <LeadFormClient customers={customers} users={users} />;
}

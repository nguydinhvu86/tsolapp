import { getLeads } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { LeadsClient } from './LeadsClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Cơ Hội Bán Hàng (Leads) | ContractMgr',
};

export default async function LeadsPage() {
    const leads = await getLeads();
    const customers = await getCustomers();
    // In a real app we might fetch users for assignment drop-downs too, but let's assume LeadsClient handles it or we pass it
    // For now we'll just fetch users inside the form if needed, or pass them:
    const { prisma } = await import('@/lib/prisma');
    const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });

    return <LeadsClient leads={leads} customers={customers} users={users} />;
}

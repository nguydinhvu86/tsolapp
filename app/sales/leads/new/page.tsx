import { Metadata } from 'next';
import { getCustomers } from '@/app/customers/actions';
import { LeadFormClient } from './LeadFormClient';
import { getServerSession } from 'next-auth';
import { authOptions } from "@/lib/authOptions";

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Thêm Cơ Hội Mới | ContractMgr',
};

export default async function NewLeadPage() {
    const session = await getServerSession(authOptions);

    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canCreate = permissions.includes('CUSTOMERS_CREATE') || session?.user?.role === 'ADMIN';
    if (!canCreate) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }

    const customers = await getCustomers();
    const { prisma } = await import('@/lib/prisma');
    const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });

    // Get unique sources
    const leadSources = await prisma.leadSource.findMany({
        where: { isActive: true },
        select: { name: true },
        orderBy: { name: 'asc' }
    });
    const sources = leadSources.map(s => s.name);

    return <LeadFormClient customers={customers} users={users} sources={sources} currentUserId={session?.user?.id} />;
}

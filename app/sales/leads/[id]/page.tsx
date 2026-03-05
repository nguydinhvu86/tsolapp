import { Metadata } from 'next';
import { getLeadById } from '../actions';
import { getCustomers } from '@/app/customers/actions';
import { LeadDetailClient } from './LeadDetailClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    try {
        const lead = await getLeadById(params.id);
        return {
            title: `${lead.code} - ${lead.name} | Cơ Hội Bán Hàng`,
        };
    } catch (e) {
        return {
            title: 'Chi tiết Cơ hội | ContractMgr'
        }
    }
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
    try {
        const [lead, customers, { prisma }] = await Promise.all([
            getLeadById(params.id),
            getCustomers(),
            import('@/lib/prisma')
        ]);

        const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });

        if (!lead) return notFound();

        return <LeadDetailClient lead={lead} customers={customers} users={users} />;
    } catch (error) {
        console.error(error);
        return notFound();
    }
}

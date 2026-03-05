import { Metadata } from 'next';
import { getLeadById } from '../../actions';
import { getCustomers } from '@/app/customers/actions';
import { LeadFormClient } from '../../new/LeadFormClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    try {
        const lead = await getLeadById(params.id);
        return {
            title: `Sửa ${lead.code} | Cơ Hội Bán Hàng`,
        };
    } catch (e) {
        return {
            title: 'Sửa Cơ hội | ContractMgr'
        }
    }
}

export default async function EditLeadPage({ params }: { params: { id: string } }) {
    try {
        const [lead, customers, { prisma }] = await Promise.all([
            getLeadById(params.id),
            getCustomers(),
            import('@/lib/prisma')
        ]);

        const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });

        if (!lead) return notFound();

        return <LeadFormClient customers={customers} users={users} initialData={lead} />;
    } catch (error) {
        console.error(error);
        return notFound();
    }
}

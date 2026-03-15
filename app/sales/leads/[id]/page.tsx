import { Metadata } from 'next';
import { getLeadById } from '../actions';
import { getCustomers } from '@/app/customers/actions';
import { LeadDetailClient } from './LeadDetailClient';
import { notFound } from 'next/navigation';
import { getTemplatesByModule } from '@/app/email-templates/actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return notFound();

    try {
        const [lead, customers, { prisma }] = await Promise.all([
            getLeadById(params.id),
            getCustomers(),
            import('@/lib/prisma')
        ]);

        const users = await prisma.user.findMany({ select: { id: true, name: true, avatar: true } });

        if (!lead) return notFound();

        const leadTemplates = await getTemplatesByModule('LEAD');
        const generalTemplates = await getTemplatesByModule('GENERAL');
        const allTemplates = [...leadTemplates, ...generalTemplates];

        return <LeadDetailClient
            lead={lead}
            customers={customers}
            users={users}
            emailTemplates={allTemplates}
            currentUserId={session.user.id}
            currentUserRole={session.user.role || 'USER'}
        />;
    } catch (error: any) {
        console.error("Error loading Lead page:", error);
        if (error.message === 'Lead not found') return notFound();
        if (error.message === 'Unauthorized') return notFound();
        throw new Error(`Failed to load page: ${error.message}`);
    }
}

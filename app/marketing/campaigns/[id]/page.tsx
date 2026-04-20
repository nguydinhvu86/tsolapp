import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CampaignDetailClient from "./CampaignDetailClient";
import { buildViewFilter } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Chi tiết Chiến Dịch | ContractMgr',
};

export default async function CampaignDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const permissions = session.user.permissions as string[] || [];
    const isAdmin = session.user.role === 'ADMIN';

    const viewAll = permissions.includes('MARKETING_VIEW_ALL');
    const viewOwn = permissions.includes('MARKETING_VIEW_OWN');

    if (!isAdmin && !viewAll && !viewOwn) {
        redirect("/dashboard");
    }

    const campaign = await prisma.marketingCampaign.findUnique({
        where: { id: params.id },
        include: {
            category: true,
            creator: true,
            tasks: {
                include: {
                    assignees: { include: { user: { select: { id: true, name: true, email: true } } } },
                    observers: { include: { user: { select: { id: true, name: true, email: true } } } },
                    checklists: true,
                    comments: true
                },
                orderBy: { createdAt: 'desc' }
            },
            expenses: {
                include: {
                    category: true,
                    supplier: true,
                    customer: true,
                    creator: true,
                },
                orderBy: { createdAt: 'desc' }
            },
            forms: {
                orderBy: { createdAt: 'desc' }
            },
            participants: {
                orderBy: { createdAt: 'desc' }
            }
        }
    });

    if (!campaign) {
        redirect("/marketing/campaigns");
    }

    // Security check: viewOwn
    if (!isAdmin && !viewAll && viewOwn) {
        if (campaign.creatorId !== session.user.id) {
            redirect("/marketing/campaigns");
        }
    }

    const users = await prisma.user.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, email: true }
    });

    const expenseCategories = await prisma.expenseCategory.findMany({
        orderBy: { name: 'asc' }
    });
    
    const suppliers = await prisma.supplier.findMany({
         select: { id: true, name: true, phone: true }
    });

    const customers = await prisma.customer.findMany({
         select: { id: true, name: true, phone: true }
    });

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <CampaignDetailClient
                campaign={campaign}
                users={users}
                expenseCategories={expenseCategories}
                suppliers={suppliers}
                customers={customers}
                isAdmin={isAdmin}
                permissions={permissions}
            />
        </div>
    );
}

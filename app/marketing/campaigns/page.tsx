import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CampaignClient from "./CampaignClient";
import { buildViewFilter } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Quản lý Chiến Dịch | ContractMgr',
};

export default async function MarketingCampaignsPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
        redirect("/login");
    }

    const permissions = session.user.permissions as string[] || [];
    const isAdmin = session.user.role === 'ADMIN';

    const viewAll = permissions.includes('MARKETING_VIEW_ALL');
    const viewOwn = permissions.includes('MARKETING_VIEW_OWN');

    if (!isAdmin && !viewAll && !viewOwn) {
        if(!permissions.includes('MARKETING_VIEW')) {
            redirect("/dashboard");
        }
    }

    // Build the query filter for campaigns
    const viewFilter = isAdmin ? {} : buildViewFilter(session.user.id, permissions, 'MARKETING', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') {
        redirect("/dashboard");
    }

    const campaigns = await prisma.marketingCampaign.findMany({
        where: viewFilter,
        orderBy: { createdAt: 'desc' },
        include: {
            category: true,
            creator: {
                select: { id: true, name: true, email: true }
            },
            _count: {
                select: { participants: true, tasks: true, forms: true }
            }
        }
    });

    const categories = await prisma.marketingCategory.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Quản lý Chiến Dịch & Sự Kiện</h2>
            </div>
            <CampaignClient
                initialData={campaigns}
                categories={categories}
                isAdmin={isAdmin}
                permissions={permissions}
            />
        </div>
    );
}

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
        if (!permissions.includes('MARKETING_VIEW')) {
            redirect("/dashboard");
        }
    }

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
        <div className="w-full">
            <CampaignClient
                initialData={campaigns}
                categories={categories}
                isAdmin={isAdmin}
                permissions={permissions}
            />
        </div>
    );
}

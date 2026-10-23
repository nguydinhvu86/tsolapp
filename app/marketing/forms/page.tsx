import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import FormClient from "./FormClient";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Biểu Mẫu Đăng Ký | ContractMgr',
};

export default async function MarketingFormsPage() {
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

    let campaignFilter = {};
    if (!isAdmin && !viewAll && viewOwn) {
        campaignFilter = { creatorId: session.user.id };
    }

    const forms = await prisma.marketingForm.findMany({
        where: {
            campaign: campaignFilter
        },
        orderBy: { createdAt: 'desc' },
        include: {
            campaign: {
                select: { id: true, name: true, code: true }
            },
            _count: {
                select: { participants: true }
            }
        }
    });

    const campaigns = await prisma.marketingCampaign.findMany({
        where: campaignFilter,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, code: true }
    });

    return (
        <div className="w-full">
            <FormClient
                initialData={forms}
                campaigns={campaigns}
                isAdmin={isAdmin}
                permissions={permissions}
            />
        </div>
    );
}

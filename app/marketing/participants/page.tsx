import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ParticipantClient from "./ParticipantClient";

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Danh sách Người đăng ký | ContractMgr',
};

export default async function ParticipantsPage() {
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

    const participants = await prisma.marketingParticipant.findMany({
        where: {
            campaign: campaignFilter
        },
        orderBy: { createdAt: 'desc' },
        include: {
            campaign: { select: { id: true, name: true, code: true } },
            form: { select: { id: true, title: true } }
        }
    });

    const campaigns = await prisma.marketingCampaign.findMany({
        where: campaignFilter,
        orderBy: { name: 'asc' },
        select: { id: true, name: true }
    });

    return (
        <div className="w-full">
            <ParticipantClient
                initialData={participants}
                campaigns={campaigns}
                isAdmin={isAdmin}
                permissions={permissions}
            />
        </div>
    );
}

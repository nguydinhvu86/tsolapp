import { prisma } from '@/lib/prisma';
import { HandoverDashboardClient } from './HandoverDashboardClient';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { buildViewFilter } from '@/lib/permissions';

export default async function HandoversPage({
    searchParams,
}: {
    searchParams: { customerId?: string; templateId?: string; }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div>Unauthorized</div>;
    const permissions = session.user.permissions || [];

    const viewFilter = buildViewFilter(session.user.id, permissions, 'HANDOVERS', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') {
        return <div className="p-8 text-center text-red-500 font-bold">Bạn không có quyền truy cập trang này.</div>;
    }

    // If there are search params, filter the results
    const where: any = { ...viewFilter };
    if (searchParams.customerId) where.customerId = searchParams.customerId;
    if (searchParams.templateId) where.templateId = searchParams.templateId;

    const Handovers = await prisma.handover.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            customer: true,
            template: true,
        },
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Quản lý Biên bản bàn giao</h1>
            </div>
            <HandoverDashboardClient initialData={Handovers as any} />
        </div>
    );
}

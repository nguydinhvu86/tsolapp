import { prisma } from '@/lib/prisma';
import { QuoteDashboardClient } from './QuoteDashboardClient';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { buildViewFilter } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export default async function QuotesPage({
    searchParams,
}: {
    searchParams: { customerId?: string; templateId?: string; }
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return <div>Unauthorized</div>;
    const permissions = session.user.permissions || [];

    const viewFilter = buildViewFilter(session.user.id, permissions, 'QUOTES', 'creatorId');
    if (viewFilter.id === 'UNAUTHORIZED_NO_ACCESS') {
        return <div className="p-8 text-center text-red-500 font-bold">Bạn không có quyền truy cập trang này.</div>;
    }

    // If there are search params, filter the results
    const where: any = { ...viewFilter };
    if (searchParams.customerId) where.customerId = searchParams.customerId;
    if (searchParams.templateId) where.templateId = searchParams.templateId;

    const quotes = await prisma.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            customer: true,
            template: true,
            creator: {
                select: {
                    id: true,
                    name: true,
                    avatar: true,
                }
            }
        },
    });

    return <QuoteDashboardClient initialData={quotes as any} />;
}

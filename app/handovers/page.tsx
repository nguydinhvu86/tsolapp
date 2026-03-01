import { prisma } from '@/lib/prisma';
import { HandoverDashboardClient } from './HandoverDashboardClient';

export default async function HandoversPage({
    searchParams,
}: {
    searchParams: { customerId?: string; templateId?: string; }
}) {
    // If there are search params, filter the results
    const where: any = {};
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

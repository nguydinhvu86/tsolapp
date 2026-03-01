import { prisma } from '@/lib/prisma';
import { QuoteDashboardClient } from './QuoteDashboardClient';

export default async function QuotesPage({
    searchParams,
}: {
    searchParams: { customerId?: string; templateId?: string; }
}) {
    // If there are search params, filter the results
    const where: any = {};
    if (searchParams.customerId) where.customerId = searchParams.customerId;
    if (searchParams.templateId) where.templateId = searchParams.templateId;

    const quotes = await prisma.quote.findMany({
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
                <h1>Quản lý Báo giá</h1>
            </div>
            <QuoteDashboardClient initialData={quotes as any} />
        </div>
    );
}

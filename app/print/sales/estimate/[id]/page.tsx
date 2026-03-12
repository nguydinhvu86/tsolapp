import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PrintSalesEstimateClient from './PrintSalesEstimateClient';

export const dynamic = 'force-dynamic';

export default async function PrintSalesEstimatePage({ params }: { params: { id: string } }) {
    const { id } = params;

    const estimate = await prisma.salesEstimate.findUnique({
        where: { id },
        include: {
            customer: true,
            creator: { select: { id: true, name: true, email: true } },
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!estimate) {
        notFound();
    }

    // Lazy evaluate EXPIRED status
    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0, 0, 0, 0);

    if (estimate.status === 'SENT' && estimate.validUntil && new Date(estimate.validUntil).setHours(0, 0, 0, 0) < todayAtMidnight.getTime()) {
        await prisma.salesEstimate.update({
            where: { id: estimate.id },
            data: { status: 'EXPIRED' }
        });
        estimate.status = 'EXPIRED';
    }

    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: ['COMPANY_NAME', 'COMPANY_DISPLAY_NAME', 'COMPANY_FULL_NAME', 'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_ADDRESS', 'COMPANY_TAX']
            }
        }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    return (
        <PrintSalesEstimateClient
            estimate={estimate}
            settings={settingsMap}
        />
    );
}

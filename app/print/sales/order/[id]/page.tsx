import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PrintSalesOrderClient from './PrintSalesOrderClient';

export default async function PrintSalesOrderPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const order = await prisma.salesOrder.findUnique({
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

    if (!order) {
        notFound();
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
        <PrintSalesOrderClient
            order={order}
            settings={settingsMap}
        />
    );
}

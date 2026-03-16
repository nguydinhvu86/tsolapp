import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PrintSalesInvoiceClient from './PrintSalesInvoiceClient';

export const dynamic = 'force-dynamic';

export default async function PrintSalesInvoicePage({ params }: { params: { id: string } }) {
    const { id } = params;

    const invoice = await prisma.salesInvoice.findUnique({
        where: { id },
        include: {
            customer: true,
            creator: true,
            items: {
                include: {
                    product: true
                }
            }
        }
    });

    if (!invoice) {
        notFound();
    }

    const settings = await prisma.systemSetting.findMany({
        where: {
            key: {
                in: [
                    'COMPANY_NAME', 'COMPANY_DISPLAY_NAME', 'COMPANY_FULL_NAME', 'COMPANY_LOGO', 'COMPANY_PHONE', 'COMPANY_EMAIL', 'COMPANY_ADDRESS', 'COMPANY_TAX_CODE',
                    'WATERMARK_ENABLED', 'WATERMARK_TYPE', 'WATERMARK_TEXT', 'WATERMARK_IMAGE_URL', 'WATERMARK_OPACITY', 'WATERMARK_ROTATION', 'WATERMARK_COLOR', 'WATERMARK_SIZE', 'WATERMARK_DOCUMENTS'
                ]
            }
        }
    });

    const settingsMap: Record<string, string> = {};
    settings.forEach(s => settingsMap[s.key] = s.value);

    const companyInfo = {
        name: settingsMap['COMPANY_FULL_NAME'] || settingsMap['COMPANY_NAME'] || 'Tên Công Ty',
        address: settingsMap['COMPANY_ADDRESS'] || 'Địa chỉ công ty',
        phone: settingsMap['COMPANY_PHONE'] || '',
        email: settingsMap['COMPANY_EMAIL'] || '',
        taxCode: settingsMap['COMPANY_TAX_CODE'] || '',
        logo: settingsMap['COMPANY_LOGO'] || ''
    };

    return (
        <PrintSalesInvoiceClient
            invoice={invoice}
            companyInfo={companyInfo}
            settings={settingsMap}
        />
    );
}

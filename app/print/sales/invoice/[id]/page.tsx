import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PrintSalesInvoiceClient from './PrintSalesInvoiceClient';

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

    const companyName = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_NAME' } });
    const companyAddress = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_ADDRESS' } });
    const companyPhone = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_PHONE' } });
    const companyEmail = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_EMAIL' } });
    const companyWebsite = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_WEBSITE' } });
    const companyTaxCode = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_TAX_CODE' } });
    const companyLogo = await prisma.systemSetting.findUnique({ where: { key: 'COMPANY_LOGO' } });

    const companyInfo = {
        name: companyName?.value || 'Tên Công Ty',
        address: companyAddress?.value || 'Địa chỉ công ty',
        phone: companyPhone?.value || '',
        email: companyEmail?.value || '',
        website: companyWebsite?.value || '',
        taxCode: companyTaxCode?.value || '',
        logo: companyLogo?.value || ''
    };

    return (
        <PrintSalesInvoiceClient
            invoice={invoice}
            companyInfo={companyInfo}
        />
    );
}

import { prisma } from '@/lib/prisma';
import { PaymentRequestTemplateClient } from './PaymentRequestTemplateClient';

export default async function PaymentRequestTemplatesPage() {
    const templates = await prisma.paymentRequestTemplate.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Quản lý Mẫu Đề Nghị</h1>
            </div>
            <PaymentRequestTemplateClient initialData={templates} />
        </div>
    );
}

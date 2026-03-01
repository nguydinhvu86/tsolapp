import { prisma } from '@/lib/prisma';
import { NewPaymentRequestClient } from './NewPaymentRequestClient';

export default async function NewPaymentRequestPage({ searchParams }: { searchParams: { customerId?: string } }) {
    const templates = await prisma.paymentRequestTemplate.findMany({ orderBy: { name: 'asc' } });
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Tạo Mới Đề Nghị Thanh Toán</h1>
            </div>
            <NewPaymentRequestClient templates={templates} customers={customers} preselectedCustomerId={searchParams?.customerId} />
        </div>
    );
}

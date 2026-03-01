import { prisma } from '@/lib/prisma';
import { NewHandoverClient } from './NewHandoverClient';

export default async function NewHandoverPage({ searchParams }: { searchParams: { customerId?: string } }) {
    const templates = await prisma.handoverTemplate.findMany({ orderBy: { name: 'asc' } });
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });

    return (
        <div>
            <div className="flex justify-between">
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Tạo Mới Biên Bản Bàn Giao</h1>
            </div>
            <NewHandoverClient templates={templates} customers={customers} preselectedCustomerId={searchParams?.customerId} />
        </div>
    );
}

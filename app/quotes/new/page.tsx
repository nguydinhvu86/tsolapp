import { prisma } from '@/lib/prisma';
import { NewQuoteClient } from './NewQuoteClient';

export default async function NewQuotePage({ searchParams }: { searchParams: { customerId?: string } }) {
    const templates = await prisma.quoteTemplate.findMany({ orderBy: { name: 'asc' } });
    const customers = await prisma.customer.findMany({ orderBy: { name: 'asc' } });
    const products = await prisma.product.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });

    return (
        <div>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1>Tạo Mới Báo Giá</h1>
            </div>
            <NewQuoteClient templates={templates} customers={customers} products={products} preselectedCustomerId={searchParams?.customerId} />
        </div>
    );
}

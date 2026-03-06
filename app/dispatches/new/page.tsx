import { prisma } from '@/lib/prisma';
import { NewDispatchClient } from './NewDispatchClient';

export default async function NewDispatchPage({ searchParams }: { searchParams: { customerId?: string } }) {
    const templates = await prisma.dispatchTemplate.findMany({
        orderBy: { name: 'asc' }
    });

    const customers = await prisma.customer.findMany({
        orderBy: { name: 'asc' }
    });

    const products = await prisma.product.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)', letterSpacing: '-0.025em' }}>
                Soạn Công Văn / Thông Báo
            </h1>
            <NewDispatchClient templates={templates} customers={customers} products={products} preselectedCustomerId={searchParams?.customerId} />
        </div>
    );
}

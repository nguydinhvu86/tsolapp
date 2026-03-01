import { prisma } from '@/lib/prisma';
import ProductClient from './ProductClient';

export default async function ProductsPage() {
    // Because Prisma generated types might be slightly out of sync in the dev's IDE
    // until server restart, we use 'any' casting if needed to avoid build blocks
    const products = await (prisma as any).product.findMany({
        include: {
            inventories: {
                include: { warehouse: true }
            }
        },
        orderBy: { name: 'asc' }
    });

    const warehouses = await (prisma as any).warehouse.findMany({
        orderBy: { name: 'asc' }
    });

    const productGroups = await (prisma as any).productGroup.findMany({
        orderBy: { name: 'asc' }
    });

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Sản Phẩm & Dịch Vụ
            </h1>
            <ProductClient initialProducts={products} warehouses={warehouses} productGroups={productGroups} />
        </div>
    );
}

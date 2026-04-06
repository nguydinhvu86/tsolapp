import { prisma } from '@/lib/prisma';
import ProductClient from './ProductClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function ProductsPage({ searchParams }: { searchParams: { action?: string } }) {
    const session = await getServerSession(authOptions);
    
    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canCreate = permissions.includes('PRODUCTS_CREATE') || (session?.user as any)?.role === 'ADMIN';
    if (searchParams?.action === 'new' && !canCreate) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }

    const canView = permissions.includes('PRODUCTS_VIEW_ALL') || permissions.includes('PRODUCTS_VIEW_OWN') || (session?.user as any)?.role === 'ADMIN';
    if (!canView) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }

    const userRole = session?.user?.role || 'USER';

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
        <div style={{ maxWidth: '100%', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Sản Phẩm & Dịch Vụ
            </h1>
            <ProductClient initialProducts={products} warehouses={warehouses} productGroups={productGroups} userRole={userRole} />
        </div>
    );
}

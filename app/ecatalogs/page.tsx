import { getEcatalogs } from './actions';
import { getProducts } from '@/app/inventory/actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { prisma } from '@/lib/prisma';
import EcatalogClient from './EcatalogClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Quản lý Catalog | ContractMgr',
};

export const dynamic = 'force-dynamic';

export default async function EcatalogsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);

    const filterParams = {
        search: typeof searchParams?.search === 'string' ? searchParams.search : undefined,
    };

    const [ecatalogs, products, users] = await Promise.all([
        getEcatalogs(filterParams),
        getProducts(),
        prisma.user.findMany({ select: { id: true, name: true, avatar: true }, orderBy: { name: 'asc' } })
    ]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                Quản Lý E-Catalog Số (Product Catalogs)
            </h1>
            <EcatalogClient
                initialEcatalogs={ecatalogs}
                products={products.filter((p: any) => p.isActive)}
                users={users}
                currentUserId={session?.user?.id}
                isAdminOrManager={session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER'}
            />
        </div>
    );
}

import { getEcatalogDetail } from '../actions';
import { getProducts } from '@/app/inventory/actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { notFound } from 'next/navigation';
import EcatalogDetailClient from './EcatalogDetailClient';

export default async function EcatalogDetailPage({ params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions);
    const [ecatalog, products] = await Promise.all([
        getEcatalogDetail(params.id),
        getProducts()
    ]);

    if (!ecatalog) {
        notFound();
    }

    return (
        <EcatalogDetailClient
            initialEcatalog={ecatalog}
            products={products.filter((p: any) => p.isActive)}
            currentUserId={session?.user?.id}
            isAdminOrManager={session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER'}
        />
    );
}

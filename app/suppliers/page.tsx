import { getSuppliers } from '@/app/purchasing/actions';
import { SupplierClient } from './SupplierClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage({ searchParams }: { searchParams: { action?: string } }) {
    const session = await getServerSession(authOptions);
    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canCreate = permissions.includes('SUPPLIERS_CREATE') || (session?.user as any)?.role === 'ADMIN';
    if (searchParams?.action === 'new' && !canCreate) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }

    const suppliers = await getSuppliers();

    return <SupplierClient initialSuppliers={suppliers} />;
}

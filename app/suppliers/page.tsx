import { getSuppliers } from '@/app/purchasing/actions';
import { SupplierClient } from './SupplierClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage({ searchParams }: { searchParams: { action?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        redirect('/login');
    }

    const role = (session?.user as any)?.role;
    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canCreate = permissions.includes('SUPPLIERS_CREATE') || role === 'ADMIN' || role === 'MANAGER';
    if (searchParams?.action === 'new' && !canCreate) {
        redirect('/dashboard');
    }

    let suppliers: any[] = [];
    try {
        suppliers = await getSuppliers();
    } catch (err) {
        console.error('Failed to get suppliers in SuppliersPage:', err);
        suppliers = [];
    }

    return <SupplierClient initialSuppliers={suppliers || []} />;
}


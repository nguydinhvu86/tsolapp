import { getSuppliers } from '@/app/purchasing/actions';
import { SupplierClient } from './SupplierClient';

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
    const suppliers = await getSuppliers();

    return <SupplierClient initialSuppliers={suppliers} />;
}

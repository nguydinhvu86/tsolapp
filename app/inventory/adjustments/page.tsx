import { getWarehouses } from '../actions';
import AdjustmentClient from './AdjustmentClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

export default async function AdjustmentPage() {
    const session = await getServerSession(authOptions);
    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canView = permissions.includes('INVENTORY_TX_VIEW_ALL') || permissions.includes('INVENTORY_TX_VIEW_OWN') || (session?.user as any)?.role === 'ADMIN';
    if (!canView) {
        redirect('/dashboard');
    }
    const warehouses = await getWarehouses();

    return (
        <div className="space-y-6 w-full">
            <AdjustmentClient warehouses={warehouses} />
        </div>
    );
}

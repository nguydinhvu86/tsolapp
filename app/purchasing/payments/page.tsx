import { getPurchasePayments, getSuppliers, getPurchaseBills } from '@/app/purchasing/actions';
import { PurchasePaymentClient } from './PurchasePaymentClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function PurchasePaymentsPage({ searchParams }: { searchParams: { action?: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canCreate = permissions.includes('PURCHASE_PAYMENTS_CREATE') || (session?.user as any)?.role === 'ADMIN';
    if (searchParams?.action === 'new' && !canCreate) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }

    const payments = await getPurchasePayments();
    const suppliers = await getSuppliers();

    // Fetch only bills that are approved and not fully paid
    const allBills = await getPurchaseBills();
    const unpaidBills = allBills.filter((b: any) =>
        b.status === 'APPROVED' || b.status === 'PARTIAL_PAID'
    );

    return (
        <PurchasePaymentClient
            initialPayments={payments as any[]}
            suppliers={suppliers}
            unpaidBills={unpaidBills as any[]}
        />
    );
}

import { getPurchasePayments, getSuppliers, getPurchaseBills } from '@/app/purchasing/actions';
import { PurchasePaymentClient } from './PurchasePaymentClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export default async function PurchasePaymentsPage() {
    const session = await getServerSession(authOptions);
    if (!session) return null;

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

import { getSalesPayments } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { getSalesInvoices } from '@/app/sales/invoices/actions';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { SalesPaymentClient } from './SalesPaymentClient';

export default async function SalesPaymentsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canCreate = permissions.includes('SALES_PAYMENTS_CREATE') || (session?.user as any)?.role === 'ADMIN';
    if (searchParams?.action === 'new' && !canCreate) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }

    const [payments, customers, allInvoices] = await Promise.all([
        getSalesPayments(),
        getCustomers(),
        getSalesInvoices()
    ]);

    // Fetch only invoices that are issued or partially paid
    const unpaidInvoices = allInvoices.filter((inv: any) =>
        inv.status === 'ISSUED' || inv.status === 'PARTIAL_PAID' || inv.status === 'SENT'
    );

    return (
        <SalesPaymentClient
            initialPayments={payments as any[]}
            customers={customers}
            unpaidInvoices={unpaidInvoices as any[]}
            initialAction={searchParams?.action}
            initialCustomerId={searchParams?.customerId}
        />
    );
}

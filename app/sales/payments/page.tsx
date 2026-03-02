import { getSalesPayments, getNextPaymentCode } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { getSalesInvoices } from '@/app/sales/invoices/actions';
import SalesPaymentClient from './SalesPaymentClient';

export default async function SalesPaymentsPage() {
    const [payments, customers, invoices, nextCode] = await Promise.all([
        getSalesPayments(),
        getCustomers(),
        getSalesInvoices(),
        getNextPaymentCode()
    ]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                Quản Lý Thu Tiền & Công Nợ
            </h1>
            <SalesPaymentClient
                initialPayments={payments}
                customers={customers}
                invoices={invoices.filter((i: any) => i.status !== 'DRAFT')}
                nextCode={nextCode}
            />
        </div>
    );
}

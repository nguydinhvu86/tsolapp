import { getSalesInvoices, getNextInvoiceCode } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import { getSalesOrders } from '@/app/sales/orders/actions';
import SalesInvoiceClient from './SalesInvoiceClient';

export default async function SalesInvoicesPage() {
    const [invoices, customers, products, orders, nextCode] = await Promise.all([
        getSalesInvoices(),
        getCustomers(),
        getProducts(),
        getSalesOrders(), // Filter CONFIRMED/COMPLETED in frontend optionally
        getNextInvoiceCode()
    ]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                Hóa Đơn Bán Hàng & Xuất Kho
            </h1>
            <SalesInvoiceClient
                initialInvoices={invoices}
                customers={customers}
                products={products.filter((p: any) => p.isActive)}
                orders={orders}
                nextCode={nextCode}
            />
        </div>
    );
}

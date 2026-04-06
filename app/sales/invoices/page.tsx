import { getSalesInvoices, getNextInvoiceCode } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import { getSalesOrders } from '@/app/sales/orders/actions';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import SalesInvoiceClient from './SalesInvoiceClient';

export default async function SalesInvoicesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const session = await getServerSession(authOptions);
    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canCreate = permissions.includes('SALES_INVOICES_CREATE') || (session?.user as any)?.role === 'ADMIN';
    if (searchParams?.action === 'new' && !canCreate) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }
    const [invoices, customers, products, orders, nextCode, users] = await Promise.all([
        getSalesInvoices(typeof searchParams?.employeeId === 'string' ? searchParams.employeeId : undefined),
        getCustomers(),
        getProducts(),
        getSalesOrders(),
        getNextInvoiceCode(),
        prisma.user.findMany({ select: { id: true, name: true, avatar: true }, orderBy: { name: 'asc' } })
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
                users={users}
                currentUserId={session?.user?.id}
                initialAction={searchParams?.action}
                initialCustomerId={searchParams?.customerId}
                isAdminOrManager={session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER'}
            />
        </div>
    );
}

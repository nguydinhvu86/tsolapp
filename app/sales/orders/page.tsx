import { getSalesOrders, getNextOrderCode } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import SalesOrderClient from './SalesOrderClient';

export default async function SalesOrdersPage() {
    const [orders, customers, products, nextCode] = await Promise.all([
        getSalesOrders(),
        getCustomers(),
        getProducts(),
        getNextOrderCode()
    ]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                Quản Lý Đơn Đặt Hàng
            </h1>
            <SalesOrderClient
                initialOrders={orders}
                customers={customers}
                products={products.filter((p: any) => p.isActive)}
                nextCode={nextCode}
            />
        </div>
    );
}

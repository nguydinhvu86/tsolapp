import { getSalesEstimates, getNextEstimateCode } from './actions';
import { getCustomers } from '@/app/customers/actions';
import { getProducts } from '@/app/inventory/actions';
import SalesEstimateClient from './SalesEstimateClient';

export default async function SalesEstimatesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
    const [estimates, customers, products, nextCode] = await Promise.all([
        getSalesEstimates(),
        getCustomers(),
        getProducts(),
        getNextEstimateCode()
    ]);

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 text-gray-800">
                Quản Lý Báo Giá Bán Hàng (ERP)
            </h1>
            <SalesEstimateClient
                initialEstimates={estimates}
                customers={customers}
                products={products.filter((p: any) => p.isActive)}
                nextCode={nextCode}
                initialAction={searchParams?.action}
                initialCustomerId={searchParams?.customerId}
            />
        </div>
    );
}

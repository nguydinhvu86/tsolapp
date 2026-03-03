import { getSalesReportData } from './actions';
import { SalesReportClient } from './SalesReportClient';

export default async function SalesReportsPage() {
    const data = await getSalesReportData();

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <SalesReportClient
                customers={data.customers}
                invoices={data.invoices}
                payments={data.payments}
                orders={data.orders}
                estimates={data.estimates}
            />
        </div>
    );
}

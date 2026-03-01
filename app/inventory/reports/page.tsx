import { getStockValuation } from '../report-actions';
import { getProducts, getWarehouses } from '../actions';
import ReportsClient from './ReportsClient';

export default async function ReportsPage(props: { searchParams: Promise<any> }) {
    const searchParams = await props.searchParams;
    const warehouseId = searchParams?.warehouseId || undefined;

    // Server fetch for initial dashboard data
    const valuationData = await getStockValuation(warehouseId);

    // Dictionaries for the Ledger filter
    const products = await getProducts('PRODUCT');
    const warehouses = await getWarehouses();

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Báo Cáo & Thống Kê Kho
            </h1>
            <ReportsClient
                initialValuation={valuationData}
                products={products}
                warehouses={warehouses}
            />
        </div>
    );
}

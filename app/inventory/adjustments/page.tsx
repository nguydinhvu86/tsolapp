import { getWarehouses } from '../actions';
import AdjustmentClient from './AdjustmentClient';

export default async function AdjustmentPage() {
    const warehouses = await getWarehouses();

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Kiểm Kê Kho & Điều Chỉnh
            </h1>
            <AdjustmentClient warehouses={warehouses} />
        </div>
    );
}

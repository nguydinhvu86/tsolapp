import { getProducts, getWarehouses } from '../../actions';
import NewTransactionClient from './NewTransactionClient';

export default async function NewTransactionPage() {
    const products = await getProducts('PRODUCT'); // Only physical products usually involve inventory 
    const warehouses = await getWarehouses();

    return (
        <div style={{ maxWidth: '100%', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Tạo Phiếu Kho Mới
            </h1>
            <NewTransactionClient products={products} warehouses={warehouses} />
        </div>
    );
}

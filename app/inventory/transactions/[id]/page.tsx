import { getTransactionById } from '../../transaction-actions';
import TransactionDetailClient from './TransactionDetailClient';
import { notFound } from 'next/navigation';

export default async function TransactionDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const transaction = await getTransactionById(params.id);

    if (!transaction) {
        notFound();
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Chi Tiết Lệnh Kho
            </h1>
            <TransactionDetailClient transaction={transaction} />
        </div>
    );
}

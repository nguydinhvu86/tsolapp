import { getTransactions } from '../transaction-actions';
import TransactionsClient from './TransactionsClient';

export default async function TransactionsPage(props: { searchParams: Promise<any> }) {
    const searchParams = await props.searchParams;
    const type = searchParams?.type || undefined;
    const status = searchParams?.status || undefined;

    const transactions = await getTransactions({ type, status });

    return (
        <div style={{ maxWidth: '100%', margin: '0 auto', width: '100%' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text-main)' }}>
                Lịch Sử Lệnh Kho (Nhập/Xuất/Chuyển)
            </h1>
            <TransactionsClient initialTransactions={transactions} />
        </div>
    );
}

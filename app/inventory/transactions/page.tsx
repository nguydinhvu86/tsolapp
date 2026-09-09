import { getTransactions } from '../transaction-actions';
import TransactionsClient from './TransactionsClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';

export default async function TransactionsPage(props: { searchParams: Promise<any> }) {
    const session = await getServerSession(authOptions);
    const permissions = (session?.user as any)?.permissions as string[] || [];
    const canView = permissions.includes('INVENTORY_TX_VIEW_ALL') || permissions.includes('INVENTORY_TX_VIEW_OWN') || (session?.user as any)?.role === 'ADMIN';
    if (!canView) {
        redirect('/dashboard');
    }

    const searchParams = await props.searchParams;
    const type = searchParams?.type || undefined;
    const status = searchParams?.status || undefined;

    const transactions = await getTransactions({ type, status });

    return (
        <div className="space-y-6 w-full">
            <TransactionsClient initialTransactions={transactions} />
        </div>
    );
}

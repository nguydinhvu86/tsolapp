import { getExpenseById } from '../actions';
import { ExpenseDetailClient } from './ExpenseDetailClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }: { params: { id: string } }) {
    const expense = await getExpenseById(params.id);
    if (!expense) return { title: 'Phiếu Chi không tồn tại' };
    return { title: `${expense.code} | Quản lý Chi Phí` };
}

export default async function ExpenseDetailPage({ params }: { params: { id: string } }) {
    const expense = await getExpenseById(params.id);

    if (!expense) {
        notFound();
    }

    return (
        <div className="p-6 max-w-7xl mx-auto flex flex-col gap-6">
            <ExpenseDetailClient initialData={expense} />
        </div>
    );
}

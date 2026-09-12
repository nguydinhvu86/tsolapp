import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getDebtOverviewData } from '../actions';
import DebtClient from './DebtClient';

export default async function DebtPage({
    searchParams
}: {
    searchParams?: { [key: string]: string | undefined };
}) {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const permissions = (session.user as any)?.permissions as string[] || [];
    const role = (session.user as any)?.role;
    const canView = permissions.includes('ACCOUNTING_VIEW') || permissions.includes('ACCOUNTING_VIEW_ALL') || role === 'ADMIN';
    if (!canView) redirect('/dashboard');

    const data = await getDebtOverviewData();

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <DebtClient 
                initialData={data} 
                initialTab={(searchParams?.tab as any) || 'customers'}
            />
        </div>
    );
}

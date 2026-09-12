import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getFinancialReportsData } from '../actions';
import ReportsClient from './ReportsClient';

export default async function AccountingReportsPage({
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

    const year = searchParams?.year ? parseInt(searchParams.year, 10) : new Date().getFullYear();
    const data = await getFinancialReportsData(year);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <ReportsClient initialData={data} />
        </div>
    );
}

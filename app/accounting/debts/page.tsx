import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getDebtOverviewData } from '../actions';
import { getCompanyInfo } from '@/lib/companyInfo';
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

    const currentYear = new Date().getFullYear();
    const startDate = searchParams?.startDate || `${currentYear}-01-01`;
    const endDate = searchParams?.endDate || `${currentYear}-12-31`;

    const [data, companyInfo] = await Promise.all([
        getDebtOverviewData({ startDate, endDate }),
        getCompanyInfo()
    ]);

    return (
        <div className="p-3 sm:p-6 w-full mx-auto space-y-6">
            <DebtClient 
                initialData={data} 
                initialTab={(searchParams?.tab as any) || 'customers'}
                companyInfo={companyInfo}
                initialStartDate={startDate}
                initialEndDate={endDate}
            />
        </div>
    );
}

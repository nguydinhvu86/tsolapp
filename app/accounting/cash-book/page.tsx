import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getCashTransactions } from '../actions';
import { getCompanyInfo } from '@/lib/companyInfo';
import CashBookClient from './CashBookClient';

export default async function CashBookPage({
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

    const [data, companyInfo] = await Promise.all([
        getCashTransactions({
            type: searchParams?.type || 'ALL',
            financeAccountId: searchParams?.financeAccountId || 'ALL',
            category: searchParams?.category || 'ALL',
            startDate: searchParams?.startDate,
            endDate: searchParams?.endDate,
            search: searchParams?.search
        }),
        getCompanyInfo()
    ]);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <CashBookClient initialData={data} companyInfo={companyInfo} />
        </div>
    );
}

import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getFinancialOverviewData } from './actions';
import AccountingDashboardClient from './AccountingDashboardClient';

export default async function AccountingPage() {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/login');
    }

    const permissions = (session.user as any)?.permissions as string[] || [];
    const role = (session.user as any)?.role;
    const canView = permissions.includes('ACCOUNTING_VIEW') || permissions.includes('ACCOUNTING_VIEW_ALL') || role === 'ADMIN';

    if (!canView) {
        redirect('/dashboard');
    }

    const currentYear = new Date().getFullYear();
    const data = await getFinancialOverviewData(currentYear);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <AccountingDashboardClient initialData={data} />
        </div>
    );
}

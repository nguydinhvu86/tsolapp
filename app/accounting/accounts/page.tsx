import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import { getFinanceAccounts } from '../actions';
import AccountsClient from './AccountsClient';

export default async function AccountingAccountsPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect('/login');

    const permissions = (session.user as any)?.permissions as string[] || [];
    const role = (session.user as any)?.role;
    const canView = permissions.includes('ACCOUNTING_VIEW') || permissions.includes('ACCOUNTING_VIEW_ALL') || role === 'ADMIN';
    if (!canView) redirect('/dashboard');

    const accounts = await getFinanceAccounts();

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <AccountsClient initialAccounts={accounts} />
        </div>
    );
}

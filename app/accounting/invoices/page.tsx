import React from 'react';
import { PrismaClient } from '@prisma/client';
import InvoiceDashboardClient from './InvoiceDashboardClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

const prisma = new PrismaClient();

export default async function AccountingInvoicesPage() {
    const session = await getServerSession(authOptions);
    if (!session) return null;

    const permissions = (session.user as any)?.permissions as string[] || [];
    const canView = permissions.includes('ACCOUNTING_VIEW') || permissions.includes('ACCOUNTING_VIEW_ALL') || (session.user as any)?.role === 'ADMIN';
    if (!canView) {
        const { redirect } = await import('next/navigation');
        redirect('/dashboard');
    }
    const invoices = await prisma.supplierInvoice.findMany({
        orderBy: { issueDate: 'desc' },
        include: {
            supplier: true,
            items: true
        }
    });

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Quản lý Hóa Đơn Điện Tử Đầu Vào</h1>
            </div>
            
            <InvoiceDashboardClient initialInvoices={invoices} />
        </div>
    );
}

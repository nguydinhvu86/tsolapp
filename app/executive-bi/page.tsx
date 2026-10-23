import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { redirect } from 'next/navigation';
import ExecutiveBiClient from './ExecutiveBiClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Executive BI & Dự Báo Dòng Tiền | TSOL ERP',
    description: 'Bảng điều hành chuyên sâu, dự báo dòng tiền 30-60-90 ngày và phân tích tuổi nợ'
};

export default async function ExecutiveBiPage() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.id) {
        redirect('/login');
    }

    const role = (session.user.role || '').toUpperCase();
    const permissions = (session.user.permissions as string[]) || [];
    const isManagerOrAbove =
        ['ADMIN', 'MANAGER', 'DIRECTOR', 'CEO', 'CFO', 'LEADER'].includes(role) ||
        permissions.includes('VIEW_EXECUTIVE_BI');

    if (!isManagerOrAbove) {
        redirect('/dashboard');
    }

    return <ExecutiveBiClient />;
}

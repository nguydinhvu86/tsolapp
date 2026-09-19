import React from 'react';
import GeneralLedgerClient from './GeneralLedgerClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Sổ Nhật Ký & Sổ Cái Kế Toán VAS | TSOL ERP',
    description: 'Sổ cái hạch toán bút toán kép Nợ/Có chuẩn VAS TT200/133'
};

export default function GeneralLedgerPage() {
    return <GeneralLedgerClient />;
}

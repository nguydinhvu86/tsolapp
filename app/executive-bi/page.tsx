import React from 'react';
import ExecutiveBiClient from './ExecutiveBiClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Executive BI & Dự Báo Dòng Tiền | TSOL ERP',
    description: 'Bảng điều hành chuyên sâu, dự báo dòng tiền 30-60-90 ngày và phân tích tuổi nợ'
};

export default function ExecutiveBiPage() {
    return <ExecutiveBiClient />;
}

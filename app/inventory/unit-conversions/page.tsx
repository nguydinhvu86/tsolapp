import React from 'react';
import UnitConversionClient from './UnitConversionClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Đơn Vị Tính Đa Cấp & Quy Đổi | TSOL ERP',
    description: 'Cấu hình quy đổi đơn vị tính đa cấp cho sản phẩm'
};

export default function UnitConversionPage() {
    return <UnitConversionClient />;
}

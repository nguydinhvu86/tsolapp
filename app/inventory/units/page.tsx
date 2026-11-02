import React from 'react';
import UnitClient from './UnitClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Quản Lý Đơn Vị Tính | TSOL ERP',
    description: 'Quản lý danh mục các đơn vị tính sản phẩm, dịch vụ và hàng hóa trong kho'
};

export default function UnitsPage() {
    return <UnitClient />;
}

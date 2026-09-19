import React from 'react';
import SerialManagementClient from './SerialManagementClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Quản Lý Serial / IMEI & Bảo Hành | TSOL ERP',
    description: 'Quản lý vòng đời Serial/IMEI, xuất bán và tra cứu bảo hành điện tử'
};

export default function SerialsPage() {
    return <SerialManagementClient />;
}

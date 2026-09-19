import React from 'react';
import StorageVaultClient from './StorageVaultClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Kho Lưu Trữ & Kiểm Toán CSDL | TSOL ERP',
    description: 'Kho lưu trữ tệp đính kèm tập trung và nhật ký kiểm toán hợp nhất'
};

export default function StorageVaultPage() {
    return <StorageVaultClient />;
}

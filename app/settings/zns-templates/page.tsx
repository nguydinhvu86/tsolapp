import React from 'react';
import ZnsTemplateClient from './ZnsTemplateClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Mẫu Tin Nhắn Zalo ZNS | TSOL ERP',
    description: 'Quản lý mẫu tin nhắn Zalo Notification Service và lịch sử gửi'
};

export default function ZnsTemplatesPage() {
    return <ZnsTemplateClient />;
}

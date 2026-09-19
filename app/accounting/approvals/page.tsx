import React from 'react';
import ApprovalCenterClient from './ApprovalCenterClient';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'Trung Tâm Phê Duyệt Chi Tiêu Đa Cấp | TSOL ERP',
    description: 'Quy trình phê duyệt chi tiêu đa cấp theo hạn mức ngân sách'
};

export default function ApprovalsPage() {
    return <ApprovalCenterClient />;
}

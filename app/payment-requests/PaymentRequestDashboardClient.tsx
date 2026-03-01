'use client'

import React, { useState } from 'react';
import { PaymentRequest, Customer, PaymentRequestTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { deletePaymentRequest, updatePaymentRequestStatus, updatePaymentRequest } from './actions';
import { Plus, Trash2, Printer, Search, Edit, FileSpreadsheet, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';

type PaymentRequestWithRelations = PaymentRequest & { customer: Customer, template: PaymentRequestTemplate };

export function PaymentRequestDashboardClient({ initialData }: { initialData: PaymentRequestWithRelations[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = isAdmin || permissions.includes('PAYMENTS_CREATE');
    const canEdit = isAdmin || permissions.includes('PAYMENTS_EDIT');
    const canDelete = isAdmin || permissions.includes('PAYMENTS_DELETE');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingPaymentRequest, setEditingPaymentRequest] = useState<PaymentRequestWithRelations | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const filteredData = initialData.filter(q => {
        const matchSearch = q.title.toLowerCase().includes(searchTerm.toLowerCase()) || q.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter ? q.status === statusFilter : true;
        return matchSearch && matchStatus;
    });

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedData = [...filteredData].sort((a: any, b: any) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === 'customerName') {
            aVal = a.customer?.name || '';
            bVal = b.customer?.name || '';
        } else if (sortField === 'templateName') {
            aVal = a.template?.name || '';
            bVal = b.template?.name || '';
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (aVal instanceof Date || bVal instanceof Date || sortField === 'createdAt') {
            const dateA = new Date(aVal).getTime() || 0;
            const dateB = new Date(bVal).getTime() || 0;
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        }
        return 0;
    });

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa đề nghị thanh toán này?')) {
            await deletePaymentRequest(id);
            router.refresh();
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updatePaymentRequestStatus(id, newStatus);
        router.refresh();
    }

    const handleEditClick = (PaymentRequest: PaymentRequestWithRelations) => {
        setEditingPaymentRequest(PaymentRequest);
        setEditContent(PaymentRequest.content);
    };

    const handleSavePaymentRequest = async () => {
        if (!editingPaymentRequest) return;
        setIsSaving(true);
        try {
            await updatePaymentRequest(editingPaymentRequest.id, editContent);
            setEditingPaymentRequest(null);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportExcel = (PaymentRequest: PaymentRequestWithRelations) => {
        try {
            const template = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8">
                    <!--[if gte mso 9]>
                    <xml>
                        <x:ExcelWorkbook>
                            <x:ExcelWorksheets>
                                <x:ExcelWorksheet>
                                    <x:Name>De_Nghi_Thanh_Toan</x:Name>
                                    <x:WorksheetOptions>
                                        <x:DisplayGridlines/>
                                    </x:WorksheetOptions>
                                </x:ExcelWorksheet>
                            </x:ExcelWorksheets>
                        </x:ExcelWorkbook>
                    </xml>
                    <![endif]-->
                    <style>
                        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; }
                        table { border-collapse: collapse; }
                    </style>
                </head>
                <body>
                    ${PaymentRequest.content}
                </body>
                </html>
            `;

            const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `De_Nghi_Thanh_Toan_${PaymentRequest.customer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Lỗi xuất Excel:", error);
            alert("Đã xảy ra lỗi khi tạo tệp Excel. Vui lòng thử lại.");
        }
    };

    return (
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <div className="flex gap-4 items-center">
                    <div className="flex gap-2 items-center" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.25rem 0.75rem', background: '#fff' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            style={{ border: 'none', outline: 'none', padding: '0.25rem', background: 'transparent' }}
                            placeholder="Tìm theo tên/khách hàng..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="input" style={{ width: '150px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="DRAFT">Nháp</option>
                        <option value="SENT">Đã Gửi</option>
                        <option value="ACCEPTED">Đã Ký</option>
                        <option value="REJECTED">Hủy</option>
                    </select>
                </div>
                {canCreate && (
                    <Link href="/payment-requests/new">
                        <Button className="gap-2">
                            <Plus size={18} /> Tạo Đề Nghị Thanh Toán
                        </Button>
                    </Link>
                )}
            </div>

            <Table>
                <thead>
                    <tr>
                        <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Tên Đề Nghị Thanh Toán {sortField === 'title' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th onClick={() => handleSort('templateName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Loại Mẫu {sortField === 'templateName' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th onClick={() => handleSort('customerName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Khách hàng {sortField === 'customerName' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Trạng thái {sortField === 'status' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Ngày tạo {sortField === 'createdAt' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th style={{ width: '150px' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đề nghị thanh toán nào</td></tr>
                    ) : sortedData.map(q => (
                        <tr key={q.id}>
                            <td style={{ fontWeight: 500 }}>
                                <Link href={`/payment-requests/${q.id}`} className="text-blue-600 hover:underline">
                                    {q.title}
                                </Link>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{q.template.name}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{q.customer.name}</td>
                            <td>
                                <select
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        border: '1px solid var(--border)',
                                        background: q.status === 'ACCEPTED' ? '#dcfce7' : q.status === 'REJECTED' ? '#fee2e2' : q.status === 'SENT' ? '#e0f2fe' : '#f1f5f9',
                                        color: q.status === 'ACCEPTED' ? '#166534' : q.status === 'REJECTED' ? '#991b1b' : q.status === 'SENT' ? '#0369a1' : '#334155',
                                        opacity: canEdit ? 1 : 0.6,
                                        cursor: canEdit ? 'pointer' : 'not-allowed'
                                    }}
                                    value={q.status}
                                    onChange={(e) => handleStatusChange(q.id, e.target.value)}
                                    disabled={!canEdit}
                                >
                                    <option value="DRAFT">Nháp</option>
                                    <option value="SENT">Đã Gửi</option>
                                    <option value="ACCEPTED">Đã Ký</option>
                                    <option value="REJECTED">Hủy</option>
                                </select>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(q.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td>
                                <div className="flex gap-2">
                                    {canEdit && (
                                        <button onClick={() => handleEditClick(q)} style={{ color: 'var(--primary)', padding: '0.25rem' }} title="Chỉnh sửa nội dung">
                                            <Edit size={18} />
                                        </button>
                                    )}
                                    <Link href={`/payment-requests/${q.id}`} target="_blank">
                                        <button style={{ color: 'var(--primary)', padding: '0.25rem' }} title="In/Xem">
                                            <Printer size={18} />
                                        </button>
                                    </Link>
                                    <button onClick={() => handleExportExcel(q)} style={{ color: 'var(--success, #16a34a)', padding: '0.25rem' }} title="Xuất Excel">
                                        <FileSpreadsheet size={18} />
                                    </button>
                                    {canDelete && (
                                        <button onClick={() => handleDelete(q.id)} style={{ color: 'var(--danger)', padding: '0.25rem' }} title="Xóa">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>

            <Modal
                isOpen={!!editingPaymentRequest}
                onClose={() => setEditingPaymentRequest(null)}
                title={`Sửa đề nghị thanh toán: ${editingPaymentRequest?.title} `}
                maxWidth="1000px"
            >
                <div className="flex flex-col gap-4">
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Khách hàng: <strong>{editingPaymentRequest?.customer.name}</strong>
                    </p>
                    <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="Nội dung đề nghị..."
                    />
                    <div className="flex gap-2" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={() => setEditingPaymentRequest(null)}>Hủy</Button>
                        <Button onClick={handleSavePaymentRequest} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}

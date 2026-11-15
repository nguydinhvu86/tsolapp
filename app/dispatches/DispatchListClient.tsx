'use client'
import { confirmModal } from '@/app/components/providers/ConfirmProvider';
import { toast } from '@/app/components/providers/ToastProvider';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { Dispatch, Customer, DispatchTemplate } from '@prisma/client';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Input } from '@/app/components/ui/Input';
import { deleteDispatch, updateDispatchStatus } from './actions';
import { Plus, Trash2, Printer, Search, Eye, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

type DispatchWithRelations = Dispatch & {
    customer: Customer,
    template: DispatchTemplate
};

export function DispatchListClient({ initialData }: { initialData: DispatchWithRelations[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = true;
    const canEdit = isAdmin || permissions.includes('DISPATCHES_EDIT');
    const canDelete = isAdmin || permissions.includes('DISPATCHES_DELETE');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleDelete = async (id: string) => {
        if (await confirmModal('Bạn có chắc chắn muốn xóa công văn này?')) {
            await deleteDispatch(id);
            router.refresh();
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateDispatchStatus(id, newStatus);
        router.refresh();
    };

    const filteredData = initialData.filter(d => {
        const matchesSearch =
            d.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter ? d.status === statusFilter : true;
        return matchesSearch && matchesStatus;
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

    return (
        <div className="space-y-5">
            <PageHeader
                category="HÀNH CHÍNH & VĂN THƯ"
                categoryColor="amber"
                title="Quản Lý Công Văn & Thông Báo"
                description="Soạn thảo, quản lý và lưu trữ hồ sơ công văn, quyết định và thông báo chính thức"
                itemCount={initialData.length}
                itemLabel="công văn"
                actions={
                    canCreate ? (
                        <Link
                            href="/dispatches/new"
                            className="btn btn-primary gap-2 h-[36px] px-3.5 text-xs font-semibold rounded-lg shadow-xs hover:shadow-sm inline-flex items-center"
                        >
                            <Plus size={16} />
                            <span>Soạn Công Văn Mới</span>
                        </Link>
                    ) : undefined
                }
            />

            <Card>
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Tìm theo tiêu đề hoặc tên khách hàng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 h-[38px] text-xs"
                            style={{ marginBottom: 0 }}
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="input h-[38px] text-xs min-w-[160px] rounded-lg"
                    >
                        <option value="">Tất cả trạng thái</option>
                        <option value="DRAFT">Nháp</option>
                        <option value="SENT">Đã gửi</option>
                        <option value="CANCELLED">Hủy</option>
                    </select>
                </div>

                <Table className="custom-scrollbar min-w-[860px]">
                <thead>
                    <tr>
                        <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Tiêu đề Công văn {sortField === 'title' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th onClick={() => handleSort('customerName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Khách hàng áp dụng {sortField === 'customerName' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Trạng thái {sortField === 'status' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Ngày tạo {sortField === 'createdAt' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th style={{ width: '100px' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có công văn nào</td></tr>
                    ) : sortedData.map(d => (
                        <tr key={d.id}>
                            <td style={{ fontWeight: 500 }}>
                                <Link href={`/dispatches/${d.id}`} className="text-blue-600 hover:underline">
                                    {d.title}
                                </Link>
                            </td>
                            <td style={{ color: 'var(--primary)' }}>
                                <Link href={`/customers/${d.customerId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {d.customer.name}
                                </Link>
                            </td>
                            <td>
                                <select
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        border: '1px solid var(--border)',
                                        background: d.status === 'SENT' ? '#dbeafe' : d.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                                        color: d.status === 'SENT' ? '#1e40af' : d.status === 'CANCELLED' ? '#991b1b' : '#334155',
                                        opacity: canEdit ? 1 : 0.6,
                                        cursor: canEdit ? 'pointer' : 'not-allowed'
                                    }}
                                    value={d.status}
                                    onChange={(e) => handleStatusChange(d.id, e.target.value)}
                                    disabled={!canEdit}
                                >
                                    <option value="DRAFT">Nháp</option>
                                    <option value="SENT">Đã gửi</option>
                                    <option value="CANCELLED">Hủy</option>
                                </select>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} suppressHydrationWarning>{formatDate(new Date(d.createdAt))}</td>
                            <td>
                                <div className="flex gap-2">
                                    <Link href={`/dispatches/${d.id}`} target="_blank">
                                        <button style={{ color: 'var(--primary)', padding: '0.25rem' }} title="In/Xem">
                                            <Printer size={18} />
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/public/dispatches/${d.id}`;
                                            navigator.clipboard.writeText(url);
                                            toast.success('Đã sao chép liên kết xem trước', url);
                                        }}
                                        style={{ color: 'var(--primary)', padding: '0.25rem' }}
                                        title="Copy Link xem trước cho Khách hàng"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    </button>
                                    {canEdit && (
                                        <Link href={`/dispatches/${d.id}/edit`}>
                                            <button style={{ color: 'var(--warning)', padding: '0.25rem' }} title="Sửa">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                                            </button>
                                        </Link>
                                    )}
                                    {canDelete && (
                                        <button onClick={() => handleDelete(d.id)} style={{ color: 'var(--danger)', padding: '0.25rem' }} title="Xóa">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </Table>
        </Card>
        </div>
    );
}

'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { Dispatch, Customer, DispatchTemplate } from '@prisma/client';
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

    const canCreate = isAdmin || permissions.includes('DISPATCHES_CREATE');
    const canEdit = isAdmin || permissions.includes('DISPATCHES_EDIT');
    const canDelete = isAdmin || permissions.includes('DISPATCHES_DELETE');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa công văn này?')) {
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
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Quản lý Công Văn & Thông Báo</h2>
                {canCreate && (
                    <Link href="/dispatches/new">
                        <Button className="gap-2">
                            <Plus size={18} /> Soạn Công Văn Mới
                        </Button>
                    </Link>
                )}
            </div>

            <div className="flex gap-4" style={{ marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <Input
                        placeholder="Tìm theo tiêu đề hoặc tên khách hàng..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ paddingLeft: '2.5rem', marginBottom: 0 }}
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        outline: 'none',
                        minWidth: '150px'
                    }}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="DRAFT">Nháp</option>
                    <option value="SENT">Đã gửi</option>
                    <option value="CANCELLED">Hủy</option>
                </select>
            </div>

            <Table>
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
    );
}

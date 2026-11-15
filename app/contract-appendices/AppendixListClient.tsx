'use client'
import { confirmModal } from '@/app/components/providers/ConfirmProvider';
import { toast } from '@/app/components/providers/ToastProvider';
import { formatDate } from '@/lib/utils/formatters';

import React, { useState } from 'react';
import { ContractAppendix, Contract, Customer, ContractAppendixTemplate } from '@prisma/client';
import { PageHeader } from '@/app/components/ui/PageHeader';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Input } from '@/app/components/ui/Input';
import { deleteAppendix, updateAppendixStatus } from './actions';
import { Plus, Trash2, Printer, Search, Eye, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type AppendixWithRelations = ContractAppendix & {
    contract: Contract & { customer: Customer },
    template: ContractAppendixTemplate
};

export function AppendixListClient({ initialData }: { initialData: AppendixWithRelations[] }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const handleDelete = async (id: string) => {
        if (await confirmModal('Bạn có chắc chắn muốn xóa phụ lục này?')) {
            await deleteAppendix(id);
            router.refresh();
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateAppendixStatus(id, newStatus);
        router.refresh();
    };

    const filteredData = initialData.filter(apx => {
        const matchesSearch =
            apx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apx.contract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            apx.contract.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter ? apx.status === statusFilter : true;
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
            aVal = a.contract?.customer?.name || '';
            bVal = b.contract?.customer?.name || '';
        } else if (sortField === 'contractTitle') {
            aVal = a.contract?.title || '';
            bVal = b.contract?.title || '';
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
                category="HỢP ĐỒNG & PHÁP LÝ"
                categoryColor="indigo"
                title="Quản Lý Phụ Lục Hợp Đồng"
                description="Theo dõi, soạn thảo và lưu trữ các phụ lục bổ sung, điều chỉnh hợp đồng"
                itemCount={initialData.length}
                itemLabel="phụ lục"
                actions={
                    <Link
                        href="/contract-appendices/new"
                        className="btn btn-primary gap-2 h-[36px] px-3.5 text-xs font-semibold rounded-lg shadow-xs hover:shadow-sm inline-flex items-center"
                    >
                        <Plus size={16} />
                        <span>Thêm Phụ Lục Mới</span>
                    </Link>
                }
            />

            <Card>
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="flex-1 relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input
                            placeholder="Tìm theo tiêu đề, tên hợp đồng hoặc khách hàng..."
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
                        <option value="SIGNED">Đã ký</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>
                </div>

                <Table className="custom-scrollbar min-w-[860px]">
                <thead>
                    <tr>
                        <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Tiêu đề Phụ lục {sortField === 'title' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                        </th>
                        <th onClick={() => handleSort('contractTitle')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Hợp đồng chính {sortField === 'contractTitle' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
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
                        <th style={{ width: '100px' }}>Thao tác</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedData.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có phụ lục nào</td></tr>
                    ) : sortedData.map(apx => (
                        <tr key={apx.id}>
                            <td style={{ fontWeight: 500 }}>
                                <Link href={`/contract-appendices/${apx.id}`} className="text-blue-600 hover:underline">
                                    {apx.title}
                                </Link>
                            </td>
                            <td style={{ color: 'var(--primary)' }}>
                                <Link href={`/contracts/${apx.contractId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                    {apx.contract.title}
                                </Link>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{apx.contract.customer.name}</td>
                            <td>
                                <select
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        border: '1px solid var(--border)',
                                        background: apx.status === 'SIGNED' ? '#dcfce7' : apx.status === 'CANCELLED' ? '#fee2e2' : apx.status === 'SENT' ? '#e0f2fe' : '#f1f5f9',
                                        color: apx.status === 'SIGNED' ? '#166534' : apx.status === 'CANCELLED' ? '#991b1b' : apx.status === 'SENT' ? '#0369a1' : '#334155'
                                    }}
                                    value={apx.status}
                                    onChange={(e) => handleStatusChange(apx.id, e.target.value)}
                                >
                                    <option value="DRAFT">Nháp</option>
                                    <option value="SENT">Đã gửi</option>
                                    <option value="SIGNED">Đã ký</option>
                                    <option value="CANCELLED">Hủy</option>
                                </select>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }} suppressHydrationWarning>{formatDate(new Date(apx.createdAt))}</td>
                            <td>
                                <div className="flex gap-2">
                                    <Link href={`/contract-appendices/${apx.id}`} target="_blank">
                                        <button style={{ color: 'var(--primary)', padding: '0.25rem' }} title="In/Xem">
                                            <Printer size={18} />
                                        </button>
                                    </Link>
                                    <button
                                        onClick={() => {
                                            const url = `${window.location.origin}/public/contract-appendices/${apx.id}`;
                                            navigator.clipboard.writeText(url);
                                            toast.success('Đã sao chép liên kết xem trước', url);
                                        }}
                                        style={{ color: 'var(--primary)', padding: '0.25rem' }}
                                        title="Copy Link xem trước cho Khách hàng"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    </button>
                                    <button onClick={() => handleDelete(apx.id)} style={{ color: 'var(--danger)', padding: '0.25rem' }} title="Xóa">
                                        <Trash2 size={18} />
                                    </button>
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

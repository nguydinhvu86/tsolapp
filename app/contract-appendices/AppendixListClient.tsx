'use client'

import React, { useState } from 'react';
import { ContractAppendix, Contract, Customer, ContractAppendixTemplate } from '@prisma/client';
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
        if (confirm('Bạn có chắc chắn muốn xóa phụ lục này?')) {
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
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Quản lý Phụ Lục Hợp Đồng</h2>
                <Link href="/contract-appendices/new">
                    <Button className="gap-2">
                        <Plus size={18} /> Thêm Phụ Lục Mới
                    </Button>
                </Link>
            </div>

            <div className="flex gap-4" style={{ marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <Input
                        placeholder="Tìm theo tiêu đề, tên hợp đồng hoặc khách hàng..."
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
                    <option value="SIGNED">Đã ký</option>
                    <option value="CANCELLED">Đã hủy</option>
                </select>
            </div>

            <Table>
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
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(apx.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td>
                                <div className="flex gap-2">
                                    <Link href={`/contract-appendices/${apx.id}`} target="_blank">
                                        <button style={{ color: 'var(--primary)', padding: '0.25rem' }} title="In/Xem">
                                            <Printer size={18} />
                                        </button>
                                    </Link>
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
    );
}

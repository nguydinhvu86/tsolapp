'use client'

import React, { useState } from 'react';
import { Contract, Customer, ContractTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { deleteContract, updateContractStatus, updateContract } from './actions';
import { Plus, Trash2, Printer, Search, Edit, Eye, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

type ContractWithRelations = Contract & { customer: Customer, template: ContractTemplate };

export function ContractDashboardClient({ initialData }: { initialData: ContractWithRelations[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = isAdmin || permissions.includes('CONTRACTS_CREATE');
    const canEdit = isAdmin || permissions.includes('CONTRACTS_EDIT');
    const canDelete = isAdmin || permissions.includes('CONTRACTS_DELETE');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingContract, setEditingContract] = useState<ContractWithRelations | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const filteredData = initialData.filter(c => {
        const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter ? c.status === statusFilter : true;
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
        if (confirm('Bạn có chắc chắn muốn xóa hợp đồng này?')) {
            await deleteContract(id);
            router.refresh();
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateContractStatus(id, newStatus);
        router.refresh();
    }

    const handleEditClick = (contract: ContractWithRelations) => {
        setEditingContract(contract);
        setEditContent(contract.content);
    };

    const handleSaveContract = async () => {
        if (!editingContract) return;
        setIsSaving(true);
        try {
            await updateContract(editingContract.id, editContent);
            setEditingContract(null);
            router.refresh();
        } finally {
            setIsSaving(false);
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
                        <option value="SIGNED">Đã Ký</option>
                        <option value="CANCELLED">Hủy</option>
                    </select>
                </div>
                {canCreate && (
                    <Link href="/contracts/new">
                        <Button className="gap-2">
                            <Plus size={18} /> Tạo Hợp Đồng
                        </Button>
                    </Link>
                )}
            </div>

            <Table>
                <thead>
                    <tr>
                        <th onClick={() => handleSort('title')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                            <div className="flex items-center gap-1">Tên Hợp đồng {sortField === 'title' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
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
                        <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có hợp đồng nào</td></tr>
                    ) : sortedData.map(c => (
                        <tr key={c.id}>
                            <td style={{ fontWeight: 500 }}>
                                <Link href={`/contracts/${c.id}`} className="text-blue-600 hover:underline">
                                    {c.title}
                                </Link>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{c.template.name}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{c.customer.name}</td>
                            <td>
                                <select
                                    style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        border: '1px solid var(--border)',
                                        background: c.status === 'SIGNED' ? '#dcfce7' : c.status === 'CANCELLED' ? '#fee2e2' : c.status === 'SENT' ? '#e0f2fe' : '#f1f5f9',
                                        color: c.status === 'SIGNED' ? '#166534' : c.status === 'CANCELLED' ? '#991b1b' : c.status === 'SENT' ? '#0369a1' : '#334155',
                                        opacity: canEdit ? 1 : 0.6,
                                        cursor: canEdit ? 'pointer' : 'not-allowed'
                                    }}
                                    value={c.status}
                                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                    disabled={!canEdit}
                                >
                                    <option value="DRAFT">Nháp</option>
                                    <option value="SENT">Đã Gửi</option>
                                    <option value="SIGNED">Đã Ký</option>
                                    <option value="CANCELLED">Hủy</option>
                                </select>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                            <td>
                                <div className="flex gap-2">
                                    {canEdit && (
                                        <button onClick={() => handleEditClick(c)} style={{ color: 'var(--primary)', padding: '0.25rem' }} title="Chỉnh sửa nội dung">
                                            <Edit size={18} />
                                        </button>
                                    )}
                                    <Link href={`/contracts/${c.id}`}>
                                        <button style={{ color: 'var(--primary)', padding: '0.25rem' }} title="Xem Hợp Đồng & Phụ Lục">
                                            <Eye size={18} />
                                        </button>
                                    </Link>
                                    {canDelete && (
                                        <button onClick={() => handleDelete(c.id)} style={{ color: 'var(--danger)', padding: '0.25rem' }} title="Xóa">
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
                isOpen={!!editingContract}
                onClose={() => setEditingContract(null)}
                title={`Sửa hợp đồng: ${editingContract?.title}`}
                maxWidth="1000px"
            >
                <div className="flex flex-col gap-4">
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        Khách hàng: <strong>{editingContract?.customer.name}</strong>
                    </p>
                    <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="Nội dung hợp đồng..."
                    />
                    <div className="flex gap-2" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                        <Button variant="secondary" onClick={() => setEditingContract(null)}>Hủy</Button>
                        <Button onClick={handleSaveContract} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </Card>
    );
}

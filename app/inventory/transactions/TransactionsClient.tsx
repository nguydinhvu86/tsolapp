'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Plus, Search, Eye, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteTransaction } from '../transaction-actions';

export default function TransactionsClient({ initialTransactions }: { initialTransactions: any[] }) {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filtered = initialTransactions.filter(t => {
        const matchSearch = t.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = typeFilter ? t.type === typeFilter : true;
        const matchStatus = statusFilter ? t.status === statusFilter : true;
        return matchSearch && matchType && matchStatus;
    });

    const formatDate = (d: string | Date) => {
        return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'IN': return { bg: '#dcfce7', text: '#16a34a', label: 'NHẬP KHO' };
            case 'OUT': return { bg: '#fee2e2', text: '#ef4444', label: 'XUẤT KHO' };
            case 'TRANSFER': return { bg: '#fef3c7', text: '#d97706', label: 'CHUYỂN KHO' };
            default: return { bg: '#f3f4f6', text: '#4b5563', label: type };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return { bg: '#dcfce7', text: '#16a34a', label: 'ĐÃ DUYỆT' };
            case 'DRAFT': return { bg: '#f3f4f6', text: '#4b5563', label: 'BẢN NHÁP' };
            case 'CANCELLED': return { bg: '#fee2e2', text: '#ef4444', label: 'ĐÃ HỦY' };
            default: return { bg: '#f3f4f6', text: '#4b5563', label: status };
        }
    };

    const handleDelete = async (id: string, code: string) => {
        if (confirm(`Bạn có chắc chắn muốn xóa phiếu ${code}?`)) {
            try {
                await deleteTransaction(id);
                router.refresh();
            } catch (error: any) {
                alert(error.message || 'Có lỗi xảy ra!');
            }
        }
    };

    return (
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder="Tìm theo mã phiếu..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                            outline: 'none', transition: 'border-color 0.2s', fontSize: '0.875rem'
                        }}
                    />
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{
                        padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                        outline: 'none', fontSize: '0.875rem', backgroundColor: 'white'
                    }}
                >
                    <option value="">Tất cả loại phiếu</option>
                    <option value="IN">Nhập Kho</option>
                    <option value="OUT">Xuất Kho</option>
                    <option value="TRANSFER">Chuyển Kho</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                        outline: 'none', fontSize: '0.875rem', backgroundColor: 'white'
                    }}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="DRAFT">Bản nháp</option>
                    <option value="COMPLETED">Đã duyệt</option>
                </select>

                <Button onClick={() => router.push('/inventory/transactions/new')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
                    <Plus size={16} /> Tạo Phiếu Mới
                </Button>
            </div>

            <div style={{ padding: '0' }}>
                <Table>
                    <thead>
                        <tr>
                            <th>Mã Phiếu</th>
                            <th>Loại</th>
                            <th>Trạng Thái</th>
                            <th>Từ Kho</th>
                            <th>Đến Kho</th>
                            <th>Ngày Tạo</th>
                            <th>Người Tạo</th>
                            <th style={{ width: '100px', textAlign: 'right' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length > 0 ? filtered.map((t) => {
                            const typeObj = getTypeColor(t.type);
                            const statusObj = getStatusColor(t.status);

                            return (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.code}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                            backgroundColor: typeObj.bg, color: typeObj.text
                                        }}>
                                            {typeObj.label}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                            backgroundColor: statusObj.bg, color: statusObj.text
                                        }}>
                                            {statusObj.label}
                                        </span>
                                    </td>
                                    <td>{t.fromWarehouse?.name || '-'}</td>
                                    <td>{t.toWarehouse?.name || '-'}</td>
                                    <td>{formatDate(t.date)}</td>
                                    <td>{t.creator?.name || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => router.push(`/inventory/transactions/${t.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} title="Xem chi tiết">
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(t.id, t.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: t.status === 'COMPLETED' ? 0.3 : 1 }} disabled={t.status === 'COMPLETED'} title="Xóa">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                    Không tìm thấy phiếu nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </Card>
    );
}

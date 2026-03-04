'use client'

import React, { useState } from 'react';
import { Customer } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createCustomer, updateCustomer, deleteCustomer } from './actions';
import { Plus, Edit, Trash2, Eye, ChevronUp, ChevronDown, ArrowUpDown, Search, Users, TrendingUp, Clock, RefreshCcw, Activity } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatMoney } from '@/lib/utils/formatters';

export type CustomerWithStats = Customer & { revenue?: number, lastActivityAt?: Date | string };

export function CustomerClient({ initialData }: { initialData: CustomerWithStats[] }) {
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = isAdmin || permissions.includes('CUSTOMERS_CREATE');
    const canEdit = isAdmin || permissions.includes('CUSTOMERS_EDIT');
    const canDelete = isAdmin || permissions.includes('CUSTOMERS_DELETE');

    const [customers, setCustomers] = useState<CustomerWithStats[]>(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', taxCode: '' });

    // Sort & Filter state
    const [sortField, setSortField] = useState<keyof Customer>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'TOP_REVENUE_5' | 'RECENT_10' | 'RECENT_UPDATED'>('ALL');

    const handleSort = (field: keyof Customer) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const filteredAndSortedCustomers = React.useMemo(() => {
        let result = [...customers];

        // 1. Quick Filter
        switch (activeFilter) {
            case 'TOP_REVENUE_5':
                result.sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
                result = result.slice(0, 5);
                break;
            case 'RECENT_10':
                result.sort((a, b) => new Date(b.lastActivityAt || b.createdAt).getTime() - new Date(a.lastActivityAt || a.createdAt).getTime());
                result = result.slice(0, 10);
                break;
            case 'RECENT_UPDATED':
                result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                result = result.slice(0, 10);
                break;
            case 'ALL':
            default:
                break;
        }

        // 2. Search Filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(c =>
                (c.name && c.name.toLowerCase().includes(lowerSearch)) ||
                (c.email && c.email.toLowerCase().includes(lowerSearch)) ||
                (c.phone && c.phone.includes(searchTerm)) ||
                (c.taxCode && c.taxCode.includes(searchTerm))
            );
        }

        // 3. Manual Column Sort (only if filtering essentially doesn't dictate order, e.g. 'ALL')
        if (activeFilter === 'ALL') {
            result.sort((a, b) => {
                const aVal = a[sortField] || '';
                const bVal = b[sortField] || '';
                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
                }
                return 0;
            });
        }

        return result;
    }, [customers, searchTerm, activeFilter, sortField, sortOrder]);

    const openModal = (customer?: Customer) => {
        if (customer) {
            setEditingId(customer.id);
            setFormData({
                name: customer.name,
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                taxCode: customer.taxCode || ''
            });
        } else {
            setEditingId(null);
            setFormData({ name: '', email: '', phone: '', address: '', taxCode: '' });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingId) {
            await updateCustomer(editingId, formData);
            setCustomers(customers.map(c => c.id === editingId ? { ...c, ...formData } : c));
        } else {
            await createCustomer(formData);
            window.location.reload();
        }
        closeModal();
    };

    const handleDelete = async (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
            await deleteCustomer(id);
            setCustomers(customers.filter(c => c.id !== id));
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <Card
                    className={`summary-card cursor-pointer transition-all hover:-translate-y-1 ${activeFilter === 'ALL' ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    style={{ padding: '1.25rem', border: activeFilter === 'ALL' ? '2px solid #6366f1' : '1px solid var(--border)' }}
                    onClick={() => setActiveFilter('ALL')}
                >
                    <div className="flex items-center gap-3">
                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e3a8a', margin: 0 }}>Tất Cả</h3>
                            <p style={{ fontSize: '0.875rem', color: '#6366f1', margin: 0, marginTop: '4px' }}>{customers.length} khách hàng</p>
                        </div>
                    </div>
                </Card>

                <Card
                    className={`summary-card cursor-pointer transition-all hover:-translate-y-1 ${activeFilter === 'TOP_REVENUE_5' ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}`}
                    style={{ padding: '1.25rem', border: activeFilter === 'TOP_REVENUE_5' ? '2px solid #10b981' : '1px solid var(--border)' }}
                    onClick={() => setActiveFilter('TOP_REVENUE_5')}
                >
                    <div className="flex items-center gap-3">
                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#d1fae5', color: '#059669' }}>
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#064e3b', margin: 0 }}>Bán Chạy Nhất</h3>
                            <p style={{ fontSize: '0.875rem', color: '#10b981', margin: 0, marginTop: '4px' }}>Top 5 doanh thu</p>
                        </div>
                    </div>
                </Card>

                <Card
                    className={`summary-card cursor-pointer transition-all hover:-translate-y-1 ${activeFilter === 'RECENT_10' ? 'ring-2 ring-amber-500 ring-offset-2' : ''}`}
                    style={{ padding: '1.25rem', border: activeFilter === 'RECENT_10' ? '2px solid #f59e0b' : '1px solid var(--border)' }}
                    onClick={() => setActiveFilter('RECENT_10')}
                >
                    <div className="flex items-center gap-3">
                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#fef3c7', color: '#d97706' }}>
                            <Activity size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#78350f', margin: 0 }}>Vừa Làm Việc</h3>
                            <p style={{ fontSize: '0.875rem', color: '#f59e0b', margin: 0, marginTop: '4px' }}>10 hoạt động gần nhất</p>
                        </div>
                    </div>
                </Card>

                <Card
                    className={`summary-card cursor-pointer transition-all hover:-translate-y-1 ${activeFilter === 'RECENT_UPDATED' ? 'ring-2 ring-sky-500 ring-offset-2' : ''}`}
                    style={{ padding: '1.25rem', border: activeFilter === 'RECENT_UPDATED' ? '2px solid #0ea5e9' : '1px solid var(--border)' }}
                    onClick={() => setActiveFilter('RECENT_UPDATED')}
                >
                    <div className="flex items-center gap-3">
                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius)', backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                            <RefreshCcw size={24} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0c4a6e', margin: 0 }}>Mới Cập Nhật</h3>
                            <p style={{ fontSize: '0.875rem', color: '#0ea5e9', margin: 0, marginTop: '4px' }}>10 khách hàng gần nhất</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <div className="flex gap-2 items-center" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem 1rem', background: '#fff', minWidth: '300px' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.9375rem' }}
                            placeholder="Tìm khách hàng, email, điện thoại..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {canCreate && (
                        <Button onClick={() => openModal()} className="gap-2">
                            <Plus size={18} /> Thêm khách hàng
                        </Button>
                    )}
                </div>

                <Table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div className="flex items-center gap-1">Tên khách hàng {sortField === 'name' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                            </th>
                            <th onClick={() => handleSort('email')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div className="flex items-center gap-1">Email {sortField === 'email' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                            </th>
                            <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div className="flex items-center gap-1">Số điện thoại {sortField === 'phone' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                            </th>
                            <th onClick={() => handleSort('taxCode')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                <div className="flex items-center gap-1">Mã số thuế {sortField === 'taxCode' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                            </th>
                            <th style={{ width: '100px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredAndSortedCustomers.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu phù hợp</td></tr>
                        ) : filteredAndSortedCustomers.map(customer => (
                            <tr key={customer.id}>
                                <td style={{ fontWeight: 600 }}>
                                    <Link
                                        href={`/customers/${customer.id}`}
                                        className="text-blue-600 hover:underline"
                                    >
                                        {customer.name}
                                    </Link>
                                    {activeFilter === 'TOP_REVENUE_5' && customer.revenue ? (
                                        <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem', fontWeight: 500 }}>Doanh thu: {customer.revenue.toLocaleString()}đ</div>
                                    ) : null}
                                </td>
                                <td style={{ color: 'var(--text-muted)' }}>{customer.email || '-'}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{customer.phone || '-'}</td>
                                <td>{customer.taxCode || '-'}</td>
                                <td>
                                    <div className="flex gap-2">
                                        <Link href={`/customers/${customer.id}`} style={{ color: 'var(--primary)', display: 'flex' }} title="Xem chi tiết">
                                            <Eye size={18} />
                                        </Link>
                                        {canEdit && (
                                            <button onClick={() => openModal(customer)} style={{ color: 'var(--text-muted)' }} title="Sửa">
                                                <Edit size={18} />
                                            </button>
                                        )}
                                        {canDelete && (
                                            <button onClick={() => handleDelete(customer.id)} style={{ color: 'var(--danger)' }} title="Xóa">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>

                <Modal isOpen={isModalOpen} onClose={closeModal} title={editingId ? 'Sửa khách hàng' : 'Thêm khách hàng'}>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <Input
                            label="Tên khách hàng *"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                        <Input
                            label="Email"
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                        />
                        <Input
                            label="Số điện thoại"
                            value={formData.phone}
                            onChange={e => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <Input
                            label="Địa chỉ"
                            value={formData.address}
                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                        />
                        <Input
                            label="Mã số thuế"
                            value={formData.taxCode}
                            onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                        />
                        <div className="flex gap-2" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <Button type="button" variant="secondary" onClick={closeModal}>Hủy</Button>
                            <Button type="submit">Lưu lại</Button>
                        </div>
                    </form>
                </Modal>
            </Card>
        </div>
    );
}

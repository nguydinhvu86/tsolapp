'use client'

import React, { useState } from 'react';
import { Customer } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createCustomer, updateCustomer, deleteCustomer } from './actions';
import { Plus, Edit, Trash2, Eye, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';

export function CustomerClient({ initialData }: { initialData: Customer[] }) {
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = isAdmin || permissions.includes('CUSTOMERS_CREATE');
    const canEdit = isAdmin || permissions.includes('CUSTOMERS_EDIT');
    const canDelete = isAdmin || permissions.includes('CUSTOMERS_DELETE');

    const [customers, setCustomers] = useState<Customer[]>(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', address: '', taxCode: '' });
    const [sortField, setSortField] = useState<keyof Customer>('name');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const handleSort = (field: keyof Customer) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedCustomers = [...customers].sort((a, b) => {
        const aVal = a[sortField] || '';
        const bVal = b[sortField] || '';

        if (typeof aVal === 'string' && typeof bVal === 'string') {
            return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return 0;
    });

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
            // Giản lược: Tải lại trang để lấy dữ liệu mới có ID thật thay vì mock ID
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
        <Card>
            <div className="flex justify-between items-center" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Danh sách Khách hàng</h2>
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
                    {sortedCustomers.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có dữ liệu</td></tr>
                    ) : sortedCustomers.map(customer => (
                        <tr key={customer.id}>
                            <td style={{ fontWeight: 600 }}>
                                <Link
                                    href={`/customers/${customer.id}`}
                                    className="text-blue-600 hover:underline"
                                >
                                    {customer.name}
                                </Link>
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
    );
}

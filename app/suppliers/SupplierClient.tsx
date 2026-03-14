'use client';

import React, { useState } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, Phone, Mail, Building, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { createSupplier, updateSupplier, deleteSupplier } from '@/app/purchasing/actions';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';

export function SupplierClient({ initialSuppliers }: { initialSuppliers: any[] }) {
    const [suppliers, setSuppliers] = useState(initialSuppliers);
    const [searchQuery, setSearchQuery] = useState('');

    // Sort logic
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any | null>(null);
    const [viewingSupplier, setViewingSupplier] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        taxCode: '',
        website: '',
        businessType: '',
        bankAccount: '',
        bankName: '',
        notes: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('action') === 'new') {
                handleOpenCreate();
                window.history.replaceState({}, '', '/suppliers');
            }
        }
    }, []);

    const computedSuppliers = React.useMemo(() => {
        return suppliers.map(s => {
            const validBills = s.bills ? s.bills.filter((b: any) => !['DRAFT', 'CANCELLED'].includes(b.status)) : [];
            const exactPurchases = validBills.reduce((acc: number, b: any) => acc + (b.totalAmount || 0), 0);
            const exactPayments = (s.payments || []).reduce((acc: number, p: any) => acc + (p.amount || 0), 0);
            return {
                ...s,
                computedDebt: exactPurchases - exactPayments
            };
        });
    }, [suppliers]);

    const filteredSuppliers = computedSuppliers.filter(s =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.phone && s.phone.includes(searchQuery))
    );

    const sortedSuppliers = React.useMemo(() => {
        let sortableItems = [...filteredSuppliers];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal = sortConfig.key === 'totalDebt' ? a.computedDebt : a[sortConfig.key];
                let bVal = sortConfig.key === 'totalDebt' ? b.computedDebt : b[sortConfig.key];

                // Handle nulls/undefined
                if (aVal === null || aVal === undefined) aVal = '';
                if (bVal === null || bVal === undefined) bVal = '';

                if (aVal < bVal) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aVal > bVal) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredSuppliers, sortConfig]);

    const { paginatedItems, paginationProps } = usePagination(sortedSuppliers, 15);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    const handleOpenCreate = () => {
        setFormData({ code: '', name: '', contactName: '', email: '', phone: '', address: '', taxCode: '', website: '', businessType: '', bankAccount: '', bankName: '', notes: '' });
        setIsCreateModalOpen(true);
    };

    const handleOpenEdit = (supplier: any) => {
        setFormData({
            code: supplier.code || '',
            name: supplier.name || '',
            contactName: supplier.contactName || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            taxCode: supplier.taxCode || '',
            website: supplier.website || '',
            businessType: supplier.businessType || '',
            bankAccount: supplier.bankAccount || '',
            bankName: supplier.bankName || '',
            notes: supplier.notes || ''
        });
        setEditingSupplier(supplier);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingSupplier) {
                const updated = await updateSupplier(editingSupplier.id, formData);
                setSuppliers(suppliers.map(s => s.id === updated.id ? { ...updated, bills: s.bills, payments: s.payments } : s));
                setEditingSupplier(null);
            } else {
                const created = await createSupplier(formData);
                setSuppliers([created, ...suppliers]);
                setIsCreateModalOpen(false);
            }
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi lưu Nhà cung cấp");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa nhà cung cấp này?')) return;
        try {
            await deleteSupplier(id);
            setSuppliers(suppliers.filter(s => s.id !== id));
        } catch (error) {
            console.error(error);
            alert("Không thể xóa nhà cung cấp này vì đã phát sinh giao dịch.");
        }
    };

    return (
        <div className="p-8">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl mb-1">Nhà Cung Cấp</h1>
                    <p className="text-sm text-gray-500">Quản lý danh sách nhà cung cấp và công nợ</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="btn btn-primary"
                >
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    <span>Thêm Mới</span>
                </button>
            </div>

            {/* Quick Stats or Search */}
            <div className="card search-card">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã, tên NCC, SĐT..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input"
                    />
                </div>
                <div className="flex gap-4 w-full sm:w-auto text-sm">
                    <div className="stat-card stat-card-blue" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">Tổng NCC</span>
                            <span className="stat-value">{suppliers.length}</span>
                        </div>
                    </div>
                    <div className="stat-card stat-card-red" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">Tổng Công Nợ</span>
                            <span className="stat-value">
                                {formatMoney(computedSuppliers.reduce((sum, s) => sum + (s.computedDebt || 0), 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('code')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Mã NCC <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('name')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Tên Nhà Cung Cấp <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th>Liên Hệ</th>
                            <th onClick={() => requestSort('totalDebt')} className="cursor-pointer hover:bg-gray-100 text-right">
                                <div className="flex items-center justify-end gap-1">Công Nợ <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-gray-500 py-8">
                                    Không tìm thấy nhà cung cấp nào
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((supplier) => (
                                <tr key={supplier.id}>
                                    <td className="font-medium text-gray-900 dark:text-gray-100">
                                        {supplier.code}
                                    </td>
                                    <td>
                                        <Link href={`/suppliers/${supplier.id}`} className="font-semibold text-primary hover:underline block">
                                            {supplier.name}
                                        </Link>
                                        {supplier.taxCode && <div className="text-xs text-gray-500 mt-1">MST: {supplier.taxCode}</div>}
                                    </td>
                                    <td className="text-sm text-gray-600 dark:text-gray-400">
                                        {supplier.contactName && <div className="flex items-center gap-1 mb-1"><Building size={14} /> {supplier.contactName}</div>}
                                        {supplier.phone && <div className="flex items-center gap-1 mb-1"><Phone size={14} /> {supplier.phone}</div>}
                                        {supplier.email && <div className="flex items-center gap-1"><Mail size={14} /> {supplier.email}</div>}
                                    </td>
                                    <td className="text-right">
                                        <span className={`font-semibold ${supplier.computedDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                                            {formatMoney(supplier.computedDebt || 0)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setViewingSupplier(supplier)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Xem">
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => handleOpenEdit(supplier)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Sửa">
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(supplier.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <Pagination {...paginationProps} />
            </div>

            {/* Create/Edit Modal */}
            {(isCreateModalOpen || editingSupplier) && (
                <div className="modal-backdrop">
                    <div className="modal-container" style={{ maxWidth: '800px', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                                {editingSupplier ? 'Chỉnh sửa Nhà Cung Cấp' : 'Thêm Nhà Cung Cấp Mới'}
                            </h2>
                            <button
                                onClick={() => { setIsCreateModalOpen(false); setEditingSupplier(null); }}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                &times;
                            </button>
                        </div>
                        <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                            <form id="supplierForm" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                                {/* Thông tin chung */}
                                <div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Thông Tin Chung</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Mã NCC (Để trống tự tạo)</label>
                                            <input
                                                type="text"
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className="input w-full"
                                                placeholder="VD: NCC-0001"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Tên Nhà Cung Cấp <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="input w-full"
                                                placeholder="Nhập tên nhà cung cấp..."
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Mã Số Thuế</label>
                                            <input
                                                type="text"
                                                value={formData.taxCode}
                                                onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                                className="input w-full"
                                                placeholder="Nhập mã số thuế..."
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Loại Hình Kinh Doanh</label>
                                            <input
                                                type="text"
                                                value={formData.businessType}
                                                onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                                className="input w-full"
                                                placeholder="VD: Cổ phần, TNHH, Cá nhân..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Thông tin liên hệ */}
                                <div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Thông Tin Liên Hệ</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Người Liên Hệ</label>
                                            <input
                                                type="text"
                                                value={formData.contactName}
                                                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                className="input w-full"
                                                placeholder="Tên người đại diện..."
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Số Điện Thoại</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="input w-full"
                                                placeholder="Số điện thoại..."
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Email</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="input w-full"
                                                placeholder="Email liên hệ..."
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Hồ Sơ Năng Lực / Website</label>
                                            <input
                                                type="text"
                                                value={formData.website}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                className="input w-full"
                                                placeholder="Link website hoặc tài liệu..."
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Địa Chỉ</label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="input w-full"
                                                placeholder="Địa chỉ công ty hoặc kho xưởng..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Thông tin thanh toán & Ghi chú */}
                                <div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Thông Tin Thanh Toán & Ghi Chú</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Ngân Hàng / Chi Nhánh</label>
                                            <input
                                                type="text"
                                                value={formData.bankName}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                className="input w-full"
                                                placeholder="VD: Vietcombank - CN Tân Bình"
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Số Tài Khoản</label>
                                            <input
                                                type="text"
                                                value={formData.bankAccount}
                                                onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                                                className="input w-full"
                                                placeholder="Nhập tài khoản đích..."
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>Ghi Chú Nội Bộ</label>
                                            <textarea
                                                rows={2}
                                                value={formData.notes}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                                className="input w-full"
                                                style={{ resize: 'vertical' }}
                                                placeholder="Các ghi chú khác..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', background: 'var(--surface)' }}>
                            <button
                                type="button"
                                onClick={() => { setIsCreateModalOpen(false); setEditingSupplier(null); }}
                                className="btn"
                                style={{ border: '1px solid var(--border)', background: '#fff' }}
                            >
                                Hủy
                            </button>
                            <button
                                type="submit"
                                form="supplierForm"
                                disabled={isSubmitting}
                                className="btn btn-primary"
                                style={{ background: 'var(--primary)', color: '#fff', opacity: isSubmitting ? 0.7 : 1 }}
                            >
                                {isSubmitting ? 'Đang lưu...' : (editingSupplier ? 'Cập nhật' : 'Thêm mới')}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* View Modal */}
            {
                viewingSupplier && (
                    <div className="modal-backdrop">
                        <div className="modal-container" style={{ maxWidth: '600px', maxHeight: '90vh' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.name}</h2>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>Mã NCC: {viewingSupplier.code}</p>
                                </div>
                                <button
                                    onClick={() => setViewingSupplier(null)}
                                    style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                                >
                                    &times;
                                </button>
                            </div>
                            <div style={{ padding: '1.5rem', overflowY: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Người Liên Hệ</p>
                                        <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.contactName || '--'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Loại Hình / Website</p>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{viewingSupplier.businessType || '--'}</span>
                                            {viewingSupplier.website && (
                                                <a href={viewingSupplier.website.startsWith('http') ? viewingSupplier.website : `https://${viewingSupplier.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', marginTop: '0.25rem', wordBreak: 'break-all' }}>{viewingSupplier.website}</a>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Số Điện Thoại</p>
                                        <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.phone || '--'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</p>
                                        <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.email || '--'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Mã Số Thuế</p>
                                        <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.taxCode || '--'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Thông Tin Thanh Toán</p>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{viewingSupplier.bankAccount || '--'}</span>
                                            {viewingSupplier.bankName && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{viewingSupplier.bankName}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Địa Chỉ</p>
                                    <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.address || '--'}</p>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Ghi Chú</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', margin: 0 }}>{viewingSupplier.notes || 'Không có ghi chú.'}</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem' }}>
                                    <span style={{ fontWeight: 600, color: '#991b1b' }}>Tổng Công Nợ:</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#dc2626' }}>{formatMoney(viewingSupplier.computedDebt || 0)}</span>
                                </div>
                            </div>
                            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--surface)' }}>
                                <button onClick={() => setViewingSupplier(null)} className="btn w-full" style={{ border: '1px solid var(--border)' }}>Đóng</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

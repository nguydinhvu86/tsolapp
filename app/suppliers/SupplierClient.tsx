'use client';

import React, { useState } from 'react';
import { Plus, Search, Eye, Edit2, Trash2, Phone, Mail, Building, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { createSupplier, updateSupplier, deleteSupplier } from '@/app/purchasing/actions';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { useTranslation } from '@/app/i18n/LanguageContext';

export function SupplierClient({ initialSuppliers }: { initialSuppliers: any[] }) {
    const { t } = useTranslation();
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
            alert(t('suppliers.saveError'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('suppliers.deleteConfirm'))) return;
        try {
            await deleteSupplier(id);
            setSuppliers(suppliers.filter(s => s.id !== id));
        } catch (error) {
            console.error(error);
            alert(t('suppliers.deleteError'));
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl mb-1">{t('suppliers.title')}</h1>
                    <p className="text-sm text-gray-500">{t('suppliers.description')}</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="btn btn-primary whitespace-nowrap shrink-0 flex items-center gap-2"
                >
                    <Plus size={20} />
                    <span>{t('suppliers.addNew')}</span>
                </button>
            </div>

            {/* Quick Stats or Search */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div className="flex bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 items-center gap-2 w-full md:w-80 transition-all hover:bg-white focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400">
                    <Search className="text-gray-400 shrink-0" size={18} />
                    <input
                        type="text"
                        placeholder={t('suppliers.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none w-full text-sm placeholder-gray-400 text-gray-700"
                    />
                </div>
                <div className="flex w-full overflow-x-auto pb-2 sm:pb-0 sm:w-auto gap-3 text-sm shrink-0">
                    <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg flex-1 sm:min-w-[140px] flex flex-col justify-center border border-blue-100">
                        <span className="text-xs font-bold uppercase mb-1 tracking-wider opacity-80">{t('suppliers.totalSuppliers')}</span>
                        <span className="text-2xl font-black">{suppliers.length}</span>
                    </div>
                    <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg flex-1 sm:min-w-[160px] flex flex-col justify-center border border-red-100">
                        <span className="text-xs font-bold uppercase mb-1 tracking-wider opacity-80">{t('suppliers.totalDebt')}</span>
                        <span className="text-xl font-black">
                            {formatMoney(computedSuppliers.reduce((sum, s) => sum + (s.computedDebt || 0), 0))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-wrapper overflow-x-auto w-full">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('code')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">{t('suppliers.colCode')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('name')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">{t('suppliers.colName')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th>{t('suppliers.colContact')}</th>
                            <th onClick={() => requestSort('totalDebt')} className="cursor-pointer hover:bg-gray-100 text-right">
                                <div className="flex items-center justify-end gap-1">{t('suppliers.colDebt')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-center">{t('suppliers.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-gray-500 py-8">
                                    {t('suppliers.noData')}
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
                                        {supplier.taxCode && <div className="text-xs text-gray-500 mt-1">{t('suppliers.taxCode')}: {supplier.taxCode}</div>}
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
                                            <button onClick={() => setViewingSupplier(supplier)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title={t('suppliers.view')}>
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => handleOpenEdit(supplier)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title={t('suppliers.edit')}>
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(supplier.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title={t('suppliers.delete')}>
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
                                {editingSupplier ? t('suppliers.editTitle') : t('suppliers.addTitle')}
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
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>{t('suppliers.generalInfo')}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.codeLabel')}</label>
                                            <input
                                                type="text"
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.codePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.nameLabel')} <span style={{ color: 'var(--danger)' }}>*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.namePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.taxCodeLabel')}</label>
                                            <input
                                                type="text"
                                                value={formData.taxCode}
                                                onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.taxCodePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.businessType')}</label>
                                            <input
                                                type="text"
                                                value={formData.businessType}
                                                onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.businessTypePlaceholder')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Thông tin liên hệ */}
                                <div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>{t('suppliers.contactInfo')}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.contactName')}</label>
                                            <input
                                                type="text"
                                                value={formData.contactName}
                                                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.contactNamePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.phone')}</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.phonePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.email')}</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.emailPlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.website')}</label>
                                            <input
                                                type="text"
                                                value={formData.website}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.websitePlaceholder')}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.address')}</label>
                                            <input
                                                type="text"
                                                value={formData.address}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.addressPlaceholder')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Thông tin thanh toán & Ghi chú */}
                                <div>
                                    <h3 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', textTransform: 'uppercase', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>{t('suppliers.paymentAndNotes')}</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.bankName')}</label>
                                            <input
                                                type="text"
                                                value={formData.bankName}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.bankNamePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.bankAccount')}</label>
                                            <input
                                                type="text"
                                                value={formData.bankAccount}
                                                onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                                                className="input w-full"
                                                placeholder={t('suppliers.bankAccountPlaceholder')}
                                            />
                                        </div>
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-main)' }}>{t('suppliers.internalNotes')}</label>
                                            <textarea
                                                rows={2}
                                                value={formData.notes}
                                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                                className="input w-full"
                                                style={{ resize: 'vertical' }}
                                                placeholder={t('suppliers.internalNotesPlaceholder')}
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
                                {t('suppliers.cancel')}
                            </button>
                            <button
                                type="submit"
                                form="supplierForm"
                                disabled={isSubmitting}
                                className="btn btn-primary"
                                style={{ background: 'var(--primary)', color: '#fff', opacity: isSubmitting ? 0.7 : 1 }}
                            >
                                {isSubmitting ? t('suppliers.saving') : (editingSupplier ? t('suppliers.updateBtn') : t('suppliers.addBtn'))}
                            </button>
                        </div>
                    </div>
                </div>
            )
            }

            {/* View Modal */}
            {/* View Modal */}
            {
                viewingSupplier && (
                    <div className="modal-backdrop">
                        <div className="modal-container" style={{ maxWidth: '600px', maxHeight: '90vh' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.name}</h2>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>{t('suppliers.code')}: {viewingSupplier.code}</p>
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
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.contactName')}</p>
                                        <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.contactName || '--'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.businessType')} / {t('suppliers.website')}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{viewingSupplier.businessType || '--'}</span>
                                            {viewingSupplier.website && (
                                                <a href={viewingSupplier.website.startsWith('http') ? viewingSupplier.website : `https://${viewingSupplier.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', marginTop: '0.25rem', wordBreak: 'break-all' }}>{viewingSupplier.website}</a>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.phone')}</p>
                                        <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.phone || '--'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.email')}</p>
                                        <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.email || '--'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.taxCodeLabel')}</p>
                                        <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.taxCode || '--'}</p>
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.paymentAndNotes')}</p>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{viewingSupplier.bankAccount || '--'}</span>
                                            {viewingSupplier.bankName && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{viewingSupplier.bankName}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.address')}</p>
                                    <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.address || '--'}</p>
                                </div>
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.internalNotes')}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', margin: 0 }}>{viewingSupplier.notes || '--'}</p>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '1rem', borderRadius: '8px', marginTop: '1.5rem' }}>
                                    <span style={{ fontWeight: 600, color: '#991b1b' }}>{t('suppliers.totalDebt')}:</span>
                                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#dc2626' }}>{formatMoney(viewingSupplier.computedDebt || 0)}</span>
                                </div>
                            </div>
                            <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', background: 'var(--surface)' }}>
                                <button onClick={() => setViewingSupplier(null)} className="btn w-full" style={{ border: '1px solid var(--border)' }}>{t('suppliers.cancel')}</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

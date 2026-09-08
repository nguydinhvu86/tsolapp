'use client';

import React, { useState } from 'react';
import { 
    Plus, Search, Eye, Edit2, Trash2, Phone, Mail, Building, ArrowUpDown,
    Sparkles, Loader2, Building2, CreditCard, FileText, CheckCircle2, AlertCircle,
    Globe, MapPin, DollarSign 
} from 'lucide-react';
import Link from 'next/link';
import { createSupplier, updateSupplier, deleteSupplier, lookupSupplierTaxCode } from '@/app/purchasing/actions';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { useTranslation } from '@/app/i18n/LanguageContext';

const emptySupplierForm = {
    code: '',
    name: '',
    shortName: '',
    internationalName: '',
    contactName: '',
    email: '',
    phone: '',
    address: '',
    billingAddress: '',
    shippingAddress: '',
    taxCode: '',
    taxStatus: '',
    website: '',
    businessType: '',
    bankAccount: '',
    bankName: '',
    bankBranch: '',
    paymentTerms: '',
    creditLimit: 0,
    notes: ''
};

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
    const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'financial' | 'notes'>('general');

    // Tax Lookup
    const [isLookingUpTax, setIsLookingUpTax] = useState(false);
    const [taxLookupMessage, setTaxLookupMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [formData, setFormData] = useState(emptySupplierForm);
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
        (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.shortName && s.shortName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.phone && s.phone.includes(searchQuery)) ||
        (s.taxCode && s.taxCode.includes(searchQuery))
    );

    const sortedSuppliers = React.useMemo(() => {
        let sortableItems = [...filteredSuppliers];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal = sortConfig.key === 'totalDebt' ? a.computedDebt : a[sortConfig.key];
                let bVal = sortConfig.key === 'totalDebt' ? b.computedDebt : b[sortConfig.key];

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
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 6, minimumFractionDigits: 0 }).format(amount || 0);
    };

    const handleOpenCreate = () => {
        setTaxLookupMessage(null);
        setActiveTab('general');
        setFormData(emptySupplierForm);
        setEditingSupplier(null);
        setIsCreateModalOpen(true);
    };

    const handleOpenEdit = (supplier: any) => {
        setTaxLookupMessage(null);
        setActiveTab('general');
        setFormData({
            code: supplier.code || '',
            name: supplier.name || '',
            shortName: supplier.shortName || '',
            internationalName: supplier.internationalName || '',
            contactName: supplier.contactName || '',
            email: supplier.email || '',
            phone: supplier.phone || '',
            address: supplier.address || '',
            billingAddress: supplier.billingAddress || '',
            shippingAddress: supplier.shippingAddress || '',
            taxCode: supplier.taxCode || '',
            taxStatus: supplier.taxStatus || '',
            website: supplier.website || '',
            businessType: supplier.businessType || '',
            bankAccount: supplier.bankAccount || '',
            bankName: supplier.bankName || '',
            bankBranch: supplier.bankBranch || '',
            paymentTerms: supplier.paymentTerms || '',
            creditLimit: supplier.creditLimit || 0,
            notes: supplier.notes || ''
        });
        setEditingSupplier(supplier);
        setIsCreateModalOpen(true);
    };

    const handleTaxLookup = async () => {
        if (!formData.taxCode?.trim()) {
            setTaxLookupMessage({ type: 'error', text: 'Vui lòng nhập Mã số thuế để tra cứu.' });
            return;
        }

        setIsLookingUpTax(true);
        setTaxLookupMessage(null);

        try {
            const res = await lookupSupplierTaxCode(formData.taxCode.trim());
            if (res.success && res.data) {
                const { name, shortName, internationalName, address, status } = res.data;
                setFormData(prev => ({
                    ...prev,
                    name: name || prev.name,
                    shortName: shortName || prev.shortName,
                    internationalName: internationalName || prev.internationalName,
                    address: address || prev.address,
                    billingAddress: prev.billingAddress ? prev.billingAddress : (address || ''),
                    taxStatus: status || 'NNT đang hoạt động'
                }));
                setTaxLookupMessage({
                    type: 'success',
                    text: `Đã tìm thấy: ${name}${status ? ` (${status})` : ''}`
                });
            } else {
                setTaxLookupMessage({
                    type: 'error',
                    text: res.message || 'Không tìm thấy thông tin doanh nghiệp với MST này.'
                });
            }
        } catch (error: any) {
            setTaxLookupMessage({
                type: 'error',
                text: error.message || 'Lỗi khi tra cứu mã số thuế.'
            });
        } finally {
            setIsLookingUpTax(false);
        }
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
            }
            setIsCreateModalOpen(false);
        } catch (error: any) {
            console.error(error);
            alert(error.message || t('suppliers.saveError'));
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
                    <h1 className="text-2xl mb-1 font-bold text-slate-800">{t('suppliers.title')}</h1>
                    <p className="text-sm text-gray-500">{t('suppliers.description')}</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="btn btn-primary whitespace-nowrap shrink-0 flex items-center gap-2 bg-primary text-white hover:bg-primary-hover px-4 py-2.5 rounded-lg shadow-sm"
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
                        placeholder="Tìm theo Mã, Tên, MST, SĐT..."
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
            <div className="table-wrapper overflow-x-auto w-full bg-white rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full min-w-[800px]">
                    <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/70">
                            <th onClick={() => requestSort('code')} className="cursor-pointer hover:bg-gray-100 py-3.5 px-4 text-left font-semibold text-xs text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center gap-1">{t('suppliers.colCode')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('name')} className="cursor-pointer hover:bg-gray-100 py-3.5 px-4 text-left font-semibold text-xs text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center gap-1">{t('suppliers.colName')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="py-3.5 px-4 text-left font-semibold text-xs text-gray-600 uppercase tracking-wider">{t('suppliers.colContact')}</th>
                            <th onClick={() => requestSort('totalDebt')} className="cursor-pointer hover:bg-gray-100 py-3.5 px-4 text-right font-semibold text-xs text-gray-600 uppercase tracking-wider">
                                <div className="flex items-center justify-end gap-1">{t('suppliers.colDebt')} <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-center py-3.5 px-4 font-semibold text-xs text-gray-600 uppercase tracking-wider">{t('suppliers.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center text-gray-500 py-8">
                                    {t('suppliers.noData')}
                                </td>
                            </tr>
                        ) : (
                            paginatedItems.map((supplier) => (
                                <tr key={supplier.id} className="hover:bg-slate-50/80 transition-colors">
                                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-gray-700">
                                        <span className="px-2 py-1 bg-slate-100 rounded border border-slate-200">
                                            {supplier.code}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <Link href={`/suppliers/${supplier.id}`} className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline block text-[14px]">
                                            {supplier.name}
                                        </Link>
                                        <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                                            {supplier.shortName && <span>({supplier.shortName})</span>}
                                            {supplier.taxCode && <span>• MST: <span className="font-mono text-gray-700">{supplier.taxCode}</span></span>}
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 text-sm text-gray-600">
                                        {supplier.contactName && <div className="flex items-center gap-1.5 mb-0.5"><Building size={14} className="text-gray-400" /> {supplier.contactName}</div>}
                                        {supplier.phone && <div className="flex items-center gap-1.5 mb-0.5"><Phone size={14} className="text-gray-400" /> {supplier.phone}</div>}
                                        {supplier.email && <div className="flex items-center gap-1.5"><Mail size={14} className="text-gray-400" /> {supplier.email}</div>}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <span className={`font-bold text-sm ${supplier.computedDebt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            {formatMoney(supplier.computedDebt || 0)}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button onClick={() => setViewingSupplier(supplier)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors" title={t('suppliers.view')}>
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => handleOpenEdit(supplier)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors" title={t('suppliers.edit')}>
                                                <Edit2 size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(supplier.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors" title={t('suppliers.delete')}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <div className="p-4 border-t border-gray-100">
                    <Pagination {...paginationProps} />
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isCreateModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-container" style={{ maxWidth: '850px', maxHeight: '92vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                                    {editingSupplier ? t('suppliers.editTitle') : t('suppliers.addTitle')}
                                </h2>
                                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                    Tra cứu tự động qua MST hoặc điền thông tin chi tiết nhà cung cấp
                                </p>
                            </div>
                            <button
                                onClick={() => { setIsCreateModalOpen(false); setEditingSupplier(null); }}
                                style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                            >
                                &times;
                            </button>
                        </div>

                        {/* Tax Lookup Quick Bar */}
                        <div className="bg-indigo-50/70 border-b border-indigo-100 p-4 sm:px-6">
                            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                                <div className="flex-1 flex items-center bg-white rounded-lg border border-indigo-200 px-3 py-1.5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-indigo-400">
                                    <Sparkles className="text-indigo-500 mr-2 shrink-0" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Nhập Mã số thuế để tự động tra cứu..."
                                        value={formData.taxCode || ''}
                                        onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTaxLookup(); } }}
                                        className="w-full bg-transparent border-none outline-none text-sm font-medium text-slate-800 placeholder-slate-400"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleTaxLookup}
                                    disabled={isLookingUpTax || !formData.taxCode?.trim()}
                                    className="btn bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 shadow-sm shrink-0 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isLookingUpTax ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            <span>Đang tra cứu...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search size={16} />
                                            <span>Tra cứu</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {taxLookupMessage && (
                                <div className={`mt-2.5 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                    taxLookupMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                    {taxLookupMessage.type === 'success' ? <CheckCircle2 size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
                                    <span>{taxLookupMessage.text}</span>
                                </div>
                            )}
                        </div>

                        {/* Tabs Header */}
                        <div className="flex border-b border-gray-200 px-6 bg-slate-50 gap-2 overflow-x-auto hide-scrollbar">
                            <button
                                type="button"
                                onClick={() => setActiveTab('general')}
                                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeTab === 'general' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <Building2 size={16} /> Thông Tin Chung & Thuế
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('contact')}
                                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeTab === 'contact' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <Phone size={16} /> Liên Hệ & Địa Chỉ
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('financial')}
                                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeTab === 'financial' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <CreditCard size={16} /> Tài Chính & Ngân Hàng
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('notes')}
                                className={`py-3 px-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeTab === 'notes' ? 'border-indigo-600 text-indigo-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                <FileText size={16} /> Ghi Chú
                            </button>
                        </div>

                        {/* Form Body */}
                        <form id="supplierForm" onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(92vh - 240px)' }}>
                            {activeTab === 'general' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.codeLabel')}</label>
                                            <input
                                                type="text"
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className="input w-full font-mono text-sm"
                                                placeholder={t('suppliers.codePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.taxCodeLabel')}</label>
                                            <input
                                                type="text"
                                                value={formData.taxCode}
                                                onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                                className="input w-full font-mono text-sm"
                                                placeholder={t('suppliers.taxCodePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Trạng Thái MST</label>
                                            <input
                                                type="text"
                                                value={formData.taxStatus || ''}
                                                onChange={e => setFormData({ ...formData, taxStatus: e.target.value })}
                                                placeholder="NNT đang hoạt động"
                                                className="input w-full text-sm bg-gray-50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">
                                            {t('suppliers.nameLabel')} <span style={{ color: 'var(--danger)' }}>*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="input w-full font-medium"
                                            placeholder={t('suppliers.namePlaceholder')}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Viết Tắt / Giao Dịch</label>
                                            <input
                                                type="text"
                                                value={formData.shortName || ''}
                                                onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder="Ví dụ: INTEL VN, FPT"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Quốc Tế</label>
                                            <input
                                                type="text"
                                                value={formData.internationalName || ''}
                                                onChange={e => setFormData({ ...formData, internationalName: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder="International name..."
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.businessType')}</label>
                                        <input
                                            type="text"
                                            value={formData.businessType}
                                            onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                            className="input w-full text-sm"
                                            placeholder={t('suppliers.businessTypePlaceholder')}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contact' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.contactName')}</label>
                                            <input
                                                type="text"
                                                value={formData.contactName}
                                                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder={t('suppliers.contactNamePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.phone')}</label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder={t('suppliers.phonePlaceholder')}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.email')}</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder={t('suppliers.emailPlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.website')}</label>
                                            <input
                                                type="text"
                                                value={formData.website}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder={t('suppliers.websitePlaceholder')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.address')}</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="input w-full text-sm"
                                            placeholder={t('suppliers.addressPlaceholder')}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Xuất Hóa Đơn</label>
                                            <input
                                                type="text"
                                                value={formData.billingAddress || ''}
                                                onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder="Địa chỉ xuất hóa đơn..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Kho / Giao Hàng</label>
                                            <input
                                                type="text"
                                                value={formData.shippingAddress || ''}
                                                onChange={e => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder="Địa chỉ kho xuất hàng..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'financial' && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.bankName')}</label>
                                            <input
                                                type="text"
                                                value={formData.bankName}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder={t('suppliers.bankNamePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.bankAccount')}</label>
                                            <input
                                                type="text"
                                                value={formData.bankAccount}
                                                onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                                                className="input w-full font-mono text-sm"
                                                placeholder={t('suppliers.bankAccountPlaceholder')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Chi Nhánh Ngân Hàng</label>
                                        <input
                                            type="text"
                                            value={formData.bankBranch || ''}
                                            onChange={e => setFormData({ ...formData, bankBranch: e.target.value })}
                                            className="input w-full text-sm"
                                            placeholder="Ví dụ: Chi nhánh TP.HCM..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Điều Khoản Thanh Toán</label>
                                            <input
                                                type="text"
                                                value={formData.paymentTerms || ''}
                                                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                                className="input w-full text-sm"
                                                placeholder="Thanh toán ngay, gối đầu 30 ngày..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Hạn Mức Công Nợ (VNĐ)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={formData.creditLimit || ''}
                                                onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                                                className="input w-full font-mono text-sm"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">{t('suppliers.internalNotes')}</label>
                                        <textarea
                                            rows={5}
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="input w-full text-sm"
                                            style={{ resize: 'vertical' }}
                                            placeholder={t('suppliers.internalNotesPlaceholder')}
                                        />
                                    </div>
                                </div>
                            )}
                        </form>

                        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', background: 'var(--surface)' }}>
                            <button
                                type="button"
                                onClick={() => { setIsCreateModalOpen(false); setEditingSupplier(null); }}
                                className="btn"
                                style={{ border: '1px solid var(--border)', background: '#fff' }}
                                disabled={isSubmitting}
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
            )}

            {/* View Modal */}
            {viewingSupplier && (
                <div className="modal-backdrop">
                    <div className="modal-container" style={{ maxWidth: '650px', maxHeight: '90vh' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded border border-indigo-200">
                                        {viewingSupplier.code}
                                    </span>
                                    {viewingSupplier.taxStatus && (
                                        <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                                            {viewingSupplier.taxStatus}
                                        </span>
                                    )}
                                </div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.name}</h2>
                                {viewingSupplier.shortName && (
                                    <p className="text-xs text-gray-500 m-0 mt-0.5">Tên viết tắt: {viewingSupplier.shortName} {viewingSupplier.internationalName ? `• ${viewingSupplier.internationalName}` : ''}</p>
                                )}
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
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.contactName')}</p>
                                    <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.contactName || '--'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.businessType')} / {t('suppliers.website')}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{viewingSupplier.businessType || '--'}</span>
                                        {viewingSupplier.website && (
                                            <a href={viewingSupplier.website.startsWith('http') ? viewingSupplier.website : `https://${viewingSupplier.website}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', marginTop: '0.25rem', wordBreak: 'break-all' }}>{viewingSupplier.website}</a>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.phone')}</p>
                                    <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.phone || '--'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.email')}</p>
                                    <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.email || '--'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.taxCodeLabel')}</p>
                                    <p style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.taxCode || '--'}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Tài Khoản Ngân Hàng</p>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontWeight: 500, color: 'var(--text-main)', fontFamily: 'monospace' }}>{viewingSupplier.bankAccount || '--'}</span>
                                        {viewingSupplier.bankName && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{viewingSupplier.bankName} {viewingSupplier.bankBranch ? `(${viewingSupplier.bankBranch})` : ''}</span>}
                                    </div>
                                </div>
                            </div>
                            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.address')}</p>
                                <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.address || '--'}</p>
                            </div>
                            {viewingSupplier.billingAddress && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginBottom: '1rem' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Địa Chỉ Xuất Hóa Đơn</p>
                                    <p style={{ fontWeight: 500, color: 'var(--text-main)', margin: 0 }}>{viewingSupplier.billingAddress}</p>
                                </div>
                            )}
                            {viewingSupplier.notes && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                                    <p style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{t('suppliers.internalNotes')}</p>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--text-main)', whiteSpace: 'pre-wrap', margin: 0 }}>{viewingSupplier.notes}</p>
                                </div>
                            )}
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
            )}
        </div>
    );
}

'use client';

import React, { useState } from 'react';
import { 
    Plus, Search, Eye, Edit2, Trash2, Phone, Mail, Building, ArrowUpDown,
    Sparkles, Loader2, Building2, CreditCard, FileText, CheckCircle2, AlertCircle,
    Globe, MapPin, DollarSign, X 
} from 'lucide-react';
import Link from 'next/link';
import { createSupplier, updateSupplier, deleteSupplier, lookupSupplierTaxCode, checkSupplierDuplicate } from '@/app/purchasing/actions';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Button } from '@/app/components/ui/Button';
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

function getInitials(name: string) {
    if (!name) return 'NCC';
    const clean = name.replace(/^(công ty|cty|tnhh|cổ phần|cp|mtv|tư vấn|đầu tư|thương mại|dịch vụ)\s+/gi, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return (words[0] || name).slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
    'from-emerald-500 to-teal-600',
    'from-blue-500 to-indigo-600',
    'from-indigo-500 to-purple-600',
    'from-violet-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-cyan-500 to-blue-600'
];

function getAvatarGradient(id: string) {
    if (!id) return AVATAR_GRADIENTS[0];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
    return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

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
    const [duplicateWarnings, setDuplicateWarnings] = useState<{ field: string; message: string; duplicateEntity?: any }[]>([]);
    const [isCheckingDup, setIsCheckingDup] = useState(false);

    // Real-time duplicate validation with debounce
    React.useEffect(() => {
        if (!isCreateModalOpen) {
            setDuplicateWarnings([]);
            return;
        }
        const timer = setTimeout(async () => {
            if (!formData.taxCode?.trim() && !formData.email?.trim() && !formData.phone?.trim() && !formData.code?.trim()) {
                setDuplicateWarnings([]);
                return;
            }
            setIsCheckingDup(true);
            try {
                const res = await checkSupplierDuplicate({
                    code: formData.code,
                    taxCode: formData.taxCode,
                    email: formData.email,
                    phone: formData.phone
                }, editingSupplier ? editingSupplier.id : undefined);
                if (res.hasDuplicate) {
                    setDuplicateWarnings(res.duplicates);
                } else {
                    setDuplicateWarnings([]);
                }
            } catch (e) {
                // ignore
            } finally {
                setIsCheckingDup(false);
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [formData.taxCode, formData.email, formData.phone, formData.code, isCreateModalOpen, editingSupplier]);

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
        if (duplicateWarnings.length > 0) {
            alert(`CẢNH BÁO TRÙNG LẶP DỮ LIỆU:\n\n${duplicateWarnings.map(w => `• ${w.message}`).join('\n')}\n\nVui lòng kiểm tra lại trước khi lưu.`);
            return;
        }
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
        <div className="flex flex-col gap-5">
            {/* Top Page Tech Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            CHUỖI CUNG ỨNG &amp; NHÀ CUNG CẤP
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">|</span>
                        <span className="text-[11px] font-medium text-slate-500">{t('suppliers.description')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{t('suppliers.title')}</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                            {suppliers.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <Button
                        onClick={handleOpenCreate}
                        className="btn btn-primary gap-2 h-[34px] px-3.5 text-xs font-bold rounded-lg shadow-sm"
                    >
                        <Plus size={15} className="stroke-[2.5]" />
                        <span>{t('suppliers.addNew')}</span>
                    </Button>
                </div>
            </div>

            {/* Quick KPI Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="rounded-xl p-3.5 bg-white border border-slate-200/90 shadow-xs">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20 shrink-0">
                                <Building2 size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 tracking-tight">{t('suppliers.totalSuppliers')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Đối tác cung ứng toàn hệ thống</p>
                            </div>
                        </div>
                        <span className="text-base font-extrabold font-mono text-slate-800">
                            {suppliers.length}
                        </span>
                    </div>
                </div>

                <div className="rounded-xl p-3.5 bg-white border border-rose-200/90 bg-gradient-to-br from-rose-50/30 via-white to-white shadow-xs">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-white flex items-center justify-center shadow-xs shadow-rose-500/20 shrink-0">
                                <DollarSign size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 tracking-tight">{t('suppliers.totalDebt')}</h3>
                                <p className="text-[11px] text-rose-500 mt-0.5">Phải trả nhà cung cấp</p>
                            </div>
                        </div>
                        <span className="text-sm font-extrabold font-mono text-rose-600">
                            {formatMoney(computedSuppliers.reduce((sum, s) => sum + (s.computedDebt || 0), 0))}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Data Container */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Search & Actions Toolbar */}
                <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="relative w-full sm:w-[340px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo Mã, Tên, MST, SĐT..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-[34px] pl-9 pr-8 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-2xs"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            Hiển thị <span className="text-slate-900 font-bold">{sortedSuppliers.length}</span> / {suppliers.length} nhà cung cấp
                        </span>
                    </div>
                </div>

                {/* High Density Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/90 bg-slate-100/70">
                                <th onClick={() => requestSort('code')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[100px] hover:bg-slate-200/50 transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        {t('suppliers.colCode')}
                                        <ArrowUpDown size={11} className="opacity-30" />
                                    </div>
                                </th>
                                <th onClick={() => requestSort('name')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/50 transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        {t('suppliers.colName')}
                                        <ArrowUpDown size={11} className="opacity-30" />
                                    </div>
                                </th>
                                <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[240px]">
                                    {t('suppliers.colContact')}
                                </th>
                                <th onClick={() => requestSort('totalDebt')} className="cursor-pointer select-none py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[150px] hover:bg-slate-200/50 transition-colors">
                                    <div className="flex items-center justify-end gap-1.5">
                                        {t('suppliers.colDebt')}
                                        <ArrowUpDown size={11} className="opacity-30" />
                                    </div>
                                </th>
                                <th className="py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[90px]">
                                    {t('suppliers.colActions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Search size={18} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600">{t('suppliers.noData')}</p>
                                            <p className="text-[11px] text-slate-400">Không tìm thấy nhà cung cấp nào phù hợp.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((supplier) => {
                                    const initials = getInitials(supplier.name);
                                    const gradient = getAvatarGradient(supplier.id);

                                    return (
                                        <tr key={supplier.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200/80 shadow-2xs inline-block">
                                                    {supplier.code || '--'}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} text-white font-bold text-[11px] flex items-center justify-center shadow-2xs shrink-0`}>
                                                        {initials}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <Link
                                                            href={`/suppliers/${supplier.id}`}
                                                            className="text-slate-900 font-semibold text-xs hover:text-emerald-700 transition-colors block truncate max-w-[280px] sm:max-w-[360px] md:max-w-none"
                                                        >
                                                            {supplier.name}
                                                        </Link>
                                                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                                                            {supplier.shortName && <span>({supplier.shortName})</span>}
                                                            {supplier.taxCode && <span>• MST: <span className="font-mono text-slate-700">{supplier.taxCode}</span></span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2.5 px-3.5 align-middle text-xs text-slate-600">
                                                {supplier.contactName && <div className="flex items-center gap-1.5 text-[11px] mb-0.5"><Building2 size={12} className="text-slate-400" /> {supplier.contactName}</div>}
                                                {supplier.phone && <div className="flex items-center gap-1.5 text-[11px] mb-0.5"><Phone size={12} className="text-slate-400" /> {supplier.phone}</div>}
                                                {supplier.email && <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate max-w-[200px]"><Mail size={12} className="text-slate-400" /> {supplier.email}</div>}
                                            </td>
                                            <td className="py-2.5 px-3.5 align-middle text-right">
                                                <span className={`font-mono text-xs font-bold ${supplier.computedDebt > 0 ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-emerald-600'}`}>
                                                    {formatMoney(supplier.computedDebt || 0)}
                                                </span>
                                            </td>
                                            <td className="py-2.5 px-3.5 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setViewingSupplier(supplier)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors cursor-pointer"
                                                        title={t('suppliers.view')}
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenEdit(supplier)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                                                        title={t('suppliers.edit')}
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(supplier.id)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                                        title={t('suppliers.delete')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
                    <Pagination {...paginationProps} />
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isCreateModalOpen && (
                <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, padding: '1rem', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)' }}>
                    <div className="modal-container shadow-2xl w-full max-w-[850px]" style={{ maxHeight: '92vh', background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-[15px] font-bold text-slate-800">
                                    {editingSupplier ? t('suppliers.editTitle') : t('suppliers.addTitle')}
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Tra cứu tự động qua MST hoặc điền thông tin chi tiết nhà cung cấp
                                </p>
                            </div>
                            <button
                                onClick={() => { setIsCreateModalOpen(false); setEditingSupplier(null); }}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tax Lookup Quick Bar */}
                        <div className="bg-emerald-50/60 border-b border-emerald-100 px-4 py-2.5">
                            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                                <div className="flex-1 flex items-center bg-white rounded-lg border border-emerald-200 px-2.5 py-1 shadow-2xs focus-within:ring-1 focus-within:ring-emerald-500 focus-within:border-emerald-500 h-[34px]">
                                    <Sparkles className="text-emerald-600 mr-2 shrink-0" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Nhập Mã số thuế để tự động tra cứu..."
                                        value={formData.taxCode || ''}
                                        onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTaxLookup(); } }}
                                        className="w-full bg-transparent border-none outline-none text-xs font-medium text-slate-800 placeholder-slate-400"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleTaxLookup}
                                    disabled={isLookingUpTax || !formData.taxCode?.trim()}
                                    className="h-[34px] bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs shrink-0 transition-all disabled:opacity-50 cursor-pointer"
                                >
                                    {isLookingUpTax ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} />
                                            <span>Đang tra cứu...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Search size={14} />
                                            <span>Tra cứu</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {taxLookupMessage && (
                                <div className={`mt-2 p-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
                                    taxLookupMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                                }`}>
                                    {taxLookupMessage.type === 'success' ? <CheckCircle2 size={14} className="shrink-0" /> : <AlertCircle size={14} className="shrink-0" />}
                                    <span>{taxLookupMessage.text}</span>
                                </div>
                            )}

                            {duplicateWarnings.length > 0 && (
                                <div className="mt-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1.5 shadow-2xs animate-pulse">
                                    <div className="font-bold flex items-center gap-1.5 text-rose-900">
                                        <AlertCircle size={15} className="shrink-0 text-rose-600" />
                                        <span>PHÁT HIỆN TRÙNG LẶP DỮ LIỆU ({duplicateWarnings.length})</span>
                                    </div>
                                    {duplicateWarnings.map((w, idx) => (
                                        <div key={idx} className="text-rose-700 font-medium pl-5">
                                            • {w.message}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tabs Header */}
                        <div className="flex border-b border-slate-200 px-4 bg-slate-50 gap-1 overflow-x-auto hide-scrollbar">
                            <button
                                type="button"
                                onClick={() => setActiveTab('general')}
                                className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeTab === 'general' ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Building2 size={14} /> Thông Tin Chung & Thuế
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('contact')}
                                className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeTab === 'contact' ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Phone size={14} /> Liên Hệ & Địa Chỉ
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('financial')}
                                className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeTab === 'financial' ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <CreditCard size={14} /> Tài Chính & Ngân Hàng
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('notes')}
                                className={`py-2 px-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                                    activeTab === 'notes' ? 'border-primary text-primary bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <FileText size={14} /> Ghi Chú
                            </button>
                        </div>

                        {/* Form Body */}
                        <form id="supplierForm" onSubmit={handleSubmit} className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 220px)' }}>
                            {activeTab === 'general' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                {t('suppliers.codeLabel')}
                                                {duplicateWarnings.some(w => w.field === 'code') && <span className="text-rose-600 ml-1 font-bold">(Trùng mã)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all font-mono text-slate-900 bg-white ${
                                                    duplicateWarnings.some(w => w.field === 'code')
                                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                                                        : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
                                                }`}
                                                placeholder={t('suppliers.codePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                {t('suppliers.taxCodeLabel')}
                                                {duplicateWarnings.some(w => w.field === 'taxCode') && <span className="text-rose-600 ml-1 font-bold">(Trùng MST)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.taxCode}
                                                onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                                className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all font-mono text-slate-900 bg-white ${
                                                    duplicateWarnings.some(w => w.field === 'taxCode')
                                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                                                        : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
                                                }`}
                                                placeholder={t('suppliers.taxCodePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng Thái MST</label>
                                            <input
                                                type="text"
                                                value={formData.taxStatus || ''}
                                                onChange={e => setFormData({ ...formData, taxStatus: e.target.value })}
                                                placeholder="NNT đang hoạt động"
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">
                                            {t('suppliers.nameLabel')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-slate-900 bg-white"
                                            placeholder={t('suppliers.namePlaceholder')}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Viết Tắt / Giao Dịch</label>
                                            <input
                                                type="text"
                                                value={formData.shortName || ''}
                                                onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                placeholder="Ví dụ: INTEL VN, FPT"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Quốc Tế</label>
                                            <input
                                                type="text"
                                                value={formData.internationalName || ''}
                                                onChange={e => setFormData({ ...formData, internationalName: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                placeholder="International name..."
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.businessType')}</label>
                                        <input
                                            type="text"
                                            value={formData.businessType}
                                            onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                            className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                            placeholder={t('suppliers.businessTypePlaceholder')}
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contact' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.contactName')}</label>
                                            <input
                                                type="text"
                                                value={formData.contactName}
                                                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                placeholder={t('suppliers.contactNamePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                {t('suppliers.phone')}
                                                {duplicateWarnings.some(w => w.field === 'phone') && <span className="text-rose-600 ml-1 font-bold">(Trùng SĐT)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.phone}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${
                                                    duplicateWarnings.some(w => w.field === 'phone')
                                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                                                        : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
                                                }`}
                                                placeholder={t('suppliers.phonePlaceholder')}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                {t('suppliers.email')}
                                                {duplicateWarnings.some(w => w.field === 'email') && <span className="text-rose-600 ml-1 font-bold">(Trùng Email)</span>}
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${
                                                    duplicateWarnings.some(w => w.field === 'email')
                                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                                                        : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
                                                }`}
                                                placeholder={t('suppliers.emailPlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.website')}</label>
                                            <input
                                                type="text"
                                                value={formData.website}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                placeholder={t('suppliers.websitePlaceholder')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.address')}</label>
                                        <input
                                            type="text"
                                            value={formData.address}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                            placeholder={t('suppliers.addressPlaceholder')}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ Xuất Hóa Đơn</label>
                                            <input
                                                type="text"
                                                value={formData.billingAddress || ''}
                                                onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                placeholder="Địa chỉ xuất hóa đơn..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ Kho Hàng / Giao Hàng</label>
                                            <input
                                                type="text"
                                                value={formData.shippingAddress || ''}
                                                onChange={e => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                placeholder="Địa chỉ kho hàng..."
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'financial' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.bankName')}</label>
                                            <input
                                                type="text"
                                                value={formData.bankName}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                placeholder={t('suppliers.bankNamePlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.bankAccount')}</label>
                                            <input
                                                type="text"
                                                value={formData.bankAccount}
                                                onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono text-slate-900 bg-white"
                                                placeholder={t('suppliers.bankAccountPlaceholder')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.bankBranch')}</label>
                                        <input
                                            type="text"
                                            value={formData.bankBranch}
                                            onChange={e => setFormData({ ...formData, bankBranch: e.target.value })}
                                            className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                            placeholder={t('suppliers.bankBranchPlaceholder')}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.paymentTerms')}</label>
                                            <input
                                                type="text"
                                                value={formData.paymentTerms}
                                                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                placeholder={t('suppliers.paymentTermsPlaceholder')}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.creditLimit')}</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={formData.creditLimit}
                                                onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono text-slate-900 bg-white"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-600 mb-1">{t('suppliers.internalNotes')}</label>
                                        <textarea
                                            rows={4}
                                            value={formData.notes}
                                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                            className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none text-slate-900 bg-white placeholder:text-slate-400"
                                            placeholder={t('suppliers.notesPlaceholder')}
                                        />
                                    </div>
                                </div>
                            )}
                        </form>

                        {/* Modal Footer */}
                        <div className="px-4 py-3 border-t border-slate-200 flex justify-between items-center bg-slate-50">
                            <div className="text-xs text-slate-500">
                                <span className="font-semibold">{activeTab === 'general' ? 'Bước 1/4' : activeTab === 'contact' ? 'Bước 2/4' : activeTab === 'financial' ? 'Bước 3/4' : 'Bước 4/4'}</span>: {
                                    activeTab === 'general' ? 'Thông tin chung & Thuế' : activeTab === 'contact' ? 'Liên hệ & Địa chỉ' : activeTab === 'financial' ? 'Tài chính' : 'Ghi chú'
                                }
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setIsCreateModalOpen(false); setEditingSupplier(null); }}
                                    disabled={isSubmitting}
                                    className="h-[34px] px-4 border border-slate-300 rounded-lg hover:bg-white text-xs font-semibold text-slate-600 transition-all"
                                >
                                    {t('suppliers.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    form="supplierForm"
                                    disabled={isSubmitting}
                                    className="h-[34px] px-5 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 text-xs font-bold shadow-xs transition-all"
                                >
                                    {isSubmitting ? t('suppliers.saving') : (editingSupplier ? t('suppliers.updateBtn') : t('suppliers.addBtn'))}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal */}
            {viewingSupplier && (
                <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, padding: '1rem', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)' }}>
                    <div className="modal-container shadow-2xl w-full max-w-[650px]" style={{ maxHeight: '90vh', background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                            <div>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-200">
                                        {viewingSupplier.code}
                                    </span>
                                    {viewingSupplier.taxStatus && (
                                        <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                                            {viewingSupplier.taxStatus}
                                        </span>
                                    )}
                                </div>
                                <h2 className="text-[15px] font-bold text-slate-800">{viewingSupplier.name}</h2>
                                {viewingSupplier.shortName && (
                                    <p className="text-[11px] text-slate-500 m-0 mt-0.5">Tên viết tắt: {viewingSupplier.shortName} {viewingSupplier.internationalName ? `• ${viewingSupplier.internationalName}` : ''}</p>
                                )}
                            </div>
                            <button
                                onClick={() => setViewingSupplier(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">{t('suppliers.contactName')}</p>
                                    <p className="font-medium text-slate-800">{viewingSupplier.contactName || '--'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">{t('suppliers.businessType')} / {t('suppliers.website')}</p>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-slate-800">{viewingSupplier.businessType || '--'}</span>
                                        {viewingSupplier.website && (
                                            <a href={viewingSupplier.website.startsWith('http') ? viewingSupplier.website : `https://${viewingSupplier.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate">{viewingSupplier.website}</a>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">{t('suppliers.phone')}</p>
                                    <p className="font-medium text-slate-800">{viewingSupplier.phone || '--'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">{t('suppliers.email')}</p>
                                    <p className="font-medium text-slate-800">{viewingSupplier.email || '--'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">{t('suppliers.taxCodeLabel')}</p>
                                    <p className="font-mono font-medium text-slate-800">{viewingSupplier.taxCode || '--'}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">Tài Khoản Ngân Hàng</p>
                                    <div className="flex flex-col">
                                        <span className="font-mono font-medium text-slate-800">{viewingSupplier.bankAccount || '--'}</span>
                                        {viewingSupplier.bankName && <span className="text-[11px] text-slate-500">{viewingSupplier.bankName} {viewingSupplier.bankBranch ? `(${viewingSupplier.bankBranch})` : ''}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="border-t border-slate-100 pt-2.5 text-xs">
                                <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">{t('suppliers.address')}</p>
                                <p className="font-medium text-slate-800">{viewingSupplier.address || '--'}</p>
                            </div>
                            {viewingSupplier.billingAddress && (
                                <div className="border-t border-slate-100 pt-2.5 text-xs">
                                    <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">Địa Chỉ Xuất Hóa Đơn</p>
                                    <p className="font-medium text-slate-800">{viewingSupplier.billingAddress}</p>
                                </div>
                            )}
                            {viewingSupplier.notes && (
                                <div className="border-t border-slate-100 pt-2.5 text-xs">
                                    <p className="text-[11px] font-semibold uppercase text-slate-400 mb-0.5">{t('suppliers.internalNotes')}</p>
                                    <p className="text-slate-700 whitespace-pre-wrap">{viewingSupplier.notes}</p>
                                </div>
                            )}
                            <div className="flex justify-between items-center bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
                                <span className="font-semibold text-rose-800 text-xs">{t('suppliers.totalDebt')}:</span>
                                <span className="text-sm font-bold text-rose-600">{formatMoney(viewingSupplier.computedDebt || 0)}</span>
                            </div>
                        </div>
                        <div className="px-4 py-2.5 border-t border-slate-200 flex justify-end bg-slate-50">
                            <button onClick={() => setViewingSupplier(null)} className="h-[34px] px-4 border border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:bg-white transition-all">{t('suppliers.cancel')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Modal } from '@/app/components/ui/Modal';
import { Input } from '@/app/components/ui/Input';
import { createCustomer, updateCustomer, deleteCustomer, lookupCustomerTaxCode, checkCustomerDuplicate } from './actions';
import { 
    Plus, Edit, Trash2, Eye, ChevronUp, ChevronDown, ArrowUpDown, 
    Search, Users, TrendingUp, RefreshCcw, Activity, Sparkles, 
    Loader2, Building2, CreditCard, FileText, CheckCircle2, AlertCircle, 
    Globe, Mail, Phone, MapPin, DollarSign, X 
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatMoney } from '@/lib/utils/formatters';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';

export type CustomerWithStats = Customer & { revenue?: number, lastActivityAt?: Date | string };

function getInitials(name: string) {
    if (!name) return 'KH';
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

const emptyCustomerForm = {
    code: '',
    name: '',
    shortName: '',
    internationalName: '',
    email: '',
    phone: '',
    address: '',
    billingAddress: '',
    shippingAddress: '',
    taxCode: '',
    taxStatus: '',
    contactName: '',
    website: '',
    businessType: '',
    bankAccount: '',
    bankName: '',
    bankBranch: '',
    paymentTerms: '',
    creditLimit: 0,
    internalNotes: ''
};

export function CustomerClient({ initialData, users, isAdminOrManager, initialEmployeeId }: { initialData: CustomerWithStats[], users?: any[], isAdminOrManager?: boolean, initialEmployeeId?: string }) {
    const router = useRouter();
    const { data: session } = useSession();
    const { t } = useTranslation();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = true;
    const canEdit = isAdmin || permissions.includes('CUSTOMERS_EDIT');
    const canDelete = isAdmin || permissions.includes('CUSTOMERS_DELETE');

    const [customers, setCustomers] = useState<CustomerWithStats[]>(initialData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'contact' | 'financial' | 'notes'>('general');
    
    // Tax Lookup State
    const [isLookingUpTax, setIsLookingUpTax] = useState(false);
    const [taxLookupMessage, setTaxLookupMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState(emptyCustomerForm);
    const [duplicateWarnings, setDuplicateWarnings] = useState<{ field: string; message: string; duplicateEntity?: any }[]>([]);
    const [isCheckingDup, setIsCheckingDup] = useState(false);

    // Real-time duplicate validation with debounce
    React.useEffect(() => {
        if (!isModalOpen) {
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
                const res = await checkCustomerDuplicate({
                    code: formData.code,
                    taxCode: formData.taxCode,
                    email: formData.email,
                    phone: formData.phone
                }, editingId || undefined);
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
    }, [formData.taxCode, formData.email, formData.phone, formData.code, isModalOpen, editingId]);

    // Sort & Filter state
    const [sortField, setSortField] = useState<keyof CustomerWithStats>('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'ALL' | 'TOP_REVENUE_5' | 'RECENT_10' | 'RECENT_UPDATED'>('ALL');

    React.useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('action') === 'new' && canCreate) {
                openModal();
                window.history.replaceState({}, '', '/customers');
            }
        }
    }, [canCreate]);

    const handleSort = (field: keyof CustomerWithStats) => {
        if (activeFilter !== 'ALL') {
            setActiveFilter('ALL');
        }
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder(field === 'totalDebt' || field === 'revenue' ? 'desc' : 'asc');
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
                (c.code && c.code.toLowerCase().includes(lowerSearch)) ||
                (c.name && c.name.toLowerCase().includes(lowerSearch)) ||
                (c.shortName && c.shortName.toLowerCase().includes(lowerSearch)) ||
                (c.internationalName && c.internationalName.toLowerCase().includes(lowerSearch)) ||
                (c.email && c.email.toLowerCase().includes(lowerSearch)) ||
                (c.phone && c.phone.includes(searchTerm)) ||
                (c.taxCode && c.taxCode.includes(searchTerm))
            );
        }

        // 3. Manual Column Sort
        if (activeFilter === 'ALL') {
            result.sort((a, b) => {
                const aVal = a[sortField];
                const bVal = b[sortField];

                // Number comparison (totalDebt, creditLimit, revenue)
                if (typeof aVal === 'number' || typeof bVal === 'number') {
                    const numA = Number(aVal) || 0;
                    const numB = Number(bVal) || 0;
                    return sortOrder === 'asc' ? numA - numB : numB - numA;
                }

                // Date comparison
                if (aVal instanceof Date || bVal instanceof Date) {
                    const timeA = aVal ? new Date(aVal as any).getTime() : 0;
                    const timeB = bVal ? new Date(bVal as any).getTime() : 0;
                    return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
                }

                // String comparison
                const strA = (aVal != null ? String(aVal) : '').trim();
                const strB = (bVal != null ? String(bVal) : '').trim();
                return sortOrder === 'asc' ? strA.localeCompare(strB, 'vi') : strB.localeCompare(strA, 'vi');
            });
        }

        return result;
    }, [customers, searchTerm, activeFilter, sortField, sortOrder]);

    const { paginatedItems, paginationProps } = usePagination(filteredAndSortedCustomers, 25);

    const openModal = (customer?: Customer) => {
        setTaxLookupMessage(null);
        setActiveTab('general');
        if (customer) {
            setEditingId(customer.id);
            setFormData({
                code: customer.code || '',
                name: customer.name || '',
                shortName: customer.shortName || '',
                internationalName: customer.internationalName || '',
                email: customer.email || '',
                phone: customer.phone || '',
                address: customer.address || '',
                billingAddress: customer.billingAddress || '',
                shippingAddress: customer.shippingAddress || '',
                taxCode: customer.taxCode || '',
                taxStatus: customer.taxStatus || '',
                contactName: customer.contactName || '',
                website: customer.website || '',
                businessType: customer.businessType || '',
                bankAccount: customer.bankAccount || '',
                bankName: customer.bankName || '',
                bankBranch: customer.bankBranch || '',
                paymentTerms: customer.paymentTerms || '',
                creditLimit: customer.creditLimit || 0,
                internalNotes: customer.internalNotes || ''
            });
        } else {
            setEditingId(null);
            setFormData(emptyCustomerForm);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingId(null);
        setTaxLookupMessage(null);
    };

    const handleTaxLookup = async () => {
        if (!formData.taxCode?.trim()) {
            setTaxLookupMessage({ type: 'error', text: 'Vui lòng nhập Mã số thuế trước khi tra cứu.' });
            return;
        }

        setIsLookingUpTax(true);
        setTaxLookupMessage(null);

        try {
            const res = await lookupCustomerTaxCode(formData.taxCode.trim());
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
            if (editingId) {
                const res = await updateCustomer(editingId, formData);
                setCustomers(customers.map(c => c.id === editingId ? { ...c, ...res } : c));
            } else {
                const newCustomer = await createCustomer(formData);
                setCustomers([newCustomer as CustomerWithStats, ...customers]);
                router.refresh();
            }
            closeModal();
        } catch (error: any) {
            alert(error.message || t('customers.errorSystem'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('customers.confirmDelete'))) {
            try {
                await deleteCustomer(id);
                setCustomers(customers.filter(c => c.id !== id));
            } catch (error) {
                console.error('Error deleting customer:', error);
                alert(t('customers.errorSystem'));
            }
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
                            CRM &amp; Đối Tác
                        </span>
                        <span className="text-[11px] font-semibold text-slate-400">|</span>
                        <span className="text-[11px] font-medium text-slate-500">Hệ sinh thái khách hàng B2B</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Quản lý Khách hàng</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                            {customers.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {canCreate && (
                        <Button
                            onClick={() => openModal()}
                            className="btn btn-primary gap-2 h-[34px] px-3.5 text-xs font-bold rounded-lg shadow-sm"
                        >
                            <Plus size={15} className="stroke-[2.5]" />
                            <span>{t('customers.addCustomer')}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Futuristic KPI / Filter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div
                    className={`relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border shadow-xs hover:-translate-y-0.5 hover:shadow-sm ${
                        activeFilter === 'ALL'
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                            : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveFilter('ALL')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shadow-emerald-500/20 shrink-0">
                                <Users size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 tracking-tight">{t('customers.titleAll')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{customers.length} {t('customers.allDesc')}</p>
                            </div>
                        </div>
                        <span className={`text-base font-extrabold font-mono ${activeFilter === 'ALL' ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {customers.length}
                        </span>
                    </div>
                </div>

                <div
                    className={`relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border shadow-xs hover:-translate-y-0.5 hover:shadow-sm ${
                        activeFilter === 'TOP_REVENUE_5'
                            ? 'border-emerald-600 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                            : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveFilter('TOP_REVENUE_5')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs shadow-indigo-500/20 shrink-0">
                                <TrendingUp size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 tracking-tight">{t('customers.titleTop')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{t('customers.topDesc')}</p>
                            </div>
                        </div>
                        <span className={`text-base font-extrabold font-mono ${activeFilter === 'TOP_REVENUE_5' ? 'text-indigo-700' : 'text-slate-800'}`}>
                            5
                        </span>
                    </div>
                </div>

                <div
                    className={`relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border shadow-xs hover:-translate-y-0.5 hover:shadow-sm ${
                        activeFilter === 'RECENT_10'
                            ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
                            : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveFilter('RECENT_10')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shadow-amber-500/20 shrink-0">
                                <Activity size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 tracking-tight">{t('customers.titleRecent')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{t('customers.recentDesc')}</p>
                            </div>
                        </div>
                        <span className={`text-base font-extrabold font-mono ${activeFilter === 'RECENT_10' ? 'text-amber-700' : 'text-slate-800'}`}>
                            10
                        </span>
                    </div>
                </div>

                <div
                    className={`relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border shadow-xs hover:-translate-y-0.5 hover:shadow-sm ${
                        activeFilter === 'RECENT_UPDATED'
                            ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20'
                            : 'border-slate-200/90 hover:border-slate-300'
                    }`}
                    onClick={() => setActiveFilter('RECENT_UPDATED')}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs shadow-sky-500/20 shrink-0">
                                <RefreshCcw size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 tracking-tight">{t('customers.titleUpdated')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{t('customers.updatedDesc')}</p>
                            </div>
                        </div>
                        <span className={`text-base font-extrabold font-mono ${activeFilter === 'RECENT_UPDATED' ? 'text-sky-700' : 'text-slate-800'}`}>
                            10
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Data Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Search & Actions Toolbar */}
                <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="relative w-full sm:w-[360px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo Mã, Tên, MST, SĐT, Email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full h-[34px] pl-9 pr-8 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all shadow-2xs"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                            Hiển thị <span className="text-slate-900 font-bold">{filteredAndSortedCustomers.length}</span> / {customers.length} khách hàng
                        </span>
                    </div>
                </div>

                {/* High Density Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/90 bg-slate-100/70">
                                <th onClick={() => handleSort('code')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[100px] hover:bg-slate-200/50 transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        MÃ KH
                                        {sortField === 'code' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('name')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/50 transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        {t('customers.name')}
                                        {sortField === 'name' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('taxCode')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[125px] hover:bg-slate-200/50 transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        {t('customers.taxCode')}
                                        {sortField === 'taxCode' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('phone')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[140px] hover:bg-slate-200/50 transition-colors">
                                    <div className="flex items-center gap-1.5">
                                        {t('customers.phone')}
                                        {sortField === 'phone' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>
                                <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[220px]">
                                    Email & Địa Chỉ
                                </th>
                                <th onClick={() => handleSort('totalDebt')} className="cursor-pointer select-none py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[120px] hover:bg-slate-200/50 transition-colors">
                                    <div className="flex items-center justify-end gap-1.5">
                                        Công Nợ
                                        {sortField === 'totalDebt' ? (sortOrder === 'asc' ? <ChevronUp size={12} className="text-primary" /> : <ChevronDown size={12} className="text-primary" />) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>
                                <th className="py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[90px]">
                                    {t('customers.action')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Search size={18} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600">{t('customers.empty')}</p>
                                            <p className="text-[11px] text-slate-400">Không tìm thấy khách hàng nào phù hợp với bộ lọc.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedItems.map(customer => {
                                const initials = getInitials(customer.name);
                                const gradient = getAvatarGradient(customer.id);

                                return (
                                    <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="py-2.5 px-3.5 align-middle">
                                            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 shadow-2xs inline-block">
                                                {customer.code || '--'}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 align-middle">
                                            <div className="flex items-center gap-2.5">
                                                <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} text-white font-bold text-[11px] flex items-center justify-center shadow-2xs shrink-0`}>
                                                    {initials}
                                                </div>
                                                <div className="min-w-0">
                                                    <Link
                                                        href={`/customers/${customer.id}`}
                                                        className="text-slate-900 font-semibold text-xs hover:text-primary transition-colors block truncate max-w-[280px] sm:max-w-[360px] md:max-w-none"
                                                    >
                                                        {customer.name}
                                                    </Link>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {customer.shortName && (
                                                            <span className="text-[11px] text-slate-500 font-normal">
                                                                ({customer.shortName})
                                                            </span>
                                                        )}
                                                        {customer.contactName && (
                                                            <span className="text-[11px] text-slate-500 font-normal">
                                                                • LH: {customer.contactName}
                                                            </span>
                                                        )}
                                                        {activeFilter === 'TOP_REVENUE_5' && customer.revenue ? (
                                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                                {t('customers.revenue')} {formatMoney(customer.revenue)}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5 px-3.5 align-middle">
                                            {customer.taxCode ? (
                                                <span className="font-mono text-[11px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1 shadow-2xs">
                                                    {customer.taxCode}
                                                </span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3.5 align-middle text-slate-600">
                                            {customer.phone ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-medium font-mono text-slate-800">{customer.phone}</span>
                                                    <ClickToCallButton phoneNumber={customer.phone} />
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3.5 align-middle text-slate-600 text-xs">
                                            {customer.email && (
                                                <div className="truncate block max-w-[200px] text-[11px] text-slate-700 font-medium" title={customer.email}>
                                                    {customer.email}
                                                </div>
                                            )}
                                            {customer.address && (
                                                <div className="truncate block max-w-[200px] text-[11px] text-slate-400 mt-0.5" title={customer.address}>
                                                    {customer.address}
                                                </div>
                                            )}
                                            {!customer.email && !customer.address && (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="py-2.5 px-3.5 align-middle text-right">
                                            <span className={`font-mono text-xs font-bold ${(customer.totalDebt || 0) > 0 ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-slate-700'}`}>
                                                {formatMoney(customer.totalDebt || 0)}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3.5 align-middle text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/customers/${customer.id}`}
                                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-primary hover:bg-emerald-50 transition-colors"
                                                    title={t('customers.viewDetails')}
                                                >
                                                    <Eye size={14} />
                                                </Link>
                                                {canEdit && (
                                                    <button
                                                        onClick={() => openModal(customer)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors cursor-pointer"
                                                        title={t('customers.edit')}
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button
                                                        onClick={() => handleDelete(customer.id)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                                        title={t('customers.delete')}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-3 border-t border-slate-200/80 bg-slate-50/50">
                    <Pagination {...paginationProps} />
                </div>
            </div>

            {/* MODAL THÊM / SỬA KHÁCH HÀNG */}
                {isModalOpen && (
                    <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, padding: '1rem', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)' }}>
                        <div className="modal-container shadow-2xl w-full max-w-[850px]" style={{ maxHeight: '92vh', background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                                <div>
                                    <h2 className="text-[15px] font-bold text-slate-800">
                                        {editingId ? 'Cập Nhật Hồ Sơ Khách Hàng' : 'Thêm Mới Khách Hàng'}
                                    </h2>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Nhập mã số thuế để tra cứu tự động hoặc điền thông tin chi tiết
                                    </p>
                                </div>
                                <button
                                    onClick={closeModal}
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
                                            placeholder="Nhập Mã số thuế để tự động tra cứu thông tin..."
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

                            {/* Form Content */}
                            <form id="customerForm" onSubmit={handleSubmit} className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(92vh - 220px)' }}>
                                {activeTab === 'general' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Mã Khách Hàng
                                                    {duplicateWarnings.some(w => w.field === 'code') && <span className="text-rose-600 ml-1 font-bold">(Trùng mã)</span>}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.code || ''}
                                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                    placeholder="Tự động sinh (KH-xxxx)"
                                                    className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all font-mono text-slate-900 bg-white ${
                                                        duplicateWarnings.some(w => w.field === 'code')
                                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                                                            : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
                                                    }`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Mã Số Thuế
                                                    {duplicateWarnings.some(w => w.field === 'taxCode') && <span className="text-rose-600 ml-1 font-bold">(Trùng MST)</span>}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.taxCode || ''}
                                                    onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                                    placeholder="Ví dụ: 0101248141"
                                                    className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all font-mono text-slate-900 bg-white ${
                                                        duplicateWarnings.some(w => w.field === 'taxCode')
                                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                                                            : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
                                                    }`}
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
                                                Tên Khách Hàng / Công Ty <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name || ''}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Tên đầy đủ theo đăng ký kinh doanh..."
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-semibold text-slate-900 bg-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Viết Tắt / Giao Dịch</label>
                                                <input
                                                    type="text"
                                                    value={formData.shortName || ''}
                                                    onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                                                    placeholder="Ví dụ: FPT CORP, VINAMILK"
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Quốc Tế</label>
                                                <input
                                                    type="text"
                                                    value={formData.internationalName || ''}
                                                    onChange={e => setFormData({ ...formData, internationalName: e.target.value })}
                                                    placeholder="International / English name..."
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Ngành Nghề / Lĩnh Vực Hoạt Động</label>
                                            <input
                                                type="text"
                                                value={formData.businessType || ''}
                                                onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                                placeholder="Ví dụ: Công nghệ thông tin, Xây dựng, Bán lẻ..."
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'contact' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Người Đại Diện / Người Liên Hệ Chính</label>
                                                <input
                                                    type="text"
                                                    value={formData.contactName || ''}
                                                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                    placeholder="Họ và tên người đại diện"
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Số Điện Thoại
                                                    {duplicateWarnings.some(w => w.field === 'phone') && <span className="text-rose-600 ml-1 font-bold">(Trùng SĐT)</span>}
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.phone || ''}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="0987xxxxxx"
                                                    className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${
                                                        duplicateWarnings.some(w => w.field === 'phone')
                                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                                                            : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
                                                    }`}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">
                                                    Email Doanh Nghiệp / Liên Hệ
                                                    {duplicateWarnings.some(w => w.field === 'email') && <span className="text-rose-600 ml-1 font-bold">(Trùng Email)</span>}
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.email || ''}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="contact@company.com"
                                                    className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none transition-all text-slate-900 bg-white ${
                                                        duplicateWarnings.some(w => w.field === 'email')
                                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200 bg-rose-50/30'
                                                            : 'border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary/20'
                                                    }`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Website</label>
                                                <input
                                                    type="text"
                                                    value={formData.website || ''}
                                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                    placeholder="https://company.com"
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ Trụ Sở / Đăng Ký Kinh Doanh</label>
                                            <input
                                                type="text"
                                                value={formData.address || ''}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Địa chỉ trụ sở chính..."
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ Xuất Hóa Đơn</label>
                                                <input
                                                    type="text"
                                                    value={formData.billingAddress || ''}
                                                    onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                                                    placeholder="Địa chỉ ghi trên hóa đơn GTGT..."
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ Giao Hàng</label>
                                                <input
                                                    type="text"
                                                    value={formData.shippingAddress || ''}
                                                    onChange={e => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                    placeholder="Kho hàng / Địa chỉ nhận hàng..."
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'financial' && (
                                    <div className="space-y-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Ngân Hàng Giao Dịch</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankName || ''}
                                                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                    placeholder="Ví dụ: Vietcombank, Techcombank, MB Bank..."
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Số Tài Khoản Ngân Hàng</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankAccount || ''}
                                                    onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                                                    placeholder="Số tài khoản ngân hàng..."
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono text-slate-900 bg-white"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Chi Nhánh Ngân Hàng</label>
                                            <input
                                                type="text"
                                                value={formData.bankBranch || ''}
                                                onChange={e => setFormData({ ...formData, bankBranch: e.target.value })}
                                                placeholder="Ví dụ: Chi nhánh TP.HCM, Chi nhánh Hà Nội..."
                                                className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Điều Khoản Thanh Toán</label>
                                                <input
                                                    type="text"
                                                    value={formData.paymentTerms || ''}
                                                    onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                                    placeholder="Ví dụ: Thanh toán ngay, Gối đầu 30 ngày..."
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all text-slate-900 bg-white"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-600 mb-1">Hạn Mức Công Nợ (VNĐ)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="1000"
                                                    value={formData.creditLimit || ''}
                                                    onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                                                    placeholder="0"
                                                    className="w-full h-[34px] border border-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-mono text-slate-900 bg-white"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notes' && (
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi Chú Nội Bộ</label>
                                            <textarea
                                                rows={4}
                                                value={formData.internalNotes || ''}
                                                onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                                                placeholder="Nhập các thông tin lưu ý đặc biệt, chính sách riêng dành cho khách hàng này..."
                                                className="w-full border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all resize-none text-slate-900 bg-white placeholder:text-slate-400"
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
                                        onClick={closeModal}
                                        disabled={isSubmitting}
                                        className="h-[34px] px-4 border border-slate-300 rounded-lg hover:bg-white text-xs font-semibold text-slate-600 transition-all"
                                    >
                                        {t('customers.cancel')}
                                    </button>
                                    <button
                                        type="submit"
                                        form="customerForm"
                                        disabled={isSubmitting}
                                        className="h-[34px] px-5 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 text-xs font-bold shadow-xs transition-all"
                                    >
                                        {isSubmitting ? 'Đang lưu...' : t('customers.save')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
        </div>
    );
}

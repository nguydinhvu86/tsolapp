'use client'

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Customer } from '@prisma/client';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { createCustomer, updateCustomer, deleteCustomer, lookupCustomerTaxCode, checkCustomerDuplicate } from './actions';
import { 
    Plus, Edit, Trash2, Eye, ChevronUp, ChevronDown, ArrowUpDown, 
    Search, Users, TrendingUp, RefreshCcw, Activity, Sparkles, 
    Loader2, Building2, CreditCard, FileText, CheckCircle2, AlertCircle, 
    Mail, Phone, MapPin, X, Copy, Check, 
    LayoutGrid, List, ShieldCheck, ArrowRight, UserCheck
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatMoney } from '@/lib/utils/formatters';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';

export type CustomerWithStats = Customer & { revenue?: number; lastActivityAt?: Date | string };

function getInitials(name: string) {
    if (!name) return 'KH';
    const clean = name.replace(/^(công ty|cty|tnhh|cổ phần|cp|mtv|tư vấn|đầu tư|thương mại|dịch vụ|doanh nghiệp|hộ kinh doanh)\s+/gi, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return (words[0] || name).slice(0, 2).toUpperCase();
}

const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
    'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)'
];

function getAvatarStyle(id: string) {
    if (!id) return { background: AVATAR_GRADIENTS[0] };
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i);
    return { background: AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length] };
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

export function CustomerClient({ 
    initialData, 
    users, 
    isAdminOrManager, 
    initialEmployeeId 
}: { 
    initialData: CustomerWithStats[]; 
    users?: any[]; 
    isAdminOrManager?: boolean; 
    initialEmployeeId?: string;
}) {
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
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    // Tax Lookup State
    const [isLookingUpTax, setIsLookingUpTax] = useState(false);
    const [taxLookupMessage, setTaxLookupMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState(emptyCustomerForm);
    const [duplicateWarnings, setDuplicateWarnings] = useState<{ field: string; message: string; duplicateEntity?: any }[]>([]);
    const [isCheckingDup, setIsCheckingDup] = useState(false);

    // Real-time duplicate validation with debounce
    useEffect(() => {
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

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('action') === 'new' && canCreate) {
                openModal();
                window.history.replaceState({}, '', '/customers');
            }
        }
    }, [canCreate]);

    const handleCopy = (text: string, key: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedKey(key);
        setTimeout(() => setCopiedKey(null), 1800);
    };

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

    const filteredAndSortedCustomers = useMemo(() => {
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
            const lowerSearch = searchTerm.toLowerCase().trim();
            result = result.filter(c =>
                (c.code && c.code.toLowerCase().includes(lowerSearch)) ||
                (c.name && c.name.toLowerCase().includes(lowerSearch)) ||
                (c.shortName && c.shortName.toLowerCase().includes(lowerSearch)) ||
                (c.internationalName && c.internationalName.toLowerCase().includes(lowerSearch)) ||
                (c.email && c.email.toLowerCase().includes(lowerSearch)) ||
                (c.phone && c.phone.includes(lowerSearch)) ||
                (c.taxCode && c.taxCode.includes(lowerSearch)) ||
                (c.contactName && c.contactName.toLowerCase().includes(lowerSearch))
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
                const { name, shortName, internationalName, address, status, id } = res.data;
                setFormData(prev => ({
                    ...prev,
                    taxCode: id || prev.taxCode,
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
        <div className="flex flex-col gap-4">
            {/* TOP HEADER: Rực rỡ, sắc nét, phong cách công nghệ */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            CRM &amp; ĐỐI TÁC
                        </span>
                        <span className="text-slate-300 text-xs">|</span>
                        <span className="text-xs font-semibold text-slate-500">Hệ sinh thái khách hàng B2B</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                            Quản lý Khách hàng
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs font-mono">
                            {customers.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    {canCreate && (
                        <button
                            onClick={() => openModal()}
                            style={{ backgroundColor: '#05A613' }}
                            className="inline-flex items-center gap-2 h-[36px] px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                        >
                            <Plus size={16} className="stroke-[3]" />
                            <span>{t('customers.addCustomer')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 4 THẺ KPI ĐA SẮC MÀU CÔNG NGHỆ RỰC RỠ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* THẺ 1: TẤT CẢ (XANH LÁ) */}
                <div
                    onClick={() => setActiveFilter('ALL')}
                    style={activeFilter === 'ALL' ? { borderColor: '#05A613', backgroundColor: '#f0fdf4', boxShadow: '0 0 0 2px rgba(5, 166, 19, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div 
                                style={{ backgroundColor: '#05A613' }} 
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <Users size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">{t('customers.titleAll')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{customers.length} {t('customers.allDesc')}</p>
                            </div>
                        </div>
                        <span 
                            style={activeFilter === 'ALL' ? { color: '#05A613' } : {}} 
                            className="text-lg font-extrabold font-mono text-slate-800"
                        >
                            {customers.length}
                        </span>
                    </div>
                </div>

                {/* THẺ 2: BÁN CHẠY NHẤT (XANH TÍM INDIGO) */}
                <div
                    onClick={() => setActiveFilter('TOP_REVENUE_5')}
                    style={activeFilter === 'TOP_REVENUE_5' ? { borderColor: '#4f46e5', backgroundColor: '#eef2ff', boxShadow: '0 0 0 2px rgba(79, 70, 229, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div 
                                style={{ backgroundColor: '#4f46e5' }} 
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <TrendingUp size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">{t('customers.titleTop')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{t('customers.topDesc')}</p>
                            </div>
                        </div>
                        <span 
                            style={activeFilter === 'TOP_REVENUE_5' ? { color: '#4f46e5' } : {}} 
                            className="text-lg font-extrabold font-mono text-slate-800"
                        >
                            5
                        </span>
                    </div>
                </div>

                {/* THẺ 3: VỪA LÀM VIỆC (CAM VÀNG AMBER) */}
                <div
                    onClick={() => setActiveFilter('RECENT_10')}
                    style={activeFilter === 'RECENT_10' ? { borderColor: '#f59e0b', backgroundColor: '#fffbeb', boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div 
                                style={{ backgroundColor: '#f59e0b' }} 
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <Activity size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">{t('customers.titleRecent')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{t('customers.recentDesc')}</p>
                            </div>
                        </div>
                        <span 
                            style={activeFilter === 'RECENT_10' ? { color: '#d97706' } : {}} 
                            className="text-lg font-extrabold font-mono text-slate-800"
                        >
                            10
                        </span>
                    </div>
                </div>

                {/* THẺ 4: MỚI CẬP NHẬT (XANH CYAN / SKY) */}
                <div
                    onClick={() => setActiveFilter('RECENT_UPDATED')}
                    style={activeFilter === 'RECENT_UPDATED' ? { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff', boxShadow: '0 0 0 2px rgba(14, 165, 233, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div 
                                style={{ backgroundColor: '#0ea5e9' }} 
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <RefreshCcw size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">{t('customers.titleUpdated')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">{t('customers.updatedDesc')}</p>
                            </div>
                        </div>
                        <span 
                            style={activeFilter === 'RECENT_UPDATED' ? { color: '#0284c7' } : {}} 
                            className="text-lg font-extrabold font-mono text-slate-800"
                        >
                            10
                        </span>
                    </div>
                </div>
            </div>

            {/* CONTAINER DỮ LIỆU CHÍNH */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* THANH TÌM KIẾM & BỘ LỌC CÔNG CỤ */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    <div className="relative w-full sm:w-[380px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo Mã, Tên, MST, SĐT, Email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full h-[36px] pl-9 pr-8 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 transition-all shadow-2xs"
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
                        <span className="text-[11px] font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                            Hiển thị <span className="text-slate-900 font-bold font-mono">{filteredAndSortedCustomers.length}</span> / {customers.length} khách hàng
                        </span>

                        {/* Switch View Mode */}
                        <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                    viewMode === 'table' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'
                                }`}
                                title="Chế độ bảng"
                            >
                                <List size={15} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                    viewMode === 'grid' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'
                                }`}
                                title="Chế độ lưới thẻ"
                            >
                                <LayoutGrid size={15} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* CHẾ ĐỘ 1: BẢNG DỮ LIỆU ĐẦY ĐỦ MÀU SẮC */}
                {viewMode === 'table' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-100/80">
                                    <th onClick={() => handleSort('code')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[105px] hover:bg-slate-200/60 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            MÃ KH
                                            {sortField === 'code' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th onClick={() => handleSort('name')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/60 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            {t('customers.name')}
                                            {sortField === 'name' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th onClick={() => handleSort('taxCode')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[130px] hover:bg-slate-200/60 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            {t('customers.taxCode')}
                                            {sortField === 'taxCode' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th onClick={() => handleSort('phone')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[145px] hover:bg-slate-200/60 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            {t('customers.phone')}
                                            {sortField === 'phone' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[220px]">
                                        EMAIL &amp; ĐỊA CHỈ
                                    </th>

                                    <th onClick={() => handleSort('totalDebt')} className="cursor-pointer select-none py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[130px] hover:bg-slate-200/60 transition-colors">
                                        <div className="flex items-center justify-end gap-1.5">
                                            CÔNG NỢ
                                            {sortField === 'totalDebt' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th className="py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[95px]">
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
                                ) : (
                                    paginatedItems.map(customer => {
                                        const initials = getInitials(customer.name);
                                        const avatarStyle = getAvatarStyle(customer.id);
                                        const codeKey = `code-${customer.id}`;
                                        const taxKey = `tax-${customer.id}`;
                                        const isDebt = (customer.totalDebt || 0) > 0;

                                        return (
                                            <tr key={customer.id} className="hover:bg-slate-50/90 transition-colors group">
                                                {/* MÃ KH */}
                                                <td className="py-2.5 px-3.5 align-middle">
                                                    <span 
                                                        onClick={() => handleCopy(customer.code || '', codeKey)}
                                                        className="font-mono text-[11px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 hover:text-emerald-700 rounded border border-slate-200 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                                                        title="Click để sao chép"
                                                    >
                                                        {customer.code || '--'}
                                                        {copiedKey === codeKey && <Check size={10} className="text-emerald-600" />}
                                                    </span>
                                                </td>

                                                {/* TÊN KHÁCH HÀNG */}
                                                <td className="py-2.5 px-3.5 align-middle">
                                                    <div className="flex items-center gap-2.5">
                                                        <div 
                                                            style={avatarStyle} 
                                                            className="w-8 h-8 rounded-lg text-white font-bold text-[11px] flex items-center justify-center shadow-2xs shrink-0"
                                                        >
                                                            {initials}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <Link
                                                                href={`/customers/${customer.id}`}
                                                                className="text-slate-900 font-bold text-xs hover:text-emerald-700 transition-colors block truncate max-w-[280px] sm:max-w-[360px] md:max-w-none"
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
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                        {t('customers.revenue')} {formatMoney(customer.revenue)}
                                                                    </span>
                                                                ) : null}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* MÃ SỐ THUẾ */}
                                                <td className="py-2.5 px-3.5 align-middle">
                                                    {customer.taxCode ? (
                                                        <span 
                                                            onClick={() => handleCopy(customer.taxCode || '', taxKey)}
                                                            className="font-mono text-[11px] font-medium text-slate-800 bg-slate-50 hover:bg-emerald-50 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1 shadow-2xs cursor-pointer"
                                                            title="Click để sao chép"
                                                        >
                                                            {customer.taxCode}
                                                            {copiedKey === taxKey && <Check size={10} className="text-emerald-600" />}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">-</span>
                                                    )}
                                                </td>

                                                {/* SỐ ĐIỆN THOẠI & CLICK TO CALL */}
                                                <td className="py-2.5 px-3.5 align-middle text-slate-600">
                                                    {customer.phone ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-semibold font-mono text-slate-800">{customer.phone}</span>
                                                            <ClickToCallButton phoneNumber={customer.phone} />
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">-</span>
                                                    )}
                                                </td>

                                                {/* EMAIL & ĐỊA CHỈ */}
                                                <td className="py-2.5 px-3.5 align-middle text-slate-600 text-xs">
                                                    {customer.email && (
                                                        <div className="truncate block max-w-[210px] text-[11px] text-slate-800 font-medium" title={customer.email}>
                                                            {customer.email}
                                                        </div>
                                                    )}
                                                    {customer.address && (
                                                        <div className="truncate block max-w-[210px] text-[11px] text-slate-500 mt-0.5" title={customer.address}>
                                                            {customer.address}
                                                        </div>
                                                    )}
                                                    {!customer.email && !customer.address && (
                                                        <span className="text-slate-300 text-xs">-</span>
                                                    )}
                                                </td>

                                                {/* CÔNG NỢ */}
                                                <td className="py-2.5 px-3.5 align-middle text-right">
                                                    {isDebt ? (
                                                        <span 
                                                            style={{ backgroundColor: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }}
                                                            className="font-mono text-xs font-bold px-2 py-0.5 rounded border inline-block"
                                                        >
                                                            {formatMoney(customer.totalDebt || 0)}
                                                        </span>
                                                    ) : (
                                                        <span className="font-mono text-xs text-slate-700">
                                                            0 ₫
                                                        </span>
                                                    )}
                                                </td>

                                                {/* CỤM THAO TÁC (XANH - VÀNG - ĐỎ) */}
                                                <td className="py-2.5 px-3.5 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* XEM: XANH LÁ */}
                                                        <Link
                                                            href={`/customers/${customer.id}`}
                                                            style={{ color: '#05A613' }}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-50 transition-colors"
                                                            title={t('customers.viewDetails')}
                                                        >
                                                            <Eye size={15} />
                                                        </Link>

                                                        {/* SỬA: VÀNG CAM */}
                                                        {canEdit && (
                                                            <button
                                                                onClick={() => openModal(customer)}
                                                                style={{ color: '#d97706' }}
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-amber-50 transition-colors cursor-pointer"
                                                                title={t('customers.edit')}
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                        )}

                                                        {/* XÓA: ĐỎ */}
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => handleDelete(customer.id)}
                                                                style={{ color: '#dc2626' }}
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-rose-50 transition-colors cursor-pointer"
                                                                title={t('customers.delete')}
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* CHẾ ĐỘ 2: LƯỚI THẺ KHÁCH HÀNG */}
                {viewMode === 'grid' && (
                    <div className="p-4 bg-slate-50/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {paginatedItems.map(customer => {
                                const initials = getInitials(customer.name);
                                const avatarStyle = getAvatarStyle(customer.id);
                                const isDebt = (customer.totalDebt || 0) > 0;

                                return (
                                    <div key={customer.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3">
                                        <div className="flex items-start gap-3">
                                            <div style={avatarStyle} className="w-10 h-10 rounded-xl text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                                                {initials}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <span className="font-mono text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                                                    {customer.code || '--'}
                                                </span>
                                                <Link href={`/customers/${customer.id}`} className="font-bold text-xs text-slate-900 hover:text-emerald-700 block truncate mt-1">
                                                    {customer.name}
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs font-mono space-y-1">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-sans">Mã số thuế:</span>
                                                <span className="font-bold text-slate-800">{customer.taxCode || '--'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 font-sans">Công nợ:</span>
                                                <span className={`font-bold ${isDebt ? 'text-rose-600' : 'text-slate-800'}`}>
                                                    {formatMoney(customer.totalDebt || 0)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                            <Link href={`/customers/${customer.id}`} style={{ color: '#05A613' }} className="text-xs font-bold flex items-center gap-1 hover:underline">
                                                <span>Chi tiết</span>
                                                <ArrowRight size={12} />
                                            </Link>
                                            <div className="flex items-center gap-1">
                                                {customer.phone && <ClickToCallButton phoneNumber={customer.phone} />}
                                                {canEdit && (
                                                    <button onClick={() => openModal(customer)} style={{ color: '#d97706' }} className="p-1.5 hover:bg-amber-50 rounded">
                                                        <Edit size={14} />
                                                    </button>
                                                )}
                                                {canDelete && (
                                                    <button onClick={() => handleDelete(customer.id)} style={{ color: '#dc2626' }} className="p-1.5 hover:bg-rose-50 rounded">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* PHÂN TRANG */}
                <div className="p-3 border-t border-slate-200/90 bg-slate-50/70">
                    <Pagination {...paginationProps} />
                </div>
            </div>

            {/* MODAL THÊM / SỬA KHÁCH HÀNG */}
            {isModalOpen && (
                <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, padding: '1rem', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)' }}>
                    <div className="modal-container shadow-2xl w-full max-w-[850px]" style={{ maxHeight: '92vh', background: '#ffffff', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                            <div>
                                <h2 className="text-[15px] font-bold text-slate-900">
                                    {editingId ? 'Cập Nhật Hồ Sơ Khách Hàng' : 'Thêm Mới Khách Hàng'}
                                </h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Nhập mã số thuế để tra cứu tự động hoặc điền thông tin chi tiết
                                </p>
                            </div>
                            <button
                                onClick={closeModal}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Thanh tra cứu MST tự động */}
                        <div style={{ backgroundColor: '#ecfdf5', borderBottom: '1px solid #a7f3d0' }} className="px-4 py-2.5">
                            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                                <div className="flex-1 flex items-center bg-white rounded-lg border border-emerald-300 px-2.5 py-1 shadow-2xs focus-within:ring-1 focus-within:ring-emerald-500 h-[34px]">
                                    <Sparkles style={{ color: '#05A613' }} className="mr-2 shrink-0" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Nhập Mã số thuế để tự động tra cứu thông tin..."
                                        value={formData.taxCode || ''}
                                        onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTaxLookup(); } }}
                                        className="w-full bg-transparent border-none outline-none text-xs font-medium text-slate-800 placeholder-slate-400 font-mono"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleTaxLookup}
                                    disabled={isLookingUpTax || !formData.taxCode?.trim()}
                                    style={{ backgroundColor: '#05A613' }}
                                    className="h-[34px] hover:opacity-90 text-white px-3.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs shrink-0 transition-all disabled:opacity-50 cursor-pointer"
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
                                    taxLookupMessage.type === 'success' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}>
                                    {taxLookupMessage.type === 'success' ? <CheckCircle2 size={14} className="shrink-0 text-emerald-700" /> : <AlertCircle size={14} className="shrink-0 text-rose-700" />}
                                    <span>{taxLookupMessage.text}</span>
                                </div>
                            )}

                            {duplicateWarnings.length > 0 && (
                                <div className="mt-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex flex-col gap-1.5 shadow-2xs">
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
                                style={activeTab === 'general' ? { borderColor: '#05A613', color: '#05A613', backgroundColor: '#ffffff' } : {}}
                                className="py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer text-slate-500 hover:text-slate-800"
                            >
                                <Building2 size={14} /> Thông Tin Chung &amp; Thuế
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('contact')}
                                style={activeTab === 'contact' ? { borderColor: '#05A613', color: '#05A613', backgroundColor: '#ffffff' } : {}}
                                className="py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer text-slate-500 hover:text-slate-800"
                            >
                                <Phone size={14} /> Liên Hệ &amp; Địa Chỉ
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('financial')}
                                style={activeTab === 'financial' ? { borderColor: '#05A613', color: '#05A613', backgroundColor: '#ffffff' } : {}}
                                className="py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer text-slate-500 hover:text-slate-800"
                            >
                                <CreditCard size={14} /> Tài Chính &amp; Ngân Hàng
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('notes')}
                                style={activeTab === 'notes' ? { borderColor: '#05A613', color: '#05A613', backgroundColor: '#ffffff' } : {}}
                                className="py-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer text-slate-500 hover:text-slate-800"
                            >
                                <FileText size={14} /> Ghi Chú
                            </button>
                        </div>

                        {/* Form Body */}
                        <form id="customerForm" onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-3" style={{ maxHeight: 'calc(92vh - 220px)' }}>
                            {activeTab === 'general' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
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
                                                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                                                        : 'border-slate-300 focus:border-emerald-600'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
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
                                                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                                                        : 'border-slate-300 focus:border-emerald-600'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Trạng Thái MST</label>
                                            <input
                                                type="text"
                                                value={formData.taxStatus || ''}
                                                onChange={e => setFormData({ ...formData, taxStatus: e.target.value })}
                                                placeholder="NNT đang hoạt động"
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-slate-50"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">
                                            Tên Khách Hàng / Công Ty <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name || ''}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Tên đầy đủ theo đăng ký kinh doanh..."
                                            className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 font-bold text-slate-900 bg-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Tên Viết Tắt / Giao Dịch</label>
                                            <input
                                                type="text"
                                                value={formData.shortName || ''}
                                                onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                                                placeholder="Ví dụ: FPT CORP, VINAMILK"
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Tên Quốc Tế</label>
                                            <input
                                                type="text"
                                                value={formData.internationalName || ''}
                                                onChange={e => setFormData({ ...formData, internationalName: e.target.value })}
                                                placeholder="International / English name..."
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ngành Nghề / Lĩnh Vực Hoạt Động</label>
                                        <input
                                            type="text"
                                            value={formData.businessType || ''}
                                            onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                            placeholder="Ví dụ: Công nghệ thông tin, Xây dựng, Bán lẻ..."
                                            className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contact' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Người Đại Diện / Người Liên Hệ Chính</label>
                                            <input
                                                type="text"
                                                value={formData.contactName || ''}
                                                onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                placeholder="Họ và tên người đại diện"
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Số Điện Thoại
                                                {duplicateWarnings.some(w => w.field === 'phone') && <span className="text-rose-600 ml-1 font-bold">(Trùng SĐT)</span>}
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.phone || ''}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                placeholder="0987xxxxxx"
                                                className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none font-mono text-slate-900 bg-white ${
                                                    duplicateWarnings.some(w => w.field === 'phone')
                                                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                                                        : 'border-slate-300 focus:border-emerald-600'
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                                Email Doanh Nghiệp / Liên Hệ
                                                {duplicateWarnings.some(w => w.field === 'email') && <span className="text-rose-600 ml-1 font-bold">(Trùng Email)</span>}
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.email || ''}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="contact@company.com"
                                                className={`w-full h-[34px] border rounded-lg px-2.5 py-1 text-xs outline-none text-slate-900 bg-white ${
                                                    duplicateWarnings.some(w => w.field === 'email')
                                                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                                                        : 'border-slate-300 focus:border-emerald-600'
                                                }`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Website</label>
                                            <input
                                                type="text"
                                                value={formData.website || ''}
                                                onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                placeholder="https://company.com"
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Địa Chỉ Trụ Sở / Đăng Ký Kinh Doanh</label>
                                        <input
                                            type="text"
                                            value={formData.address || ''}
                                            onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            placeholder="Địa chỉ trụ sở chính..."
                                            className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Địa Chỉ Xuất Hóa Đơn</label>
                                            <input
                                                type="text"
                                                value={formData.billingAddress || ''}
                                                onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                                                placeholder="Địa chỉ ghi trên hóa đơn GTGT..."
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Địa Chỉ Giao Hàng</label>
                                            <input
                                                type="text"
                                                value={formData.shippingAddress || ''}
                                                onChange={e => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                placeholder="Kho hàng / Địa chỉ nhận hàng..."
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'financial' && (
                                <div className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Ngân Hàng Giao Dịch</label>
                                            <input
                                                type="text"
                                                value={formData.bankName || ''}
                                                onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                placeholder="Ví dụ: Vietcombank, Techcombank, MB Bank..."
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Số Tài Khoản Ngân Hàng</label>
                                            <input
                                                type="text"
                                                value={formData.bankAccount || ''}
                                                onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                                                placeholder="Số tài khoản ngân hàng..."
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none font-mono focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Chi Nhánh Ngân Hàng</label>
                                        <input
                                            type="text"
                                            value={formData.bankBranch || ''}
                                            onChange={e => setFormData({ ...formData, bankBranch: e.target.value })}
                                            placeholder="Ví dụ: Chi nhánh TP.HCM, Chi nhánh Hà Nội..."
                                            className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Điều Khoản Thanh Toán</label>
                                            <input
                                                type="text"
                                                value={formData.paymentTerms || ''}
                                                onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                                placeholder="Ví dụ: Thanh toán ngay, Gối đầu 30 ngày..."
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 mb-1">Hạn Mức Công Nợ (VNĐ)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="1000"
                                                value={formData.creditLimit || ''}
                                                onChange={e => setFormData({ ...formData, creditLimit: parseFloat(e.target.value) || 0 })}
                                                placeholder="0"
                                                className="w-full h-[34px] border border-slate-300 rounded-lg px-2.5 py-1 text-xs outline-none font-mono focus:border-emerald-600 text-slate-900 bg-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'notes' && (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Ghi Chú Nội Bộ</label>
                                        <textarea
                                            rows={4}
                                            value={formData.internalNotes || ''}
                                            onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                                            placeholder="Nhập các thông tin lưu ý đặc biệt, chính sách riêng dành cho khách hàng này..."
                                            className="w-full border border-slate-300 rounded-lg p-2.5 text-xs outline-none focus:border-emerald-600 resize-none text-slate-900 bg-white placeholder:text-slate-400"
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
                                    className="h-[34px] px-4 border border-slate-300 rounded-lg hover:bg-white text-xs font-semibold text-slate-700 transition-all cursor-pointer"
                                >
                                    {t('customers.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    form="customerForm"
                                    disabled={isSubmitting}
                                    style={{ backgroundColor: '#05A613' }}
                                    className="h-[34px] px-5 text-white rounded-lg hover:opacity-90 disabled:opacity-50 text-xs font-bold shadow-xs transition-all cursor-pointer"
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

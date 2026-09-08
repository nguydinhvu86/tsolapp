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
import { createCustomer, updateCustomer, deleteCustomer, lookupCustomerTaxCode } from './actions';
import { 
    Plus, Edit, Trash2, Eye, ChevronUp, ChevronDown, ArrowUpDown, 
    Search, Users, TrendingUp, RefreshCcw, Activity, Sparkles, 
    Loader2, Building2, CreditCard, FileText, CheckCircle2, AlertCircle, 
    Globe, Mail, Phone, MapPin, DollarSign 
} from 'lucide-react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { formatMoney } from '@/lib/utils/formatters';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';

export type CustomerWithStats = Customer & { revenue?: number, lastActivityAt?: Date | string };

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

    // Sort & Filter state
    const [sortField, setSortField] = useState<keyof Customer>('createdAt');
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
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#1e3a8a', margin: 0 }}>{t('customers.titleAll')}</h3>
                            <p style={{ fontSize: '0.875rem', color: '#6366f1', margin: 0, marginTop: '4px' }}>{customers.length} {t('customers.allDesc')}</p>
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
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#064e3b', margin: 0 }}>{t('customers.titleTop')}</h3>
                            <p style={{ fontSize: '0.875rem', color: '#10b981', margin: 0, marginTop: '4px' }}>{t('customers.topDesc')}</p>
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
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#78350f', margin: 0 }}>{t('customers.titleRecent')}</h3>
                            <p style={{ fontSize: '0.875rem', color: '#f59e0b', margin: 0, marginTop: '4px' }}>{t('customers.recentDesc')}</p>
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
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#0c4a6e', margin: 0 }}>{t('customers.titleUpdated')}</h3>
                            <p style={{ fontSize: '0.875rem', color: '#0ea5e9', margin: 0, marginTop: '4px' }}>{t('customers.updatedDesc')}</p>
                        </div>
                    </div>
                </Card>
            </div>

            <Card>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                    <div className="flex gap-2 items-center w-full sm:w-[350px]" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.5rem 1rem', background: '#fff' }}>
                        <Search size={18} color="var(--text-muted)" />
                        <input
                            style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '0.9375rem' }}
                            placeholder="Tìm theo Mã, Tên, MST, SĐT, Email..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-center w-full sm:w-auto">
                        {canCreate && (
                            <Button onClick={() => openModal()} className="gap-2 bg-primary text-white hover:bg-primary-hover">
                                <Plus size={18} /> {t('customers.addCustomer')}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto pb-4">
                    <Table>
                        <thead className="whitespace-nowrap">
                            <tr>
                                <th onClick={() => handleSort('code')} style={{ cursor: 'pointer', userSelect: 'none', width: '110px' }}>
                                    <div className="flex items-center gap-1">Mã KH {sortField === 'code' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                                </th>
                                <th onClick={() => handleSort('name')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div className="flex items-center gap-1">{t('customers.name')} {sortField === 'name' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                                </th>
                                <th onClick={() => handleSort('taxCode')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div className="flex items-center gap-1">{t('customers.taxCode')} {sortField === 'taxCode' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                                </th>
                                <th onClick={() => handleSort('phone')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div className="flex items-center gap-1">{t('customers.phone')} {sortField === 'phone' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                                </th>
                                <th onClick={() => handleSort('email')} style={{ cursor: 'pointer', userSelect: 'none' }}>
                                    <div className="flex items-center gap-1">{t('customers.email')} {sortField === 'email' ? (sortOrder === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />) : <ArrowUpDown size={14} style={{ opacity: 0.3 }} />}</div>
                                </th>
                                <th style={{ width: '100px', textAlign: 'right' }}>{t('customers.action')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedItems.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>{t('customers.empty')}</td></tr>
                            ) : paginatedItems.map(customer => (
                                <tr key={customer.id}>
                                    <td>
                                        <span className="font-mono text-xs font-semibold px-2 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                                            {customer.code || '--'}
                                        </span>
                                    </td>
                                    <td className="align-top sm:align-middle">
                                        <div className="w-[200px] sm:w-[280px] md:w-auto font-semibold whitespace-normal break-words">
                                            <Link
                                                href={`/customers/${customer.id}`}
                                                className="text-indigo-600 hover:text-indigo-800 hover:underline text-[14px] leading-snug block font-medium"
                                            >
                                                {customer.name}
                                            </Link>
                                            {customer.shortName && (
                                                <span className="text-xs text-gray-500 block font-normal mt-0.5">
                                                    ({customer.shortName})
                                                </span>
                                            )}
                                        </div>
                                        {activeFilter === 'TOP_REVENUE_5' && customer.revenue ? (
                                            <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.25rem', fontWeight: 500 }}>{t('customers.revenue')} {formatMoney(customer.revenue)}</div>
                                        ) : null}
                                    </td>
                                    <td>
                                        {customer.taxCode ? (
                                            <span className="font-mono text-xs text-gray-800 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                                                {customer.taxCode}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }}>
                                        {customer.phone ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm">{customer.phone}</span>
                                                <ClickToCallButton phoneNumber={customer.phone} className="scale-90 origin-left" />
                                            </div>
                                        ) : '-'}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)' }} className="text-sm">{customer.email || '-'}</td>
                                    <td>
                                        <div className="flex gap-2 justify-end">
                                            <Link href={`/customers/${customer.id}`} style={{ color: 'var(--primary)', display: 'flex' }} title={t('customers.viewDetails')}>
                                                <Eye size={18} />
                                            </Link>
                                            {canEdit && (
                                                <button onClick={() => openModal(customer)} style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }} title={t('customers.edit')}>
                                                    <Edit size={18} />
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button onClick={() => handleDelete(customer.id)} style={{ color: 'var(--danger)', cursor: 'pointer', background: 'none', border: 'none' }} title={t('customers.delete')}>
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </div>
                <Pagination {...paginationProps} />

                {/* MODAL THÊM / SỬA KHÁCH HÀNG */}
                {isModalOpen && (
                    <div className="modal-backdrop">
                        <div className="modal-container" style={{ maxWidth: '850px', maxHeight: '92vh' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
                                        {editingId ? 'Cập Nhật Hồ Sơ Khách Hàng' : 'Thêm Mới Khách Hàng'}
                                    </h2>
                                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                                        Nhập mã số thuế để tra cứu tự động hoặc điền thông tin chi tiết
                                    </p>
                                </div>
                                <button
                                    onClick={closeModal}
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

                            {/* Form Content */}
                            <form id="customerForm" onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: 'calc(92vh - 240px)' }}>
                                {activeTab === 'general' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Mã Khách Hàng</label>
                                                <input
                                                    type="text"
                                                    value={formData.code || ''}
                                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                                    placeholder="Tự động sinh (KH-xxxx)"
                                                    className="input w-full font-mono text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Mã Số Thuế</label>
                                                <input
                                                    type="text"
                                                    value={formData.taxCode || ''}
                                                    onChange={e => setFormData({ ...formData, taxCode: e.target.value })}
                                                    placeholder="Ví dụ: 0101248141"
                                                    className="input w-full font-mono text-sm"
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
                                                Tên Khách Hàng / Công Ty <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.name || ''}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="Tên đầy đủ theo đăng ký kinh doanh..."
                                                className="input w-full font-medium"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Viết Tắt / Giao Dịch</label>
                                                <input
                                                    type="text"
                                                    value={formData.shortName || ''}
                                                    onChange={e => setFormData({ ...formData, shortName: e.target.value })}
                                                    placeholder="Ví dụ: FPT CORP, VINAMILK"
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Quốc Tế</label>
                                                <input
                                                    type="text"
                                                    value={formData.internationalName || ''}
                                                    onChange={e => setFormData({ ...formData, internationalName: e.target.value })}
                                                    placeholder="International / English name..."
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Ngành Nghề / Lĩnh Vực Hoạt Động</label>
                                            <input
                                                type="text"
                                                value={formData.businessType || ''}
                                                onChange={e => setFormData({ ...formData, businessType: e.target.value })}
                                                placeholder="Ví dụ: Công nghệ thông tin, Xây dựng, Bán lẻ..."
                                                className="input w-full text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'contact' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Người Đại Diện / Người Liên Hệ Chính</label>
                                                <input
                                                    type="text"
                                                    value={formData.contactName || ''}
                                                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                                    placeholder="Họ và tên người đại diện"
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Số Điện Thoại</label>
                                                <input
                                                    type="text"
                                                    value={formData.phone || ''}
                                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                                    placeholder="0987xxxxxx"
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Email Doanh Nghiệp / Liên Hệ</label>
                                                <input
                                                    type="email"
                                                    value={formData.email || ''}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    placeholder="contact@company.com"
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Website</label>
                                                <input
                                                    type="text"
                                                    value={formData.website || ''}
                                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                                    placeholder="https://company.com"
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Trụ Sở / Đăng Ký Kinh Doanh</label>
                                            <input
                                                type="text"
                                                value={formData.address || ''}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                placeholder="Địa chỉ trụ sở chính..."
                                                className="input w-full text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Xuất Hóa Đơn</label>
                                                <input
                                                    type="text"
                                                    value={formData.billingAddress || ''}
                                                    onChange={e => setFormData({ ...formData, billingAddress: e.target.value })}
                                                    placeholder="Địa chỉ ghi trên hóa đơn VAT..."
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Địa Chỉ Giao Nhận Hàng</label>
                                                <input
                                                    type="text"
                                                    value={formData.shippingAddress || ''}
                                                    onChange={e => setFormData({ ...formData, shippingAddress: e.target.value })}
                                                    placeholder="Địa chỉ kho / giao hàng..."
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'financial' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Tên Ngân Hàng</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankName || ''}
                                                    onChange={e => setFormData({ ...formData, bankName: e.target.value })}
                                                    placeholder="Ví dụ: Vietcombank, Techcombank, MB Bank..."
                                                    className="input w-full text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Số Tài Khoản</label>
                                                <input
                                                    type="text"
                                                    value={formData.bankAccount || ''}
                                                    onChange={e => setFormData({ ...formData, bankAccount: e.target.value })}
                                                    placeholder="Số tài khoản ngân hàng..."
                                                    className="input w-full font-mono text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Chi Nhánh Ngân Hàng</label>
                                            <input
                                                type="text"
                                                value={formData.bankBranch || ''}
                                                onChange={e => setFormData({ ...formData, bankBranch: e.target.value })}
                                                placeholder="Ví dụ: Chi nhánh TP.HCM, Chi nhánh Hà Nội..."
                                                className="input w-full text-sm"
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Điều Khoản Thanh Toán</label>
                                                <input
                                                    type="text"
                                                    value={formData.paymentTerms || ''}
                                                    onChange={e => setFormData({ ...formData, paymentTerms: e.target.value })}
                                                    placeholder="Ví dụ: Thanh toán ngay, Gối đầu 30 ngày..."
                                                    className="input w-full text-sm"
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
                                                    placeholder="0"
                                                    className="input w-full font-mono text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notes' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-600 mb-1">Ghi Chú Nội Bộ</label>
                                            <textarea
                                                rows={5}
                                                value={formData.internalNotes || ''}
                                                onChange={e => setFormData({ ...formData, internalNotes: e.target.value })}
                                                placeholder="Nhập các thông tin lưu ý đặc biệt, chính sách riêng dành cho khách hàng này..."
                                                className="input w-full text-sm"
                                                style={{ resize: 'vertical' }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </form>

                            {/* Modal Footer */}
                            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
                                <div className="text-xs text-slate-500">
                                    <span className="font-semibold">{activeTab === 'general' ? 'Bước 1/4' : activeTab === 'contact' ? 'Bước 2/4' : activeTab === 'financial' ? 'Bước 3/4' : 'Bước 4/4'}</span>: {
                                        activeTab === 'general' ? 'Thông tin chung & Thuế' : activeTab === 'contact' ? 'Liên hệ & Địa chỉ' : activeTab === 'financial' ? 'Tài chính' : 'Ghi chú'
                                    }
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="secondary" onClick={closeModal} disabled={isSubmitting}>
                                        {t('customers.cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        form="customerForm"
                                        disabled={isSubmitting}
                                        className="bg-primary text-white hover:bg-primary-hover"
                                    >
                                        {isSubmitting ? 'Đang lưu...' : t('customers.save')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
}

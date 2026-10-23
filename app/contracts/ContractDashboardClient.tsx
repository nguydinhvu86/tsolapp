'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState, useMemo } from 'react';
import { Contract, Customer, ContractTemplate } from '@prisma/client';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { deleteContract, updateContractStatus, updateContract } from './actions';
import {
    Plus,
    Trash2,
    Search,
    Edit2,
    Eye,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    X,
    Copy,
    Check,
    FileText,
    CheckCircle2,
    ExternalLink,
    Building2,
    Calendar,
    FileCode,
    Send,
    Clock,
    Layers,
    FileSpreadsheet
} from 'lucide-react';
import { ContractQuickViewDrawer } from './ContractQuickViewDrawer';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { toast } from '@/app/components/providers/ToastProvider';
import { confirmModal } from '@/app/components/providers/ConfirmProvider';

type ContractWithRelations = Contract & { customer: Customer, template: ContractTemplate };

export function ContractDashboardClient({ initialData }: { initialData: ContractWithRelations[] }) {
    const { t } = useTranslation();
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = true;
    const canEdit = isAdmin || permissions.includes('CONTRACTS_EDIT');
    const canDelete = isAdmin || permissions.includes('CONTRACTS_DELETE');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [templateFilter, setTemplateFilter] = useState('');
    const [editingContract, setEditingContract] = useState<ContractWithRelations | null>(null);
    const [quickViewContract, setQuickViewContract] = useState<ContractWithRelations | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const stats = useMemo(() => {
        const total = initialData.length;
        let draft = 0;
        let sent = 0;
        let signed = 0;
        let cancelled = 0;
        initialData.forEach(c => {
            if (c.status === 'DRAFT') draft++;
            else if (c.status === 'SENT') sent++;
            else if (c.status === 'SIGNED') signed++;
            else if (c.status === 'CANCELLED') cancelled++;
        });
        return { total, draft, sent, signed, cancelled };
    }, [initialData]);

    const templateOptions = useMemo(() => {
        const map = new Map<string, string>();
        initialData.forEach(c => {
            if (c.template?.id && c.template?.name) {
                map.set(c.template.id, c.template.name);
            }
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [initialData]);

    const filteredData = useMemo(() => {
        const kw = searchTerm.trim().toLowerCase();
        return initialData.filter(c => {
            const matchSearch =
                !kw ||
                c.title.toLowerCase().includes(kw) ||
                (c.customer?.name && c.customer.name.toLowerCase().includes(kw)) ||
                (c.template?.name && c.template.name.toLowerCase().includes(kw));
            const matchStatus = statusFilter ? c.status === statusFilter : true;
            const matchTemplate = templateFilter ? c.templateId === templateFilter : true;
            return matchSearch && matchStatus && matchTemplate;
        });
    }, [initialData, searchTerm, statusFilter, templateFilter]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedData = useMemo(() => {
        return [...filteredData].sort((a: any, b: any) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (sortField === 'customerName') {
                aVal = a.customer?.name || '';
                bVal = b.customer?.name || '';
            } else if (sortField === 'templateName') {
                aVal = a.template?.name || '';
                bVal = b.template?.name || '';
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc' ? aVal.localeCompare(bVal, 'vi') : bVal.localeCompare(aVal, 'vi');
            }
            if (aVal instanceof Date || bVal instanceof Date || sortField === 'createdAt') {
                const dateA = new Date(aVal).getTime() || 0;
                const dateB = new Date(bVal).getTime() || 0;
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }
            return 0;
        });
    }, [filteredData, sortField, sortOrder]);

    const { paginatedItems, paginationProps } = usePagination(sortedData, 15);

    const handleDelete = async (id: string) => {
        if (await confirmModal(t('contractDashboard.confirmDelete'))) {
            await deleteContract(id);
            router.refresh();
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateContractStatus(id, newStatus);
        if (quickViewContract && quickViewContract.id === id) {
            setQuickViewContract(prev => prev ? { ...prev, status: newStatus } : null);
        }
        router.refresh();
    };

    const handleEditClick = (contract: ContractWithRelations) => {
        setEditingContract(contract);
        setEditContent(contract.content);
    };

    const handleSaveContract = async () => {
        if (!editingContract) return;
        setIsSaving(true);
        try {
            await updateContract(editingContract.id, editContent);
            setEditingContract(null);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyLink = (id: string) => {
        const url = `${window.location.origin}/public/contracts/${id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(id);
        toast.success('Đã sao chép liên kết xem trước', url);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'SIGNED':
                return {
                    bg: '#ecfdf5',
                    color: '#047857',
                    border: '#a7f3d0',
                    iconBg: '#d1fae5',
                    iconColor: '#059669'
                };
            case 'SENT':
                return {
                    bg: '#f0f9ff',
                    color: '#0369a1',
                    border: '#bae6fd',
                    iconBg: '#e0f2fe',
                    iconColor: '#0284c7'
                };
            case 'CANCELLED':
                return {
                    bg: '#fff1f2',
                    color: '#be123c',
                    border: '#fecdd3',
                    iconBg: '#ffe4e6',
                    iconColor: '#e11d48'
                };
            default:
                return {
                    bg: '#fffbeb',
                    color: '#b45309',
                    border: '#fde68a',
                    iconBg: '#fef3c7',
                    iconColor: '#d97706'
                };
        }
    };

    const pageHeading =
        t('contractDashboard.pageTitle') !== 'contractDashboard.pageTitle'
            ? t('contractDashboard.pageTitle')
            : 'Quản lý Hợp đồng';

    return (
        <div className="space-y-5 font-sans text-slate-800">
            {/* 1. Executive Header Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-xs"
                        style={{
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            color: '#ffffff'
                        }}
                    >
                        <FileText size={22} strokeWidth={2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-[20px] font-bold text-slate-900 tracking-tight leading-snug m-0">
                                {pageHeading}
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[12px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 tabular-nums">
                                {stats.total} hợp đồng
                            </span>
                        </div>
                        <p className="text-[13px] text-slate-500 mt-0.5 font-normal">
                            Quản lý các hợp đồng mẫu, hợp đồng khách hàng và trạng thái ký kết
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                    <Link
                        href="/templates"
                        className="inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-xl text-[13px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 transition-all"
                    >
                        <FileCode size={15} className="text-slate-500" />
                        <span>Mẫu hợp đồng</span>
                    </Link>
                    <Link
                        href="/contract-appendices"
                        className="inline-flex items-center gap-1.5 h-[38px] px-3.5 rounded-xl text-[13px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 transition-all"
                    >
                        <FileSpreadsheet size={15} className="text-slate-500" />
                        <span>Phụ lục HĐ</span>
                    </Link>
                    {canCreate && (
                        <Link
                            href="/contracts/new"
                            className="inline-flex items-center gap-2 h-[38px] px-4 rounded-xl text-[13px] font-semibold text-white shadow-xs transition-all hover:opacity-95 active:scale-[0.99]"
                            style={{ backgroundColor: '#059669' }}
                        >
                            <Plus size={17} strokeWidth={2.5} />
                            <span>{t('contractDashboard.createContract')}</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* 2. Balanced KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Card 1: Total */}
                <button
                    type="button"
                    onClick={() => setStatusFilter('')}
                    className="text-left rounded-2xl p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden flex items-center justify-between gap-3"
                    style={{
                        background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
                        border: statusFilter === '' ? '2px solid #9333ea' : '1px solid #e9d5ff',
                        boxShadow: statusFilter === '' ? '0 4px 12px rgba(147, 51, 234, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.03)'
                    }}
                >
                    <div className="min-w-0">
                        <div className="text-[11.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#7e22ce' }}>
                            Tất cả hợp đồng
                        </div>
                        <div className="text-[28px] font-extrabold leading-none tabular-nums mb-1.5" style={{ color: '#581c87' }}>
                            {stats.total}
                        </div>
                        <div className="text-[12px] font-medium text-slate-500">
                            Tổng số hợp đồng hệ thống
                        </div>
                    </div>
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'rgba(147, 51, 234, 0.12)', color: '#7e22ce' }}
                    >
                        <Layers size={21} strokeWidth={2} />
                    </div>
                </button>

                {/* Card 2: Draft */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT')}
                    className="text-left rounded-2xl p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden flex items-center justify-between gap-3"
                    style={{
                        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                        border: statusFilter === 'DRAFT' ? '2px solid #d97706' : '1px solid #fde68a',
                        boxShadow: statusFilter === 'DRAFT' ? '0 4px 12px rgba(217, 119, 6, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.03)'
                    }}
                >
                    <div className="min-w-0">
                        <div className="text-[11.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#b45309' }}>
                            {t('contractDashboard.statusDraft')}
                        </div>
                        <div className="text-[28px] font-extrabold leading-none tabular-nums mb-1.5" style={{ color: '#92400e' }}>
                            {stats.draft}
                        </div>
                        <div className="text-[12px] font-medium text-slate-500">
                            Bản thảo chưa gửi khách
                        </div>
                    </div>
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'rgba(217, 119, 6, 0.12)', color: '#b45309' }}
                    >
                        <Clock size={21} strokeWidth={2} />
                    </div>
                </button>

                {/* Card 3: Sent */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'SENT' ? '' : 'SENT')}
                    className="text-left rounded-2xl p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden flex items-center justify-between gap-3"
                    style={{
                        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                        border: statusFilter === 'SENT' ? '2px solid #0284c7' : '1px solid #bae6fd',
                        boxShadow: statusFilter === 'SENT' ? '0 4px 12px rgba(2, 132, 199, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.03)'
                    }}
                >
                    <div className="min-w-0">
                        <div className="text-[11.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#0369a1' }}>
                            {t('contractDashboard.statusSent')}
                        </div>
                        <div className="text-[28px] font-extrabold leading-none tabular-nums mb-1.5" style={{ color: '#075985' }}>
                            {stats.sent}
                        </div>
                        <div className="text-[12px] font-medium text-slate-500">
                            Đang chờ khách hàng ký
                        </div>
                    </div>
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'rgba(2, 132, 199, 0.12)', color: '#0284c7' }}
                    >
                        <Send size={20} strokeWidth={2} />
                    </div>
                </button>

                {/* Card 4: Signed */}
                <button
                    type="button"
                    onClick={() => setStatusFilter(statusFilter === 'SIGNED' ? '' : 'SIGNED')}
                    className="text-left rounded-2xl p-4 sm:p-5 transition-all cursor-pointer relative overflow-hidden flex items-center justify-between gap-3"
                    style={{
                        background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                        border: statusFilter === 'SIGNED' ? '2px solid #059669' : '1px solid #a7f3d0',
                        boxShadow: statusFilter === 'SIGNED' ? '0 4px 12px rgba(5, 150, 105, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.03)'
                    }}
                >
                    <div className="min-w-0">
                        <div className="text-[11.5px] font-bold uppercase tracking-wider mb-1.5" style={{ color: '#047857' }}>
                            {t('contractDashboard.statusSigned')}
                        </div>
                        <div className="text-[28px] font-extrabold leading-none tabular-nums mb-1.5" style={{ color: '#065f46' }}>
                            {stats.signed}
                        </div>
                        <div className="text-[12px] font-medium text-slate-500">
                            Hợp đồng đã hoàn tất ký
                        </div>
                    </div>
                    <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: 'rgba(5, 150, 105, 0.12)', color: '#059669' }}
                    >
                        <CheckCircle2 size={21} strokeWidth={2} />
                    </div>
                </button>
            </div>

            {/* 3. Main Data Container (Toolbar + Table + Pagination) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                {/* Filter & Search Ribbon */}
                <div className="p-4 border-b border-slate-200/80 bg-slate-50/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* Search Input (Flexbox aligned so icon never shifts) */}
                    <div className="flex items-center flex-1 max-w-xl h-[38px] bg-white border border-slate-200/90 rounded-xl px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/15 transition-all shadow-2xs">
                        <Search size={16} className="text-slate-400 shrink-0 mr-2.5" />
                        <input
                            type="text"
                            placeholder={t('contractDashboard.searchPlaceholder')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full h-full bg-transparent border-none outline-none text-[13px] text-slate-800 placeholder:text-slate-400 font-medium"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 shrink-0 ml-1"
                                title="Xóa tìm kiếm"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* Right Filters: Template Select + Status Select + Reset */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {templateOptions.length > 0 && (
                            <select
                                className="h-[38px] px-3 text-[13px] bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-700 font-medium cursor-pointer shadow-2xs"
                                value={templateFilter}
                                onChange={e => setTemplateFilter(e.target.value)}
                            >
                                <option value="">Tất cả loại mẫu ({templateOptions.length})</option>
                                {templateOptions.map(tpl => (
                                    <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                                ))}
                            </select>
                        )}

                        <select
                            className="h-[38px] px-3 text-[13px] bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:border-emerald-500 text-slate-700 font-medium cursor-pointer shadow-2xs"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="">{t('contractDashboard.statusAll')} ({stats.total})</option>
                            <option value="DRAFT">{t('contractDashboard.statusDraft')} ({stats.draft})</option>
                            <option value="SENT">{t('contractDashboard.statusSent')} ({stats.sent})</option>
                            <option value="SIGNED">{t('contractDashboard.statusSigned')} ({stats.signed})</option>
                            <option value="CANCELLED">{t('contractDashboard.statusCancelled')} ({stats.cancelled})</option>
                        </select>

                        {(searchTerm || statusFilter || templateFilter) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('');
                                    setTemplateFilter('');
                                }}
                                className="h-[38px] px-3 rounded-xl text-[12.5px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition-colors"
                            >
                                Xóa lọc
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200/80">
                                <th
                                    onClick={() => handleSort('title')}
                                    className="cursor-pointer select-none hover:bg-slate-100/80 py-3.5 px-4 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 transition-colors min-w-[280px]"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>{t('contractDashboard.title')}</span>
                                        {sortField === 'title' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />
                                        ) : (
                                            <ArrowUpDown size={13} className="text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('templateName')}
                                    className="cursor-pointer select-none hover:bg-slate-100/80 py-3.5 px-4 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 transition-colors w-[180px]"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>{t('contractDashboard.templateName')}</span>
                                        {sortField === 'templateName' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />
                                        ) : (
                                            <ArrowUpDown size={13} className="text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('customerName')}
                                    className="cursor-pointer select-none hover:bg-slate-100/80 py-3.5 px-4 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 transition-colors min-w-[240px]"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>{t('contractDashboard.customerName')}</span>
                                        {sortField === 'customerName' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />
                                        ) : (
                                            <ArrowUpDown size={13} className="text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('status')}
                                    className="cursor-pointer select-none hover:bg-slate-100/80 py-3.5 px-4 text-center text-[11.5px] font-bold uppercase tracking-wider text-slate-500 transition-colors w-[135px]"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span>{t('contractDashboard.status')}</span>
                                        {sortField === 'status' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />
                                        ) : (
                                            <ArrowUpDown size={13} className="text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    onClick={() => handleSort('createdAt')}
                                    className="cursor-pointer select-none hover:bg-slate-100/80 py-3.5 px-4 text-[11.5px] font-bold uppercase tracking-wider text-slate-500 transition-colors w-[130px]"
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span>{t('contractDashboard.createdAt')}</span>
                                        {sortField === 'createdAt' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={14} className="text-emerald-600" /> : <ChevronDown size={14} className="text-emerald-600" />
                                        ) : (
                                            <ArrowUpDown size={13} className="text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th className="py-3.5 px-4 text-center text-[11.5px] font-bold uppercase tracking-wider text-slate-500 w-[170px]">
                                    {t('contractDashboard.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 px-4 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <FileText size={20} />
                                            </div>
                                            <p className="text-[13.5px] font-semibold text-slate-700">
                                                {t('contractDashboard.noContracts')}
                                            </p>
                                            <p className="text-[12.5px] text-slate-400">
                                                Thử thay đổi bộ lọc hoặc tạo hợp đồng mới để bắt đầu
                                            </p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map(c => {
                                    const stStyle = getStatusStyle(c.status);
                                    const isCopied = copiedId === c.id;

                                    return (
                                        <tr
                                            key={c.id}
                                            className="hover:bg-slate-50/80 transition-colors group"
                                        >
                                            {/* Col 1: Tên Hợp đồng */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div
                                                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                                                        style={{
                                                            backgroundColor: stStyle.iconBg,
                                                            color: stStyle.iconColor
                                                        }}
                                                    >
                                                        <FileText size={16} strokeWidth={2} />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickViewContract(c)}
                                                        className="text-left text-[13.5px] font-semibold text-slate-800 group-hover:text-emerald-700 hover:underline transition-colors cursor-pointer leading-snug line-clamp-2"
                                                        title="Nhấn để xem nhanh hợp đồng"
                                                    >
                                                        {c.title}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* Col 2: Loại Mẫu */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[12.5px] font-medium bg-slate-100/90 text-slate-700 border border-slate-200/80 max-w-[180px] truncate">
                                                    <FileCode size={13} className="text-slate-400 shrink-0" />
                                                    <span className="truncate">{c.template?.name || 'Mặc định'}</span>
                                                </span>
                                            </td>

                                            {/* Col 3: Khách hàng */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Building2 size={14} className="text-slate-400 shrink-0" />
                                                    <Link
                                                        href={`/customers/${c.customer.id}`}
                                                        className="text-[13px] font-medium text-slate-700 hover:text-emerald-600 transition-colors leading-snug line-clamp-1"
                                                        title={c.customer.name}
                                                    >
                                                        {c.customer.name}
                                                    </Link>
                                                </div>
                                            </td>

                                            {/* Col 4: Trạng thái */}
                                            <td className="py-3.5 px-4 align-middle text-center">
                                                <select
                                                    className="text-[12px] font-semibold rounded-full px-3 py-1 border cursor-pointer focus:outline-none transition-all"
                                                    style={{
                                                        backgroundColor: stStyle.bg,
                                                        color: stStyle.color,
                                                        borderColor: stStyle.border,
                                                        opacity: canEdit ? 1 : 0.75
                                                    }}
                                                    value={c.status}
                                                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                                    disabled={!canEdit}
                                                >
                                                    <option value="DRAFT">{t('contractDashboard.statusDraft')}</option>
                                                    <option value="SENT">{t('contractDashboard.statusSent')}</option>
                                                    <option value="SIGNED">{t('contractDashboard.statusSigned')}</option>
                                                    <option value="CANCELLED">{t('contractDashboard.statusCancelled')}</option>
                                                </select>
                                            </td>

                                            {/* Col 5: Ngày tạo */}
                                            <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-600 tabular-nums" suppressHydrationWarning>
                                                    <Calendar size={13} className="text-slate-400 shrink-0" />
                                                    <span>{formatDate(new Date(c.createdAt))}</span>
                                                </div>
                                            </td>

                                            {/* Col 6: Thao tác */}
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex items-center justify-center gap-1">
                                                    {/* XEM NHANH: DRAWER */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickViewContract(c)}
                                                        className="w-8 h-8 inline-flex items-center justify-center text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Xem nhanh (Drawer)"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {/* XEM CHI TIẾT: FULL PAGE */}
                                                    <Link
                                                        href={`/contracts/${c.id}`}
                                                        className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Mở chi tiết & in hợp đồng"
                                                    >
                                                        <ExternalLink size={15} />
                                                    </Link>

                                                    {/* SỬA */}
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(c)}
                                                            className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                                            title={t('contractDashboard.editContent')}
                                                        >
                                                            <Edit2 size={15} />
                                                        </button>
                                                    )}

                                                    {/* COPY LINK */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyLink(c.id)}
                                                        className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors cursor-pointer"
                                                        title="Sao chép liên kết xem trước cho khách hàng"
                                                    >
                                                        {isCopied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                                                    </button>

                                                    {/* XÓA */}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(c.id)}
                                                            className="w-8 h-8 inline-flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                            title={t('contractDashboard.delete')}
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

                {/* Pagination Footer */}
                <Pagination {...paginationProps} />
            </div>

            {/* Quick View Drawer */}
            <ContractQuickViewDrawer
                isOpen={!!quickViewContract}
                onClose={() => setQuickViewContract(null)}
                contract={quickViewContract}
                onStatusChange={handleStatusChange}
                onEdit={handleEditClick}
                canEdit={canEdit}
            />

            {/* Modal chỉnh sửa hợp đồng */}
            <Modal
                isOpen={!!editingContract}
                onClose={() => setEditingContract(null)}
                title={`${t('contractDashboard.editTitle')}: ${editingContract?.title}`}
                maxWidth="1000px"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-[13px] text-slate-500">
                        {t('contractDashboard.customerLabel')}: <strong className="text-slate-800">{editingContract?.customer.name}</strong>
                    </p>
                    <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder={t('contractDashboard.editPlaceholder')}
                    />
                    <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setEditingContract(null)}>{t('contractDashboard.cancel')}</Button>
                        <Button onClick={handleSaveContract} disabled={isSaving}>
                            {isSaving ? t('contractDashboard.saving') : t('contractDashboard.saveChanges')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

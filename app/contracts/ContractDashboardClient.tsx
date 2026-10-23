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

    const pageHeading =
        t('contractDashboard.pageTitle') !== 'contractDashboard.pageTitle'
            ? t('contractDashboard.pageTitle')
            : 'Quản lý Hợp đồng';

    return (
        <div className="space-y-4">
            {/* 1. ERP Header Bar (Đồng bộ chuẩn font & kích thước toàn hệ thống) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            QUẢN LÝ VĂN THƯ
                        </span>
                        <span className="text-slate-300 text-xs">|</span>
                        <span className="text-xs font-semibold text-slate-500">Hợp đồng &amp; Ký kết B2B</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            {pageHeading}
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono shadow-2xs">
                            {stats.total}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <Link
                        href="/templates"
                        className="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <FileCode size={15} />
                        <span>Mẫu hợp đồng</span>
                    </Link>
                    <Link
                        href="/contract-appendices"
                        className="inline-flex items-center gap-1.5 h-[36px] px-3.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <FileSpreadsheet size={15} />
                        <span>Phụ lục HĐ</span>
                    </Link>
                    {canCreate && (
                        <Link href="/contracts/new">
                            <button
                                type="button"
                                style={{ backgroundColor: '#05A613' }}
                                className="inline-flex items-center gap-2 h-[36px] px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                            >
                                <Plus size={16} className="stroke-[3]" />
                                <span>{t('contractDashboard.createContract')}</span>
                            </button>
                        </Link>
                    )}
                </div>
            </div>

            {/* 2. KPI Filter Cards (Đồng bộ chuẩn thẻ hệ thống) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Card 1: Tất cả */}
                <div
                    onClick={() => setStatusFilter('')}
                    style={statusFilter === '' ? { borderColor: '#7c3aed', backgroundColor: '#faf5ff', boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.15)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#7c3aed' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <Layers size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">Tất cả hợp đồng</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Tổng số hợp đồng hệ thống</p>
                            </div>
                        </div>
                        <span
                            style={statusFilter === '' ? { color: '#7c3aed' } : {}}
                            className="text-lg font-extrabold font-mono text-slate-800"
                        >
                            {stats.total}
                        </span>
                    </div>
                </div>

                {/* Card 2: Bản nháp */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT')}
                    style={statusFilter === 'DRAFT' ? { borderColor: '#f59e0b', backgroundColor: '#fffbeb', boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#f59e0b' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <Clock size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">{t('contractDashboard.statusDraft')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Bản thảo chưa gửi khách</p>
                            </div>
                        </div>
                        <span
                            style={statusFilter === 'DRAFT' ? { color: '#d97706' } : {}}
                            className="text-lg font-extrabold font-mono text-slate-800"
                        >
                            {stats.draft}
                        </span>
                    </div>
                </div>

                {/* Card 3: Đã gửi */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'SENT' ? '' : 'SENT')}
                    style={statusFilter === 'SENT' ? { borderColor: '#0ea5e9', backgroundColor: '#f0f9ff', boxShadow: '0 0 0 2px rgba(14, 165, 233, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#0ea5e9' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <Send size={19} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">{t('contractDashboard.statusSent')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Đang chờ khách hàng ký</p>
                            </div>
                        </div>
                        <span
                            style={statusFilter === 'SENT' ? { color: '#0284c7' } : {}}
                            className="text-lg font-extrabold font-mono text-slate-800"
                        >
                            {stats.sent}
                        </span>
                    </div>
                </div>

                {/* Card 4: Đã ký */}
                <div
                    onClick={() => setStatusFilter(statusFilter === 'SIGNED' ? '' : 'SIGNED')}
                    style={statusFilter === 'SIGNED' ? { borderColor: '#05A613', backgroundColor: '#ecfdf5', boxShadow: '0 0 0 2px rgba(5, 166, 19, 0.2)' } : {}}
                    className="relative cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border border-slate-200 shadow-xs hover:-translate-y-0.5 hover:shadow-sm"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                style={{ backgroundColor: '#05A613' }}
                                className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-sm shrink-0"
                            >
                                <CheckCircle2 size={20} className="stroke-[2.2]" />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 tracking-tight">{t('contractDashboard.statusSigned')}</h3>
                                <p className="text-[11px] text-slate-500 mt-0.5">Hợp đồng đã hoàn tất ký</p>
                            </div>
                        </div>
                        <span
                            style={statusFilter === 'SIGNED' ? { color: '#05A613' } : {}}
                            className="text-lg font-extrabold font-mono text-slate-800"
                        >
                            {stats.signed}
                        </span>
                    </div>
                </div>
            </div>

            {/* 3. Main Data Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                    {/* Search Input */}
                    <div className="flex items-center w-full sm:w-[380px] h-[36px] bg-white border border-slate-300 rounded-lg px-3 focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600/20 transition-all shadow-2xs">
                        <Search size={14} className="text-slate-400 shrink-0 mr-2" />
                        <input
                            type="text"
                            placeholder={t('contractDashboard.searchPlaceholder')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full h-full text-xs bg-transparent border-none outline-none text-slate-800 placeholder-slate-400"
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                onClick={() => setSearchTerm('')}
                                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer shrink-0 ml-1"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Right Filter Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                            Hiển thị <span className="text-slate-900 font-bold font-mono">{filteredData.length}</span> / {stats.total} hợp đồng
                        </span>

                        {templateOptions.length > 0 && (
                            <select
                                className="h-[34px] px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 text-slate-700 font-semibold cursor-pointer shadow-2xs"
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
                            className="h-[34px] px-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-emerald-600 text-slate-700 font-semibold cursor-pointer shadow-2xs"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="">{t('contractDashboard.statusAll')} ({stats.total})</option>
                            <option value="DRAFT">{t('contractDashboard.statusDraft')} ({stats.draft})</option>
                            <option value="SENT">{t('contractDashboard.statusSent')} ({stats.sent})</option>
                            <option value="SIGNED">{t('contractDashboard.statusSigned')} ({stats.signed})</option>
                            <option value="CANCELLED">{t('contractDashboard.statusCancelled')} ({stats.cancelled})</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-100/80">
                                <th
                                    onClick={() => handleSort('title')}
                                    className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/60 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        {t('contractDashboard.title')}
                                        {sortField === 'title' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                        ) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('templateName')}
                                    className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[170px] hover:bg-slate-200/60 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        {t('contractDashboard.templateName')}
                                        {sortField === 'templateName' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                        ) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('customerName')}
                                    className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/60 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        {t('contractDashboard.customerName')}
                                        {sortField === 'customerName' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                        ) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('status')}
                                    className="cursor-pointer select-none py-2.5 px-3.5 text-center text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[130px] hover:bg-slate-200/60 transition-colors"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        {t('contractDashboard.status')}
                                        {sortField === 'status' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                        ) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('createdAt')}
                                    className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[115px] hover:bg-slate-200/60 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        {t('contractDashboard.createdAt')}
                                        {sortField === 'createdAt' ? (
                                            sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                        ) : <ArrowUpDown size={11} className="opacity-30" />}
                                    </div>
                                </th>

                                <th className="py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[195px]">
                                    {t('contractDashboard.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                <Search size={18} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600">{t('contractDashboard.noContracts')}</p>
                                            <p className="text-[11px] text-slate-400">Thử thay đổi từ khóa hoặc bộ lọc trạng thái</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map(c => {
                                    const isCopied = copiedId === c.id;

                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50/90 transition-colors group">
                                            {/* TÊN HỢP ĐỒNG */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                                                        <FileText size={14} />
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickViewContract(c)}
                                                        className="text-left font-bold text-xs text-slate-900 hover:text-emerald-700 transition-colors cursor-pointer"
                                                        title="Nhấn để Xem nhanh"
                                                    >
                                                        {c.title}
                                                    </button>
                                                </div>
                                            </td>

                                            {/* LOẠI MẪU */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <span className="font-mono text-[11px] font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 inline-block truncate max-w-[160px]">
                                                    {c.template?.name || 'Mặc định'}
                                                </span>
                                            </td>

                                            {/* KHÁCH HÀNG */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Building2 size={13} className="text-slate-400 shrink-0" />
                                                    <Link
                                                        href={`/customers/${c.customer.id}`}
                                                        className="text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors truncate max-w-[280px]"
                                                    >
                                                        {c.customer.name}
                                                    </Link>
                                                </div>
                                            </td>

                                            {/* TRẠNG THÁI */}
                                            <td className="py-2.5 px-3.5 align-middle text-center">
                                                <select
                                                    value={c.status}
                                                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                                    disabled={!canEdit}
                                                    style={{
                                                        backgroundColor: c.status === 'SIGNED' ? '#ecfdf5' : c.status === 'CANCELLED' ? '#fff1f2' : c.status === 'SENT' ? '#f0f9ff' : '#fffbeb',
                                                        color: c.status === 'SIGNED' ? '#047857' : c.status === 'CANCELLED' ? '#be123c' : c.status === 'SENT' ? '#0369a1' : '#b45309',
                                                        borderColor: c.status === 'SIGNED' ? '#a7f3d0' : c.status === 'CANCELLED' ? '#fecdd3' : c.status === 'SENT' ? '#bae6fd' : '#fde68a',
                                                    }}
                                                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md border focus:outline-none transition-colors shadow-2xs ${
                                                        canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'
                                                    }`}
                                                >
                                                    <option value="DRAFT">{t('contractDashboard.statusDraft')}</option>
                                                    <option value="SENT">{t('contractDashboard.statusSent')}</option>
                                                    <option value="SIGNED">{t('contractDashboard.statusSigned')}</option>
                                                    <option value="CANCELLED">{t('contractDashboard.statusCancelled')}</option>
                                                </select>
                                            </td>

                                            {/* NGÀY TẠO */}
                                            <td className="py-2.5 px-3.5 align-middle whitespace-nowrap">
                                                <span className="text-xs font-mono text-slate-500" suppressHydrationWarning>
                                                    {formatDate(new Date(c.createdAt))}
                                                </span>
                                            </td>

                                            {/* THAO TÁC */}
                                            <td className="py-2.5 px-3.5 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {/* XEM NHANH: DRAWER */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuickViewContract(c)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all cursor-pointer shadow-2xs shrink-0"
                                                        title="Xem nhanh Hợp đồng"
                                                    >
                                                        <Eye size={13} />
                                                        <span>Xem nhanh</span>
                                                    </button>

                                                    {/* XEM CHI TIẾT: FULL PAGE */}
                                                    <Link
                                                        href={`/contracts/${c.id}`}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-emerald-700 hover:bg-slate-100 transition-colors"
                                                        title="Mở trang chi tiết & in chuẩn A4"
                                                    >
                                                        <ExternalLink size={14} />
                                                    </Link>

                                                    {/* SỬA */}
                                                    {canEdit && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEditClick(c)}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                                            title={t('contractDashboard.editContent')}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}

                                                    {/* COPY LINK */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyLink(c.id)}
                                                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                                                        title="Sao chép Link xem trước cho khách"
                                                    >
                                                        {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                    </button>

                                                    {/* XÓA */}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(c.id)}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                            title={t('contractDashboard.delete')}
                                                        >
                                                            <Trash2 size={14} />
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

                {/* Pagination */}
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
                    <p className="text-xs text-slate-500">
                        {t('contractDashboard.customerLabel')}: <strong className="text-slate-800">{editingContract?.customer.name}</strong>
                    </p>
                    <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder={t('contractDashboard.editPlaceholder')}
                    />
                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
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

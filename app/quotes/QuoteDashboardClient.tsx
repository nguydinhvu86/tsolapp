'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { Quote, Customer, QuoteTemplate } from '@prisma/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { useSession } from 'next-auth/react';
import { confirmModal } from '@/app/components/providers/ConfirmProvider';
import { toast } from '@/app/components/providers/ToastProvider';
import { formatDate, formatMoney } from '@/lib/utils/formatters';
import { deleteQuote, updateQuoteStatus, updateQuote } from './actions';
import { QuoteAnalyticsBar } from './QuoteAnalyticsBar';
import { QuoteQuickViewDrawer } from './QuoteQuickViewDrawer';
import { Modal } from '@/app/components/ui/Modal';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { Button } from '@/app/components/ui/Button';

import { 
    Plus, 
    Trash2, 
    Printer, 
    Search, 
    Edit, 
    FileSpreadsheet, 
    ChevronUp, 
    ChevronDown, 
    ArrowUpDown, 
    FileText, 
    Send, 
    CheckCircle, 
    FileBadge, 
    XCircle, 
    PieChart, 
    LayoutGrid, 
    List, 
    Eye, 
    ExternalLink, 
    Copy, 
    Check, 
    X, 
    Building2, 
    BarChart3, 
    Filter,
    Layers,
    BadgeDollarSign
} from 'lucide-react';

export type QuoteWithRelations = Quote & { 
    customer: Customer; 
    template: QuoteTemplate;
    creator?: { id: string; name: string | null; avatar: string | null } | null;
};

export function getQuoteTotal(quote: any): number {
    try {
        const vars = JSON.parse(quote.variables || '{}');

        if (vars['_GRAND_TOTAL']) {
            return parseFloat(vars['_GRAND_TOTAL'].replace(/,/g, '')) || 0;
        }

        // Check for common total variable names used in NewQuoteClient.tsx
        for (const key of Object.keys(vars)) {
            const kl = key.toLowerCase();
            if (kl.includes('sau_thue') || (kl.includes('tong_tien') && !kl.includes('bang_chu'))) {
                const val = vars[key];
                if (val && typeof val === 'string' && !val.includes('<table')) {
                    const num = parseFloat(val.replace(/,/g, ''));
                    if (!isNaN(num)) return num;
                }
            }
        }

        // Fallback for older quotes without explicitly defined variables: parse the HTML table
        for (const key of Object.keys(vars)) {
            if (key.startsWith('TABLE_')) {
                const html = vars[key];
                let match = html.match(/Tổng tạm tính đã bao gồm thuế VAT[^<]*<\/td>\s*<td[^>]*>([\d,\.]+)<\/td>/i);
                if (match && match[1]) {
                    return parseFloat(match[1].replace(/,/g, '')) || 0;
                }
                match = html.match(/Tổng cộng:[^<]*<\/td>\s*<td[^>]*>([\d,\.]+)<\/td>/i);
                if (match && match[1]) {
                    return parseFloat(match[1].replace(/,/g, '')) || 0;
                }
            }
        }
    } catch (e) {
        // ignore parsing errors
    }
    return 0;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; border: string }> = {
    DRAFT: { label: 'Bản nháp', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-300' },
    SENT: { label: 'Đã gửi', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
    ACCEPTED: { label: 'Đã duyệt', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
    TO_CONTRACT: { label: 'Lên HĐ', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-300' },
    REJECTED: { label: 'Từ chối', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
    CANCELLED: { label: 'Đã hủy', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' }
};

export function QuoteDashboardClient({ initialData }: { initialData: QuoteWithRelations[] }) {
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = true;
    const canEdit = isAdmin || permissions.includes('QUOTES_EDIT');
    const canDelete = isAdmin || permissions.includes('QUOTES_DELETE');

    const [quotesData, setQuotesData] = useState<QuoteWithRelations[]>(initialData);

    useEffect(() => {
        setQuotesData(initialData);
    }, [initialData]);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
    const [showAnalytics, setShowAnalytics] = useState(true);
    const [quickViewQuote, setQuickViewQuote] = useState<QuoteWithRelations | null>(null);

    // Edit Modal State
    const [editingQuote, setEditingQuote] = useState<QuoteWithRelations | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Sorting
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Copy Feedback
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Summary counts for filter pills
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {
            ALL: quotesData.length,
            DRAFT: 0,
            SENT: 0,
            ACCEPTED: 0,
            TO_CONTRACT: 0,
            FAILED: 0
        };
        quotesData.forEach(q => {
            if (q.status === 'DRAFT') counts.DRAFT++;
            else if (q.status === 'SENT') counts.SENT++;
            else if (q.status === 'ACCEPTED') counts.ACCEPTED++;
            else if (q.status === 'TO_CONTRACT') counts.TO_CONTRACT++;
            else if (q.status === 'REJECTED' || q.status === 'CANCELLED') counts.FAILED++;
        });
        return counts;
    }, [quotesData]);

    // Filtered & Sorted
    const filteredData = useMemo(() => {
        return quotesData.filter(q => {
            const lowerSearch = searchTerm.toLowerCase().trim();
            const matchSearch = !lowerSearch ||
                q.title.toLowerCase().includes(lowerSearch) ||
                (q.customer?.name && q.customer.name.toLowerCase().includes(lowerSearch)) ||
                (q.template?.name && q.template.name.toLowerCase().includes(lowerSearch)) ||
                (q.creator?.name && q.creator.name.toLowerCase().includes(lowerSearch));

            let matchStatus = true;
            if (statusFilter === 'ALL') {
                matchStatus = true;
            } else if (statusFilter === 'FAILED') {
                matchStatus = q.status === 'REJECTED' || q.status === 'CANCELLED';
            } else {
                matchStatus = q.status === statusFilter;
            }

            return matchSearch && matchStatus;
        });
    }, [quotesData, searchTerm, statusFilter]);

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
            } else if (sortField === 'amount') {
                aVal = getQuoteTotal(a);
                bVal = getQuoteTotal(b);
                return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
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

    // --- Pagination Logic ---
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, sortField, sortOrder]);

    const paginatedData = sortedData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Handlers
    const handleDelete = async (id: string) => {
        if (await confirmModal('Bạn có chắc chắn muốn xóa báo giá này?')) {
            setQuotesData(prev => prev.filter(q => q.id !== id));
            await deleteQuote(id);
            router.refresh();
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        setQuotesData(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
        if (quickViewQuote && quickViewQuote.id === id) {
            setQuickViewQuote(prev => prev ? { ...prev, status: newStatus } : null);
        }
        await updateQuoteStatus(id, newStatus);
        router.refresh();
    };

    const handleEditClick = (quote: QuoteWithRelations) => {
        setEditingQuote(quote);
        setEditContent(quote.content);
    };

    const handleSaveQuote = async () => {
        if (!editingQuote) return;
        setIsSaving(true);
        try {
            await updateQuote(editingQuote.id, editContent);
            setEditingQuote(null);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    const handleCopyShareLink = (q: QuoteWithRelations) => {
        const url = `${window.location.origin}/public/quotes/${q.id}`;
        navigator.clipboard.writeText(url);
        setCopiedId(q.id);
        toast.success('Đã sao chép liên kết xem trước cho khách hàng', url);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleExportExcel = (quote: QuoteWithRelations) => {
        try {
            const template = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; }
                        table { border-collapse: collapse; }
                    </style>
                </head>
                <body>
                    ${quote.content}
                </body>
                </html>
            `;

            const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bao_Gia_${quote.customer?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Quote'}_${new Date().getTime()}.xls`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Lỗi xuất Excel:", error);
            toast.error("Đã xảy ra lỗi khi tạo tệp Excel. Vui lòng thử lại.");
        }
    };

    return (
        <div className="space-y-4">
            {/* 1. ERP Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            BÁO GIÁ &amp; THƯƠNG MẠI
                        </span>
                        <span className="text-slate-300 text-xs">|</span>
                        <span className="text-xs font-semibold text-slate-500">Chuẩn quy trình CRM B2B</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                            Quản lý Báo giá
                        </h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono shadow-2xs">
                            {quotesData.length}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Toggle Analytics Insights */}
                    <button
                        type="button"
                        onClick={() => setShowAnalytics(prev => !prev)}
                        className={`inline-flex items-center gap-2 h-[36px] px-3.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                            showAnalytics
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-300 shadow-2xs'
                                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                        }`}
                        title="Bật/Tắt Biểu đồ phân tích"
                    >
                        <BarChart3 size={15} />
                        <span>Biểu đồ phân tích</span>
                        <span className={`w-2 h-2 rounded-full ${showAnalytics ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    </button>

                    {/* Create Quote Button */}
                    {canCreate && (
                        <Link href="/quotes/new">
                            <button
                                type="button"
                                style={{ backgroundColor: '#05A613' }}
                                className="inline-flex items-center gap-2 h-[36px] px-4 text-xs font-bold text-white rounded-lg shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                            >
                                <Plus size={16} className="stroke-[3]" />
                                <span>Tạo Báo Giá</span>
                            </button>
                        </Link>
                    )}
                </div>
            </div>

            {/* 2. Collapsible Visual Analytics Bar (Charts + KPIs) */}
            {showAnalytics && (
                <QuoteAnalyticsBar 
                    quotes={quotesData} 
                    getQuoteTotal={getQuoteTotal} 
                />
            )}

            {/* 3. Main Data Container */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-[380px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Tìm theo tên báo giá, khách hàng, mẫu..."
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

                        {/* View Switcher & Result Count */}
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                                Hiển thị <span className="text-slate-900 font-bold font-mono">{filteredData.length}</span> / {quotesData.length} báo giá
                            </span>

                            <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('table')}
                                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                        viewMode === 'table' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                    title="Chế độ bảng chuẩn"
                                >
                                    <List size={15} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('grid')}
                                    className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                                        viewMode === 'grid' ? 'bg-emerald-50 text-emerald-700 font-bold' : 'text-slate-400 hover:text-slate-700'
                                    }`}
                                    title="Chế độ lưới thẻ (Card View)"
                                >
                                    <LayoutGrid size={15} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Status Filter Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ALL')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                statusFilter === 'ALL'
                                    ? 'bg-slate-900 text-white shadow-2xs'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            Tất cả <span className="font-mono ml-1 font-bold">({statusCounts.ALL})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('ACCEPTED')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                statusFilter === 'ACCEPTED'
                                    ? 'bg-emerald-600 text-white shadow-2xs'
                                    : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                            }`}
                        >
                            Đã Duyệt <span className="font-mono ml-1 font-bold">({statusCounts.ACCEPTED})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('TO_CONTRACT')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                statusFilter === 'TO_CONTRACT'
                                    ? 'bg-purple-600 text-white shadow-2xs'
                                    : 'bg-white text-purple-700 border border-purple-200 hover:bg-purple-50'
                            }`}
                        >
                            Lên Hợp Đồng <span className="font-mono ml-1 font-bold">({statusCounts.TO_CONTRACT})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('SENT')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                statusFilter === 'SENT'
                                    ? 'bg-amber-600 text-white shadow-2xs'
                                    : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
                            }`}
                        >
                            Đã Gửi <span className="font-mono ml-1 font-bold">({statusCounts.SENT})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('DRAFT')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                statusFilter === 'DRAFT'
                                    ? 'bg-slate-600 text-white shadow-2xs'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                            Bản Nháp <span className="font-mono ml-1 font-bold">({statusCounts.DRAFT})</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('FAILED')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                statusFilter === 'FAILED'
                                    ? 'bg-rose-600 text-white shadow-2xs'
                                    : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                            }`}
                        >
                            Từ chối / Hủy <span className="font-mono ml-1 font-bold">({statusCounts.FAILED})</span>
                        </button>
                    </div>
                </div>

                {/* 4. Table View Mode */}
                {viewMode === 'table' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-100/80">
                                    <th 
                                        onClick={() => handleSort('title')} 
                                        className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            TÊN BÁO GIÁ
                                            {sortField === 'title' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th 
                                        onClick={() => handleSort('customerName')} 
                                        className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-200/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            KHÁCH HÀNG
                                            {sortField === 'customerName' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th 
                                        onClick={() => handleSort('templateName')} 
                                        className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[150px] hover:bg-slate-200/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            LOẠI MẪU
                                            {sortField === 'templateName' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th 
                                        onClick={() => handleSort('amount')} 
                                        className="cursor-pointer select-none py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[140px] hover:bg-slate-200/60 transition-colors"
                                    >
                                        <div className="flex items-center justify-end gap-1.5">
                                            TỔNG TIỀN (VNĐ)
                                            {sortField === 'amount' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th 
                                        onClick={() => handleSort('status')} 
                                        className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[130px] hover:bg-slate-200/60 transition-colors"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            TRẠNG THÁI
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
                                            NGÀY TẠO
                                            {sortField === 'createdAt' ? (
                                                sortOrder === 'asc' ? <ChevronUp size={12} className="text-emerald-600 stroke-[3]" /> : <ChevronDown size={12} className="text-emerald-600 stroke-[3]" />
                                            ) : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>

                                    <th className="py-2.5 px-3.5 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[170px]">
                                        THAO TÁC
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedData.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Search size={18} />
                                                </div>
                                                <p className="text-xs font-semibold text-slate-600">Không tìm thấy báo giá nào</p>
                                                <p className="text-[11px] text-slate-400">Thử thay đổi từ khóa hoặc bộ lọc trạng thái</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedData.map(q => {
                                        const total = getQuoteTotal(q);
                                        const isCopied = copiedId === q.id;

                                        return (
                                            <tr key={q.id} className="hover:bg-slate-50/90 transition-colors group">
                                                {/* TÊN BÁO GIÁ */}
                                                <td className="py-2.5 px-3.5 align-middle">
                                                    <div className="flex items-start gap-2">
                                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                                            <FileText size={14} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <button
                                                                type="button"
                                                                onClick={() => setQuickViewQuote(q)}
                                                                className="text-left font-bold text-xs text-slate-900 hover:text-emerald-700 transition-colors truncate block max-w-[280px] sm:max-w-[340px] cursor-pointer"
                                                                title="Nhấn để Xem nhanh"
                                                            >
                                                                {q.title}
                                                            </button>
                                                            {q.creator?.name && (
                                                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                                                    Tạo bởi: {q.creator.name}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* KHÁCH HÀNG */}
                                                <td className="py-2.5 px-3.5 align-middle">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <Building2 size={13} className="text-slate-400 shrink-0" />
                                                        <Link
                                                            href={`/customers/${q.customer?.id}`}
                                                            className="text-xs font-semibold text-slate-800 hover:text-emerald-700 transition-colors truncate max-w-[220px]"
                                                        >
                                                            {q.customer?.name || '--'}
                                                        </Link>
                                                    </div>
                                                </td>

                                                {/* MẪU BIỂU */}
                                                <td className="py-2.5 px-3.5 align-middle">
                                                    <span className="text-xs text-slate-600 truncate block max-w-[140px]">
                                                        {q.template?.name || 'Mặc định'}
                                                    </span>
                                                </td>

                                                {/* TỔNG TIỀN */}
                                                <td className="py-2.5 px-3.5 align-middle text-right">
                                                    <span className="font-mono font-bold text-xs text-slate-900">
                                                        {formatMoney(total)}
                                                    </span>
                                                </td>

                                                {/* TRẠNG THÁI */}
                                                <td className="py-2.5 px-3.5 align-middle">
                                                    <select
                                                        value={q.status}
                                                        onChange={(e) => handleStatusChange(q.id, e.target.value)}
                                                        disabled={!canEdit}
                                                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md border focus:outline-none transition-colors shadow-2xs ${
                                                            q.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                                                            q.status === 'TO_CONTRACT' ? 'bg-purple-50 text-purple-800 border-purple-300' :
                                                            q.status === 'SENT' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                                                            q.status === 'REJECTED' || q.status === 'CANCELLED' ? 'bg-rose-50 text-rose-800 border-rose-300' :
                                                            'bg-slate-50 text-slate-700 border-slate-300'
                                                        } ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-75'}`}
                                                    >
                                                        <option value="DRAFT">Nháp</option>
                                                        <option value="SENT">Đã Gửi</option>
                                                        <option value="ACCEPTED">Đã Duyệt</option>
                                                        <option value="TO_CONTRACT">Lên HĐ</option>
                                                        <option value="REJECTED">Từ Chối</option>
                                                        <option value="CANCELLED">Hủy</option>
                                                    </select>
                                                </td>

                                                {/* NGÀY TẠO */}
                                                <td className="py-2.5 px-3.5 align-middle">
                                                    <span className="text-xs font-mono text-slate-500" suppressHydrationWarning>
                                                        {formatDate(q.createdAt)}
                                                    </span>
                                                </td>

                                                {/* CỤM THAO TÁC */}
                                                <td className="py-2.5 px-3.5 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {/* XEM NHANH (DRAWER) */}
                                                        <button
                                                            type="button"
                                                            onClick={() => setQuickViewQuote(q)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all cursor-pointer shadow-2xs shrink-0"
                                                            title="Xem nhanh Báo giá (trượt từ bên phải)"
                                                        >
                                                            <Eye size={13} />
                                                            <span>Xem nhanh</span>
                                                        </button>

                                                        {/* XEM CHI TIẾT ĐẦY ĐỦ */}
                                                        <Link
                                                            href={`/quotes/${q.id}`}
                                                            target="_blank"
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all shrink-0"
                                                            title="Mở trang chi tiết & in chuẩn A4"
                                                        >
                                                            <ExternalLink size={13} />
                                                            <span>Chi tiết</span>
                                                        </Link>

                                                        {/* COPY LINK XEM TRƯỚC CHO KHÁCH */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCopyShareLink(q)}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                                                            title="Sao chép Link xem trước cho khách"
                                                        >
                                                            {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                        </button>

                                                        {/* XUẤT EXCEL */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExportExcel(q)}
                                                            className="w-7 h-7 rounded-lg flex items-center justify-center text-teal-600 hover:bg-teal-50 transition-colors cursor-pointer"
                                                            title="Xuất Excel"
                                                        >
                                                            <FileSpreadsheet size={15} />
                                                        </button>

                                                        {/* SỬA */}
                                                        {canEdit && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditClick(q)}
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                                                title="Sửa nội dung"
                                                            >
                                                                <Edit size={15} />
                                                            </button>
                                                        )}

                                                        {/* XÓA */}
                                                        {canDelete && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(q.id)}
                                                                className="w-7 h-7 rounded-lg flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                                title="Xóa báo giá"
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

                {/* 5. Card Grid View Mode */}
                {viewMode === 'grid' && (
                    <div className="p-4 bg-slate-50/60">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {paginatedData.map(q => {
                                const total = getQuoteTotal(q);
                                const isCopied = copiedId === q.id;

                                return (
                                    <div
                                        key={q.id}
                                        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setQuickViewQuote(q)}
                                                    className="text-left font-bold text-xs text-slate-900 hover:text-emerald-700 transition-colors line-clamp-2 cursor-pointer"
                                                >
                                                    {q.title}
                                                </button>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                                    q.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                                                    q.status === 'TO_CONTRACT' ? 'bg-purple-100 text-purple-800' :
                                                    q.status === 'SENT' ? 'bg-amber-100 text-amber-800' :
                                                    q.status === 'REJECTED' || q.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {q.status}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-slate-600">
                                                <Building2 size={13} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{q.customer?.name || '--'}</span>
                                            </div>
                                        </div>

                                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-1 text-xs">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 text-[11px]">Tổng giá trị:</span>
                                                <span className="font-mono font-bold text-emerald-700">{formatMoney(total)}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400 text-[11px]">Ngày tạo:</span>
                                                <span className="font-mono text-slate-600">{formatDate(q.createdAt)}</span>
                                            </div>
                                        </div>

                                        {/* Card Actions */}
                                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setQuickViewQuote(q)}
                                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                                            >
                                                <Eye size={14} />
                                                <span>Xem nhanh</span>
                                            </button>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleCopyShareLink(q)}
                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100"
                                                    title="Copy link"
                                                >
                                                    {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                </button>
                                                <Link
                                                    href={`/quotes/${q.id}`}
                                                    target="_blank"
                                                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100"
                                                    title="Mở bản in A4"
                                                >
                                                    <Printer size={14} />
                                                </Link>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditClick(q)}
                                                        className="w-7 h-7 rounded-md flex items-center justify-center text-amber-600 hover:bg-amber-50"
                                                        title="Sửa"
                                                    >
                                                        <Edit size={14} />
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

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 border-t border-slate-200 bg-slate-50/50 gap-2">
                        <div className="text-xs text-slate-500">
                            Hiển thị <span className="font-semibold text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-slate-800">{Math.min(currentPage * itemsPerPage, sortedData.length)}</span> trên <span className="font-semibold text-slate-800">{sortedData.length}</span> báo giá
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                Trước
                            </button>

                            {Array.from({ length: totalPages }).map((_, i) => {
                                const page = i + 1;
                                if (totalPages > 7) {
                                    if (page !== 1 && page !== totalPages && Math.abs(page - currentPage) > 1) {
                                        if (page === 2 || page === totalPages - 1) {
                                            return <span key={page} className="px-1.5 text-xs text-slate-400">...</span>;
                                        }
                                        return null;
                                    }
                                }
                                return (
                                    <button
                                        key={page}
                                        type="button"
                                        className={`w-7 h-7 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                                            currentPage === page
                                                ? 'bg-emerald-600 text-white shadow-2xs'
                                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                        }`}
                                        onClick={() => setCurrentPage(page)}
                                    >
                                        {page}
                                    </button>
                                );
                            })}

                            <button
                                type="button"
                                className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            >
                                Sau
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* 6. Quick View Drawer (Xem nhanh Báo giá) */}
            <QuoteQuickViewDrawer
                isOpen={!!quickViewQuote}
                onClose={() => setQuickViewQuote(null)}
                quote={quickViewQuote}
                getQuoteTotal={getQuoteTotal}
                onStatusChange={handleStatusChange}
                onEdit={handleEditClick}
                onExportExcel={handleExportExcel}
                canEdit={canEdit}
            />

            {/* 7. Modal Chỉnh Sửa Nội Dung Báo Giá */}
            <Modal
                isOpen={!!editingQuote}
                onClose={() => setEditingQuote(null)}
                title={`Sửa báo giá: ${editingQuote?.title || ''}`}
                maxWidth="1000px"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-xs text-slate-500">
                        Khách hàng: <strong className="text-slate-800">{editingQuote?.customer?.name}</strong>
                    </p>
                    <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder="Nội dung báo giá..."
                    />
                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                        <Button variant="secondary" onClick={() => setEditingQuote(null)}>Hủy</Button>
                        <Button onClick={handleSaveQuote} disabled={isSaving}>
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

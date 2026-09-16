'use client'

import React, { useState, useTransition, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { 
    Plus, Search, Filter, Printer, Download, Trash2, 
    ArrowUpRight, ArrowDownRight, Wallet, Calendar, Building2, User, 
    CheckCircle2, RefreshCw, FileSpreadsheet, Eye, Share2, Check, ExternalLink,
    ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import { getCashTransactions, deleteCashTransaction } from '../actions';
import CreateTransactionModal from './CreateTransactionModal';
import PrintTransactionModal from './PrintTransactionModal';

type CashBookSortField = 'code' | 'date' | 'type' | 'payerReceiver' | 'reason' | 'account' | 'partner' | 'amount';
type SortOrder = 'asc' | 'desc';

interface Props {
    initialData: {
        transactions: any[];
        accounts: any[];
        customers: any[];
        suppliers: any[];
        projects: any[];
    };
    companyInfo?: {
        name?: string;
        fullName?: string;
        displayName?: string;
        taxCode?: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
        logo?: string;
    };
}

export default function CashBookClient({ initialData, companyInfo }: Props) {
    const searchParams = useSearchParams();
    const actionParam = searchParams.get('action');
    const typeParam = searchParams.get('type') || 'ALL';

    const [data, setData] = useState(initialData);
    const [typeFilter, setTypeFilter] = useState<string>(typeParam);
    const [accountFilter, setAccountFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Sorting state
    const [sortField, setSortField] = useState<CashBookSortField>('date');
    const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

    const [isPending, startTransition] = useTransition();

    // Modals
    const [showCreateModal, setShowCreateModal] = useState<boolean>(actionParam === 'receipt' || actionParam === 'payment');
    const [createType, setCreateType] = useState<'RECEIPT' | 'PAYMENT'>(actionParam === 'payment' ? 'PAYMENT' : 'RECEIPT');
    const [selectedPrintTx, setSelectedPrintTx] = useState<any | null>(null);
    const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

    const handleSort = (field: CashBookSortField) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const renderSortIcon = (field: CashBookSortField) => {
        if (sortField !== field) {
            return <ArrowUpDown size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />;
        }
        return sortOrder === 'asc' 
            ? <ArrowUp size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-bold" />
            : <ArrowDown size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0 font-bold" />;
    };

    const handleCopyLink = async (txId: string) => {
        const url = `${window.location.origin}/public/accounting/transactions/${txId}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopiedTxId(txId);
            setTimeout(() => setCopiedTxId(null), 2000);
        } catch (e) {
            alert(`Link: ${url}`);
        }
    };

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const loadData = () => {
        startTransition(async () => {
            const res = await getCashTransactions({
                type: typeFilter,
                financeAccountId: accountFilter,
                category: categoryFilter,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                search: searchQuery || undefined
            });
            setData(res);
        });
    };

    const handleDelete = async (id: string, code: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa chứng từ ${code}? Số dư tài khoản/quỹ sẽ được tự động hoàn lại tương ứng.`)) {
            return;
        }

        try {
            await deleteCashTransaction(id);
            loadData();
        } catch (err: any) {
            alert('Lỗi khi xóa chứng từ: ' + err.message);
        }
    };

    // Calculate Summary for filtered transactions
    const summary = useMemo(() => {
        let totalReceipt = 0;
        let totalPayment = 0;
        data.transactions.forEach(tx => {
            if (tx.type === 'RECEIPT') totalReceipt += tx.amount;
            if (tx.type === 'PAYMENT') totalPayment += tx.amount;
        });
        return {
            totalReceipt,
            totalPayment,
            netDifference: totalReceipt - totalPayment,
            count: data.transactions.length
        };
    }, [data.transactions]);

    // Sorted Transactions
    const sortedTransactions = useMemo(() => {
        return [...data.transactions].sort((a, b) => {
            let valA: any;
            let valB: any;

            switch (sortField) {
                case 'code':
                    valA = a.code || '';
                    valB = b.code || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'date':
                    valA = new Date(a.transactionDate).getTime();
                    valB = new Date(b.transactionDate).getTime();
                    return sortOrder === 'asc' ? valA - valB : valB - valA;
                case 'type':
                    valA = a.type || '';
                    valB = b.type || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                case 'payerReceiver':
                    valA = a.payerReceiver || '';
                    valB = b.payerReceiver || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB, 'vi') : valB.localeCompare(valA, 'vi');
                case 'reason':
                    valA = a.reason || '';
                    valB = b.reason || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB, 'vi') : valB.localeCompare(valA, 'vi');
                case 'account':
                    valA = a.financeAccount?.name || '';
                    valB = b.financeAccount?.name || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB, 'vi') : valB.localeCompare(valA, 'vi');
                case 'partner':
                    valA = a.customer?.name || a.supplier?.name || '';
                    valB = b.customer?.name || b.supplier?.name || '';
                    return sortOrder === 'asc' ? valA.localeCompare(valB, 'vi') : valB.localeCompare(valA, 'vi');
                case 'amount':
                    valA = Number(a.amount || 0);
                    valB = Number(b.amount || 0);
                    return sortOrder === 'asc' ? valA - valB : valB - valA;
                default:
                    return 0;
            }
        });
    }, [data.transactions, sortField, sortOrder]);

    // Export Excel
    const handleExportExcel = () => {
        const rows = sortedTransactions.map((tx, idx) => ({
            'STT': idx + 1,
            'Mã chứng từ': tx.code,
            'Loại chứng từ': tx.type === 'RECEIPT' ? 'Phiếu Thu' : 'Phiếu Chi',
            'Ngày lập': new Date(tx.transactionDate).toLocaleDateString('vi-VN'),
            'Người nộp / nhận': tx.payerReceiver,
            'Điện thoại': tx.phone || '',
            'Địa chỉ': tx.address || '',
            'Lý do / Nội dung': tx.reason || '',
            'Hình thức TT': tx.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
            'Tài khoản / Quỹ': tx.financeAccount?.name || 'Tiền mặt',
            'Đối tác liên quan': tx.customer?.name || tx.supplier?.name || '',
            'Dự án': tx.project?.name || '',
            'Thu (VNĐ)': tx.type === 'RECEIPT' ? tx.amount : 0,
            'Chi (VNĐ)': tx.type === 'PAYMENT' ? tx.amount : 0,
            'Người tạo': tx.createdBy?.name || '',
            'Ghi chú': tx.notes || ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'So_Quy_Thu_Chi');
        XLSX.writeFile(wb, `So_Quy_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6 w-full pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Sổ Quỹ Thu - Chi Tiền Mặt & Ngân Hàng
                            </h1>
                            <p className="text-xs text-slate-500">
                                Quản lý Phiếu Thu, Phiếu Chi, in chứng từ chuẩn mẫu và đối soát dòng tiền
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Xuất Excel</span>
                    </button>

                    <button
                        onClick={() => {
                            setCreateType('RECEIPT');
                            setShowCreateModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+ Lập Phiếu Thu (PT)</span>
                    </button>

                    <button
                        onClick={() => {
                            setCreateType('PAYMENT');
                            setShowCreateModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition active:scale-95"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>- Lập Phiếu Chi (PC)</span>
                    </button>
                </div>
            </div>

            {/* Filter Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng Thu Đợt Này</div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            +{formatVND(summary.totalReceipt)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                        <ArrowDownRight className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng Chi Đợt Này</div>
                        <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                            -{formatVND(summary.totalPayment)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center shrink-0">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Chênh Lệch Thu - Chi</div>
                        <div className={`text-xl sm:text-2xl font-black mt-1 ${summary.netDifference >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {summary.netDifference >= 0 ? '+' : ''}{formatVND(summary.netDifference)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Wallet className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadData()}
                            placeholder="Tìm mã, người nộp/nhận..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Type Filter */}
                    <div>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="ALL">-- Tất cả loại phiếu --</option>
                            <option value="RECEIPT">Phiếu Thu (PT)</option>
                            <option value="PAYMENT">Phiếu Chi (PC)</option>
                        </select>
                    </div>

                    {/* Account Filter */}
                    <div>
                        <select
                            value={accountFilter}
                            onChange={(e) => {
                                setAccountFilter(e.target.value);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="ALL">-- Tất cả tài khoản / quỹ --</option>
                            {data.accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* End Date & Filter Action */}
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                            onClick={loadData}
                            disabled={isPending}
                            className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center shrink-0 cursor-pointer"
                            title="Áp dụng bộ lọc"
                        >
                            {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden w-full">
                <div className="overflow-x-auto w-full">
                    <table className="w-full min-w-[850px] text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-100 dark:border-slate-800 select-none">
                            <tr>
                                <th onClick={() => handleSort('code')} className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <div className="flex items-center gap-1.5">
                                        <span>Mã Phiếu</span>
                                        {renderSortIcon('code')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('date')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <div className="flex items-center gap-1.5">
                                        <span>Ngày Lập</span>
                                        {renderSortIcon('date')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('type')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <div className="flex items-center gap-1.5">
                                        <span>Loại Phiếu</span>
                                        {renderSortIcon('type')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('payerReceiver')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <div className="flex items-center gap-1.5">
                                        <span>Người Nộp / Nhận</span>
                                        {renderSortIcon('payerReceiver')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('reason')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <div className="flex items-center gap-1.5">
                                        <span>Lý Do / Nội Dung</span>
                                        {renderSortIcon('reason')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('account')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <div className="flex items-center gap-1.5">
                                        <span>Tài Khoản / Quỹ</span>
                                        {renderSortIcon('account')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('partner')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <div className="flex items-center gap-1.5">
                                        <span>Dự Án / Đối Tác</span>
                                        {renderSortIcon('partner')}
                                    </div>
                                </th>
                                <th onClick={() => handleSort('amount')} className="py-3 px-4 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition">
                                    <div className="flex items-center justify-end gap-1.5">
                                        <span>Số Tiền (VNĐ)</span>
                                        {renderSortIcon('amount')}
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {sortedTransactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group">
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                        {tx.code}
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                        {new Date(tx.transactionDate).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="py-3.5 px-3 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            tx.type === 'RECEIPT' 
                                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' 
                                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                        }`}>
                                            {tx.type === 'RECEIPT' ? 'Phiếu Thu' : 'Phiếu Chi'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                        <div>{tx.payerReceiver}</div>
                                        {tx.phone && <div className="text-[10px] text-slate-400">{tx.phone}</div>}
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate" title={tx.reason}>
                                        {tx.reason || '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                                        {tx.financeAccount?.name || 'Tiền mặt'}
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-500 text-[11px] max-w-[160px] truncate" title={tx.customer?.name || tx.supplier?.name || tx.project?.name}>
                                        {tx.customer?.name || tx.supplier?.name || tx.project?.name || '—'}
                                    </td>
                                    <td className={`py-3.5 px-4 text-right font-black text-sm whitespace-nowrap ${
                                        tx.type === 'RECEIPT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {tx.type === 'RECEIPT' ? '+' : '-'}{formatVND(tx.amount)}
                                    </td>
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => handleCopyLink(tx.id)}
                                                className={`p-1.5 rounded-lg transition cursor-pointer ${
                                                    copiedTxId === tx.id 
                                                        ? 'text-white bg-emerald-600' 
                                                        : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50'
                                                }`}
                                                title="Sao chép link gửi khách hàng ký online"
                                            >
                                                {copiedTxId === tx.id ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                                            </button>
                                            <button
                                                onClick={() => setSelectedPrintTx(tx)}
                                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition cursor-pointer"
                                                title="In phiếu A4/A5 hoặc xem ký online"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tx.id, tx.code)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                                                title="Xóa chứng từ"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {sortedTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                                        Không tìm thấy chứng từ thu / chi nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Transaction Modal */}
            {showCreateModal && (
                <CreateTransactionModal
                    initialType={createType}
                    accounts={data.accounts}
                    customers={data.customers}
                    suppliers={data.suppliers}
                    projects={data.projects}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadData();
                    }}
                />
            )}

            {/* Print Voucher Modal */}
            {selectedPrintTx && (
                <PrintTransactionModal
                    transaction={selectedPrintTx}
                    companyInfo={companyInfo}
                    onClose={() => setSelectedPrintTx(null)}
                />
            )}
        </div>
    );
}

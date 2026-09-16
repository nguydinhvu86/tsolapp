'use client'

import React, { useState, useTransition, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
    Users, Building2, Search, Filter, Printer, Download, 
    AlertCircle, CheckCircle2, Clock, ArrowRight, FileSpreadsheet, 
    ChevronDown, ChevronRight, RefreshCw, Scale, ArrowUpDown, ArrowUp, ArrowDown,
    Calendar, X
} from 'lucide-react';
import PrintDebtStatementModal from './PrintDebtStatementModal';
import { getDebtOverviewData } from '../actions';

type SortOption = 
    | 'DEBT_DESC' 
    | 'DEBT_ASC' 
    | 'OVERDUE_DESC' 
    | 'OVERDUE_ASC'
    | 'NAME_ASC' 
    | 'NAME_DESC' 
    | 'CODE_ASC' 
    | 'CODE_DESC'
    | 'TOTAL_DESC' 
    | 'TOTAL_ASC'
    | 'PAID_DESC'
    | 'PAID_ASC'
    | 'INDUE_DESC'
    | 'INDUE_ASC'
    | 'O1_DESC'
    | 'O1_ASC'
    | 'O2_DESC'
    | 'O2_ASC';

type DatePreset = 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_QUARTER' | 'THIS_YEAR' | 'CUSTOM';

interface Props {
    initialData: {
        customerDebts: any[];
        supplierDebts: any[];
    };
    initialTab?: 'customers' | 'suppliers';
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
    initialStartDate?: string;
    initialEndDate?: string;
}

export default function DebtClient({ 
    initialData, 
    initialTab = 'customers', 
    companyInfo,
    initialStartDate = '',
    initialEndDate = ''
}: Props) {
    const [tab, setTab] = useState<'customers' | 'suppliers'>(initialTab);
    const [data, setData] = useState(initialData);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false);
    const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
    const [isPending, startTransition] = useTransition();

    // Sorting State
    const [sortBy, setSortBy] = useState<SortOption>('DEBT_DESC');

    // Date Range & Preset State
    const [datePreset, setDatePreset] = useState<DatePreset>(
        initialStartDate || initialEndDate ? 'CUSTOM' : 'ALL'
    );
    const [startDate, setStartDate] = useState<string>(initialStartDate);
    const [endDate, setEndDate] = useState<string>(initialEndDate);

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const formatDateVN = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    // Calculate presets
    const handlePresetChange = (preset: DatePreset) => {
        setDatePreset(preset);
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed

        let start = '';
        let end = '';

        if (preset === 'THIS_MONTH') {
            start = new Date(year, month, 1).toISOString().split('T')[0];
            end = new Date(year, month + 1, 0).toISOString().split('T')[0];
        } else if (preset === 'LAST_MONTH') {
            start = new Date(year, month - 1, 1).toISOString().split('T')[0];
            end = new Date(year, month, 0).toISOString().split('T')[0];
        } else if (preset === 'THIS_QUARTER') {
            const quarter = Math.floor(month / 3);
            start = new Date(year, quarter * 3, 1).toISOString().split('T')[0];
            end = new Date(year, (quarter + 1) * 3, 0).toISOString().split('T')[0];
        } else if (preset === 'THIS_YEAR') {
            start = new Date(year, 0, 1).toISOString().split('T')[0];
            end = new Date(year, 11, 31).toISOString().split('T')[0];
        } else if (preset === 'ALL') {
            start = '';
            end = '';
        }

        setStartDate(start);
        setEndDate(end);

        // Fetch data automatically for presets
        startTransition(async () => {
            const res = await getDebtOverviewData({ startDate: start, endDate: end });
            setData(res);
        });
    };

    const handleApplyDateFilter = () => {
        setDatePreset('CUSTOM');
        startTransition(async () => {
            const res = await getDebtOverviewData({ startDate, endDate });
            setData(res);
        });
    };

    const handleResetDateFilter = () => {
        setDatePreset('ALL');
        setStartDate('');
        setEndDate('');
        startTransition(async () => {
            const res = await getDebtOverviewData();
            setData(res);
        });
    };

    const handleRefresh = () => {
        startTransition(async () => {
            const res = await getDebtOverviewData({ startDate, endDate });
            setData(res);
        });
    };

    // Current partners list according to tab
    const currentList = tab === 'customers' ? data.customerDebts : data.supplierDebts;

    // Filter and Sort
    const filteredList = useMemo(() => {
        let list = currentList.filter(item => {
            if (filterOverdueOnly && (item.totalOverdue || 0) <= 0) return false;
            if (searchQuery) {
                const s = searchQuery.toLowerCase();
                return (
                    item.name.toLowerCase().includes(s) ||
                    item.code.toLowerCase().includes(s) ||
                    item.phone?.toLowerCase().includes(s) ||
                    item.taxCode?.toLowerCase().includes(s)
                );
            }
            return true;
        });

        // Apply Sorting
        list = [...list].sort((a, b) => {
            const totalA = tab === 'customers' ? (a.totalInvoiced || 0) : (a.totalBilled || 0);
            const totalB = tab === 'customers' ? (b.totalInvoiced || 0) : (b.totalBilled || 0);
            const over60A = (a.overdue61to90 || 0) + (a.overdueOver90 || 0);
            const over60B = (b.overdue61to90 || 0) + (b.overdueOver90 || 0);

            switch (sortBy) {
                case 'DEBT_DESC':
                    return (b.currentDebt || 0) - (a.currentDebt || 0);
                case 'DEBT_ASC':
                    return (a.currentDebt || 0) - (b.currentDebt || 0);
                case 'OVERDUE_DESC':
                    return over60B - over60A;
                case 'OVERDUE_ASC':
                    return over60A - over60B;
                case 'NAME_ASC':
                    return (a.name || '').localeCompare(b.name || '', 'vi');
                case 'NAME_DESC':
                    return (b.name || '').localeCompare(a.name || '', 'vi');
                case 'CODE_ASC':
                    return (a.code || '').localeCompare(b.code || '', 'vi');
                case 'CODE_DESC':
                    return (b.code || '').localeCompare(a.code || '', 'vi');
                case 'TOTAL_DESC':
                    return totalB - totalA;
                case 'TOTAL_ASC':
                    return totalA - totalB;
                case 'PAID_DESC':
                    return (b.totalPaid || 0) - (a.totalPaid || 0);
                case 'PAID_ASC':
                    return (a.totalPaid || 0) - (b.totalPaid || 0);
                case 'INDUE_DESC':
                    return (b.inDue || 0) - (a.inDue || 0);
                case 'INDUE_ASC':
                    return (a.inDue || 0) - (b.inDue || 0);
                case 'O1_DESC':
                    return (b.overdue1to30 || 0) - (a.overdue1to30 || 0);
                case 'O1_ASC':
                    return (a.overdue1to30 || 0) - (b.overdue1to30 || 0);
                case 'O2_DESC':
                    return (b.overdue31to60 || 0) - (a.overdue31to60 || 0);
                case 'O2_ASC':
                    return (a.overdue31to60 || 0) - (b.overdue31to60 || 0);
                default:
                    return 0;
            }
        });

        return list;
    }, [currentList, filterOverdueOnly, searchQuery, sortBy, tab]);

    // Summary calculations
    const summary = useMemo(() => {
        let totalDebt = 0;
        let totalOverdue = 0;
        let inDue = 0;
        let aging1to30 = 0;
        let aging31to60 = 0;
        let aging61to90 = 0;
        let agingOver90 = 0;

        currentList.forEach(item => {
            totalDebt += item.currentDebt || 0;
            totalOverdue += item.totalOverdue || 0;
            inDue += item.inDue || 0;
            aging1to30 += item.overdue1to30 || 0;
            aging31to60 += item.overdue31to60 || 0;
            aging61to90 += item.overdue61to90 || 0;
            agingOver90 += item.overdueOver90 || 0;
        });

        return {
            totalDebt,
            totalOverdue,
            inDue,
            aging1to30,
            aging31to60,
            aging61to90,
            agingOver90,
            count: currentList.length
        };
    }, [currentList]);

    // Toggle header sort helper
    const handleColumnSort = (field: string) => {
        switch (field) {
            case 'code':
                setSortBy(prev => prev === 'CODE_ASC' ? 'CODE_DESC' : 'CODE_ASC');
                break;
            case 'name':
                setSortBy(prev => prev === 'NAME_ASC' ? 'NAME_DESC' : 'NAME_ASC');
                break;
            case 'total':
                setSortBy(prev => prev === 'TOTAL_DESC' ? 'TOTAL_ASC' : 'TOTAL_DESC');
                break;
            case 'paid':
                setSortBy(prev => prev === 'PAID_DESC' ? 'PAID_ASC' : 'PAID_DESC');
                break;
            case 'debt':
                setSortBy(prev => prev === 'DEBT_DESC' ? 'DEBT_ASC' : 'DEBT_DESC');
                break;
            case 'inDue':
                setSortBy(prev => prev === 'INDUE_DESC' ? 'INDUE_ASC' : 'INDUE_DESC');
                break;
            case 'o1':
                setSortBy(prev => prev === 'O1_DESC' ? 'O1_ASC' : 'O1_DESC');
                break;
            case 'o2':
                setSortBy(prev => prev === 'O2_DESC' ? 'O2_ASC' : 'O2_DESC');
                break;
            case 'overdue':
                setSortBy(prev => prev === 'OVERDUE_DESC' ? 'OVERDUE_ASC' : 'OVERDUE_DESC');
                break;
        }
    };

    const handleExportExcel = () => {
        const rows = filteredList.map((item, idx) => ({
            'STT': idx + 1,
            'Mã đối tác': item.code,
            'Tên đối tác': item.name,
            'Số điện thoại': item.phone || '',
            'Địa chỉ': item.address || '',
            'Tổng doanh số / Hóa đơn': tab === 'customers' ? item.totalInvoiced : item.totalBilled,
            'Đã thanh toán': item.totalPaid,
            'Công nợ hiện tại': item.currentDebt,
            'Trong hạn': item.inDue,
            'Quá hạn 1-30 ngày': item.overdue1to30,
            'Quá hạn 31-60 ngày': item.overdue31to60,
            'Quá hạn 61-90 ngày': item.overdue61to90,
            'Quá hạn >90 ngày': item.overdueOver90,
            'Tổng nợ quá hạn': item.totalOverdue
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        const sheetName = tab === 'customers' ? 'Cong_No_Phai_Thu_AR' : 'Cong_No_Phai_Tra_AP';
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // Label describing active reconciliation period
    const activePeriodLabel = useMemo(() => {
        if (!startDate && !endDate) {
            return 'Toàn bộ thời gian (Tất cả chứng từ)';
        }
        if (startDate && endDate) {
            return `Từ ngày ${formatDateVN(startDate)} đến ngày ${formatDateVN(endDate)}`;
        }
        if (startDate) {
            return `Từ ngày ${formatDateVN(startDate)} trở đi`;
        }
        return `Tính đến ngày ${formatDateVN(endDate)}`;
    }, [startDate, endDate]);

    return (
        <div className="space-y-6 w-full mx-auto pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Quản Lý Công Nợ Toàn Diện
                            </h1>
                            <p className="text-xs text-slate-500">
                                Theo dõi công nợ Phải Thu (Khách Hàng) & Phải Trả (Nhà Cung Cấp), phân tích tuổi nợ và in biên bản đối chiếu
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-blue-500' : ''}`} />
                    </button>

                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Xuất Excel Báo Cáo
                    </button>
                </div>
            </div>

            {/* Tab Switcher: Khách Hàng (AR) vs Nhà Cung Cấp (AP) */}
            <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-md">
                <button
                    onClick={() => setTab('customers')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                        tab === 'customers'
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Users className="w-4 h-4" />
                    Khách Hàng - Phải Thu (AR)
                </button>
                <button
                    onClick={() => setTab('suppliers')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                        tab === 'suppliers'
                            ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                >
                    <Building2 className="w-4 h-4" />
                    Nhà Cung Cấp - Phải Trả (AP)
                </button>
            </div>

            {/* 4 Summary Aging Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Tổng Công Nợ */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="text-xs font-semibold text-slate-500 uppercase">
                        {tab === 'customers' ? 'Tổng Phải Thu (AR)' : 'Tổng Phải Trả (AP)'}
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                        {formatVND(summary.totalDebt)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        Tổng {summary.count} đối tác đang có số dư công nợ
                    </div>
                </div>

                {/* 2. Trong Hạn */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="text-xs font-semibold text-emerald-600 uppercase">
                        Nợ Trong Hạn
                    </div>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                        {formatVND(summary.inDue)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        Chưa tới ngày đến hạn thanh toán
                    </div>
                </div>

                {/* 3. Nợ Quá Hạn */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="text-xs font-semibold text-rose-600 uppercase flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Tổng Nợ Quá Hạn
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                        {formatVND(summary.totalOverdue)}
                    </div>
                    <div className="text-[11px] text-rose-500 mt-1">
                        Cần liên hệ đối soát & đôn đốc thanh toán
                    </div>
                </div>

                {/* 4. Quá Hạn Trên 60 Ngày */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="text-xs font-semibold text-amber-600 uppercase">
                        Nợ Khó Đòi (&gt;60 Ngày)
                    </div>
                    <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                        {formatVND(summary.aging61to90 + summary.agingOver90)}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                        Quá hạn trên 60 - 90 ngày
                    </div>
                </div>
            </div>

            {/* Reconciliation Period & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                {/* Period Selector (Khoảng thời gian đối chiếu) */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shrink-0">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            Kỳ Đối Chiếu:
                        </span>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl flex-wrap">
                            <button
                                onClick={() => handlePresetChange('ALL')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                    datePreset === 'ALL'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Tất Cả
                            </button>
                            <button
                                onClick={() => handlePresetChange('THIS_MONTH')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                    datePreset === 'THIS_MONTH'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Tháng Này
                            </button>
                            <button
                                onClick={() => handlePresetChange('LAST_MONTH')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                    datePreset === 'LAST_MONTH'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Tháng Trước
                            </button>
                            <button
                                onClick={() => handlePresetChange('THIS_QUARTER')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                    datePreset === 'THIS_QUARTER'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Quý Này
                            </button>
                            <button
                                onClick={() => handlePresetChange('THIS_YEAR')}
                                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                                    datePreset === 'THIS_YEAR'
                                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Năm Nay
                            </button>
                        </div>
                    </div>

                    {/* Custom Date Range Picker */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <span>Từ</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDatePreset('CUSTOM');
                                }}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                            <span>Đến</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDatePreset('CUSTOM');
                                }}
                                className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button
                            onClick={handleApplyDateFilter}
                            disabled={isPending}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                        >
                            Lọc Kỳ
                        </button>

                        {(startDate || endDate) && (
                            <button
                                onClick={handleResetDateFilter}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                                title="Xóa lọc thời gian"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Search & Sort Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                    {/* Search Box */}
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Tìm tên đối tác, mã, SĐT, MST..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap justify-between sm:justify-end">
                        {/* Sort Selector */}
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="hidden sm:inline">Sắp xếp:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="DEBT_DESC">Công nợ: Cao nhất ➔ Thấp nhất</option>
                                <option value="DEBT_ASC">Công nợ: Thấp nhất ➔ Cao nhất</option>
                                <option value="OVERDUE_DESC">Nợ quá hạn &gt;60 ngày: Nhiều nhất</option>
                                <option value="NAME_ASC">Tên đối tác: A ➔ Z</option>
                                <option value="NAME_DESC">Tên đối tác: Z ➔ A</option>
                                <option value="CODE_ASC">Mã đối tác: A ➔ Z</option>
                                <option value="TOTAL_DESC">Tổng doanh số: Cao nhất</option>
                                <option value="TOTAL_ASC">Tổng doanh số: Thấp nhất</option>
                                <option value="PAID_DESC">Đã thanh toán: Nhiều nhất</option>
                            </select>
                        </div>

                        {/* Overdue Checkbox */}
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filterOverdueOnly}
                                onChange={(e) => setFilterOverdueOnly(e.target.checked)}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <span>Chỉ xem nợ quá hạn</span>
                        </label>
                    </div>
                </div>

                {/* Active Period Alert Bar */}
                <div className="flex items-center justify-between px-3 py-2 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                    <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>Kỳ đối chiếu đang xem: <strong>{activePeriodLabel}</strong></span>
                    </div>
                    <span className="font-semibold text-[11px] text-blue-600 dark:text-blue-400">
                        Hiển thị {filteredList.length} / {currentList.length} đối tác
                    </span>
                </div>
            </div>

            {/* Debts Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-xs min-w-[980px]">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800 select-none">
                            <tr>
                                <th 
                                    onClick={() => handleColumnSort('code')}
                                    className="py-3 px-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Mã"
                                >
                                    <div className="flex items-center gap-1">
                                        <span>Mã</span>
                                        {sortBy === 'CODE_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-blue-600" />
                                        ) : sortBy === 'CODE_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-blue-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleColumnSort('name')}
                                    className="py-3 px-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Tên Đối Tác"
                                >
                                    <div className="flex items-center gap-1">
                                        <span>Tên Đối Tác</span>
                                        {sortBy === 'NAME_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-blue-600" />
                                        ) : sortBy === 'NAME_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-blue-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleColumnSort('total')}
                                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Tổng Doanh Số"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span>Tổng Doanh Số</span>
                                        {sortBy === 'TOTAL_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-blue-600" />
                                        ) : sortBy === 'TOTAL_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-blue-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleColumnSort('paid')}
                                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Đã Thanh Toán"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span>Đã Thanh Toán</span>
                                        {sortBy === 'PAID_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-blue-600" />
                                        ) : sortBy === 'PAID_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-blue-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleColumnSort('debt')}
                                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Công Nợ Hiện Tại"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span>Công Nợ Hiện Tại</span>
                                        {sortBy === 'DEBT_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-blue-600" />
                                        ) : sortBy === 'DEBT_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-blue-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleColumnSort('inDue')}
                                    className="py-3 px-3 text-right text-emerald-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Nợ Trong Hạn"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span>Trong Hạn</span>
                                        {sortBy === 'INDUE_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-emerald-600" />
                                        ) : sortBy === 'INDUE_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-emerald-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleColumnSort('o1')}
                                    className="py-3 px-3 text-right text-amber-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Quá Hạn 1-30 Ngày"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span>1 - 30 Ngày</span>
                                        {sortBy === 'O1_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-amber-600" />
                                        ) : sortBy === 'O1_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-amber-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleColumnSort('o2')}
                                    className="py-3 px-3 text-right text-orange-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Quá Hạn 31-60 Ngày"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span>31 - 60 Ngày</span>
                                        {sortBy === 'O2_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-orange-600" />
                                        ) : sortBy === 'O2_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-orange-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th 
                                    onClick={() => handleColumnSort('overdue')}
                                    className="py-3 px-3 text-right text-rose-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                    title="Nhấn để sắp xếp theo Nợ Quá Hạn >60 Ngày"
                                >
                                    <div className="flex items-center justify-end gap-1">
                                        <span>&gt; 60 Ngày</span>
                                        {sortBy === 'OVERDUE_DESC' ? (
                                            <ArrowDown className="w-3 h-3 text-rose-600" />
                                        ) : sortBy === 'OVERDUE_ASC' ? (
                                            <ArrowUp className="w-3 h-3 text-rose-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300" />
                                        )}
                                    </div>
                                </th>
                                <th className="py-3 px-4 text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredList.map((partner: any) => (
                                <tr key={partner.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                        {partner.code}
                                    </td>
                                    <td className="py-3.5 px-3">
                                        <div className="font-bold text-slate-900 dark:text-white">{partner.name}</div>
                                        <div className="text-[11px] text-slate-400">{partner.phone || partner.taxCode || '—'}</div>
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                        {formatVND(tab === 'customers' ? partner.totalInvoiced : partner.totalBilled)}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                                        {formatVND(partner.totalPaid)}
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-black text-sm text-slate-900 dark:text-white whitespace-nowrap">
                                        {formatVND(partner.currentDebt)}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-emerald-600 font-medium whitespace-nowrap">
                                        {partner.inDue > 0 ? formatVND(partner.inDue) : '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-amber-600 font-medium whitespace-nowrap">
                                        {partner.overdue1to30 > 0 ? formatVND(partner.overdue1to30) : '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-orange-600 font-medium whitespace-nowrap">
                                        {partner.overdue31to60 > 0 ? formatVND(partner.overdue31to60) : '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-rose-600 font-bold whitespace-nowrap">
                                        {(partner.overdue61to90 + partner.overdueOver90) > 0 
                                            ? formatVND(partner.overdue61to90 + partner.overdueOver90) 
                                            : '—'}
                                    </td>
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <button
                                            onClick={() => setSelectedPartner(partner)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition border border-blue-200/60 dark:border-blue-800 shadow-sm hover:shadow"
                                            title="In biên bản đối chiếu công nợ"
                                        >
                                            <Printer className="w-3.5 h-3.5" />
                                            Đối Chiếu Nợ
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {filteredList.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="py-12 text-center text-slate-400 text-xs">
                                        Không tìm thấy dữ liệu công nợ phù hợp trong kỳ đã chọn.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Print Debt Statement Modal */}
            {selectedPartner && (
                <PrintDebtStatementModal
                    partner={selectedPartner}
                    type={tab === 'customers' ? 'CUSTOMER' : 'SUPPLIER'}
                    companyInfo={companyInfo}
                    startDate={startDate}
                    endDate={endDate}
                    periodLabel={activePeriodLabel}
                    onClose={() => setSelectedPartner(null)}
                />
            )}
        </div>
    );
}

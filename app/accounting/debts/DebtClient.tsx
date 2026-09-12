'use client'

import React, { useState, useTransition, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
    Users, Building2, Search, Filter, Printer, Download, 
    AlertCircle, CheckCircle2, Clock, ArrowRight, FileSpreadsheet, 
    ChevronDown, ChevronRight, RefreshCw, Scale
} from 'lucide-react';
import PrintDebtStatementModal from './PrintDebtStatementModal';
import { getDebtOverviewData } from '../actions';

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
}

export default function DebtClient({ initialData, initialTab = 'customers', companyInfo }: Props) {
    const [tab, setTab] = useState<'customers' | 'suppliers'>(initialTab);
    const [data, setData] = useState(initialData);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false);
    const [selectedPartner, setSelectedPartner] = useState<any | null>(null);
    const [isPending, startTransition] = useTransition();

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const currentList = tab === 'customers' ? data.customerDebts : data.supplierDebts;

    const filteredList = useMemo(() => {
        return currentList.filter(item => {
            if (filterOverdueOnly && (item.totalOverdue || 0) <= 0) return false;
            if (searchQuery) {
                const s = searchQuery.toLowerCase();
                return (
                    item.name.toLowerCase().includes(s) ||
                    item.code.toLowerCase().includes(s) ||
                    item.phone.toLowerCase().includes(s)
                );
            }
            return true;
        });
    }, [currentList, filterOverdueOnly, searchQuery]);

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

    const handleRefresh = () => {
        startTransition(async () => {
            const res = await getDebtOverviewData();
            setData(res);
        });
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

    return (
        <div className="space-y-6 pb-12">
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
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
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

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm tên đối tác, mã, SĐT..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={filterOverdueOnly}
                            onChange={(e) => setFilterOverdueOnly(e.target.checked)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                        />
                        <span>Chỉ xem đối tác có nợ quá hạn</span>
                    </label>
                </div>
            </div>

            {/* Debts Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="py-3 px-4">Mã</th>
                                <th className="py-3 px-3">Tên Đối Tác</th>
                                <th className="py-3 px-3 text-right">Tổng Doanh Số</th>
                                <th className="py-3 px-3 text-right">Đã Thanh Toán</th>
                                <th className="py-3 px-3 text-right">Công Nợ Hiện Tại</th>
                                <th className="py-3 px-3 text-right text-emerald-600">Trong Hạn</th>
                                <th className="py-3 px-3 text-right text-amber-600">1 - 30 Ngày</th>
                                <th className="py-3 px-3 text-right text-orange-600">31 - 60 Ngày</th>
                                <th className="py-3 px-3 text-right text-rose-600">&gt; 60 Ngày</th>
                                <th className="py-3 px-4 text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredList.map((partner: any) => (
                                <tr key={partner.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                        {partner.code}
                                    </td>
                                    <td className="py-3.5 px-3">
                                        <div className="font-bold text-slate-900 dark:text-white">{partner.name}</div>
                                        <div className="text-[11px] text-slate-400">{partner.phone || partner.taxCode || '—'}</div>
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                        {formatVND(tab === 'customers' ? partner.totalInvoiced : partner.totalBilled)}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                        {formatVND(partner.totalPaid)}
                                    </td>
                                    <td className="py-3.5 px-3 text-right font-black text-sm text-slate-900 dark:text-white">
                                        {formatVND(partner.currentDebt)}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-emerald-600 font-medium">
                                        {partner.inDue > 0 ? formatVND(partner.inDue) : '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-amber-600 font-medium">
                                        {partner.overdue1to30 > 0 ? formatVND(partner.overdue1to30) : '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-orange-600 font-medium">
                                        {partner.overdue31to60 > 0 ? formatVND(partner.overdue31to60) : '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-right text-rose-600 font-bold">
                                        {(partner.overdue61to90 + partner.overdueOver90) > 0 
                                            ? formatVND(partner.overdue61to90 + partner.overdueOver90) 
                                            : '—'}
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                        <button
                                            onClick={() => setSelectedPartner(partner)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-semibold transition"
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
                                        Không tìm thấy dữ liệu công nợ phù hợp.
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
                    onClose={() => setSelectedPartner(null)}
                />
            )}
        </div>
    );
}

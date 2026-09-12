'use client'

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { 
    DollarSign, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, 
    CreditCard, Users, Building2, FileText, Calendar, Plus, RefreshCw, 
    ArrowRight, CheckCircle2, Clock, AlertCircle, PieChart, BarChart3, Scale
} from 'lucide-react';
import { getFinancialOverviewData } from './actions';

interface Props {
    initialData: any;
}

export default function AccountingDashboardClient({ initialData }: Props) {
    const [data, setData] = useState(initialData);
    const [year, setYear] = useState<number>(initialData.year || new Date().getFullYear());
    const [isPending, startTransition] = useTransition();

    const handleYearChange = (newYear: number) => {
        setYear(newYear);
        startTransition(async () => {
            const res = await getFinancialOverviewData(newYear);
            setData(res);
        });
    };

    const formatVND = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    };

    // Calculate max value for chart scaling
    const maxMonthlyVal = Math.max(
        ...data.monthlyData.map((m: any) => Math.max(m.inflow, m.outflow)),
        1000000
    );

    return (
        <div className="space-y-6 pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                            <Scale className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Trung Tâm Tài Chính & Kế Toán
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Giám sát dòng tiền, doanh thu, chi phí, sổ quỹ và công nợ doanh nghiệp
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Year Selector */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                        {[year - 1, year, year + 1].filter((y, idx, arr) => arr.indexOf(y) === idx).map((y) => (
                            <button
                                key={y}
                                onClick={() => handleYearChange(y)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                                    year === y
                                        ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                Năm {y}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => handleYearChange(year)}
                        disabled={isPending}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-emerald-500' : ''}`} />
                    </button>

                    <Link
                        href="/accounting/cash-book?action=receipt"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Lập Phiếu Thu
                    </Link>

                    <Link
                        href="/accounting/cash-book?action=payment"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Lập Phiếu Chi
                    </Link>
                </div>
            </div>

            {/* 4 Core Financial KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Tổng Tồn Quỹ Tiền Mặt & Ngân Hàng */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Tổng Quỹ Hiện Có
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatVND(data.totalCashBankBalance)}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{data.accounts.length} tài khoản & quỹ đang hoạt động</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <Link href="/accounting/accounts" className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline inline-flex items-center gap-1">
                            Chi tiết tài khoản <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

                {/* 2. Tổng Thu Thực Nhận Trong Năm */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-teal-500/50 transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Tổng Thu Thực Tế (Năm {year})
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                            <ArrowDownRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-teal-600 dark:text-teal-400 tracking-tight">
                            +{formatVND(data.totalInflow)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Thu bán hàng: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatVND(data.totalSalesCollected)}</span>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <Link href="/accounting/cash-book?type=RECEIPT" className="text-teal-600 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1">
                            Sổ phiếu thu <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

                {/* 3. Tổng Chi Thực Tế Trong Năm */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-rose-500/50 transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Tổng Chi Thực Tế (Năm {year})
                        </span>
                        <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <ArrowUpRight className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                            -{formatVND(data.totalOutflow)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                            Mua hàng: {formatVND(data.totalPurchasePaid)} • Lương: {formatVND(data.totalPayrollPaid)}
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <Link href="/accounting/cash-book?type=PAYMENT" className="text-rose-600 dark:text-rose-400 font-semibold hover:underline inline-flex items-center gap-1">
                            Sổ phiếu chi <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>

                {/* 4. Dòng Tiền Thuần (Net Cash Flow) */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500/50 transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Dòng Tiền Thuần (Net Flow)
                        </span>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            data.netCashFlow >= 0 
                                ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400' 
                                : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                        }`}>
                            {data.netCashFlow >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        </div>
                    </div>
                    <div className="mt-3">
                        <div className={`text-2xl font-black tracking-tight ${
                            data.netCashFlow >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'
                        }`}>
                            {data.netCashFlow >= 0 ? '+' : ''}{formatVND(data.netCashFlow)}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            {data.netCashFlow >= 0 ? 'Dòng tiền dương thặng dư' : 'Dòng tiền chi vượt thu trong kỳ'}
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <Link href="/accounting/reports" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1">
                            Báo cáo lưu chuyển <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* 2 Debt Summary Cards (AR & AP) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Công Nợ Phải Thu Khách Hàng */}
                <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 dark:from-slate-900 dark:to-slate-900/60 p-5 rounded-2xl border border-blue-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                                    <Users className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Công Nợ Phải Thu (Khách Hàng - AR)
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tiền hàng khách còn nợ theo hóa đơn</p>
                                </div>
                            </div>
                            <Link href="/accounting/debts?tab=customers" className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1">
                                Đối chiếu nợ <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className="mt-4 flex items-baseline justify-between">
                            <div>
                                <div className="text-2xl font-black text-blue-700 dark:text-blue-400">
                                    {formatVND(data.totalReceivables)}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">Tổng số dư nợ phải thu hiện tại</div>
                            </div>
                            {data.overdueReceivables > 0 && (
                                <div className="text-right">
                                    <div className="text-sm font-bold text-rose-600 flex items-center gap-1 justify-end">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {formatVND(data.overdueReceivables)}
                                    </div>
                                    <div className="text-[11px] text-rose-500">Nợ quá hạn cần thu hồi</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Công Nợ Phải Trả Nhà Cung Cấp */}
                <div className="bg-gradient-to-br from-amber-50/70 to-orange-50/40 dark:from-slate-900 dark:to-slate-900/60 p-5 rounded-2xl border border-amber-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center shadow-sm">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Công Nợ Phải Trả (Nhà Cung Cấp - AP)
                                    </h3>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Tiền mua hàng và dịch vụ chưa thanh toán</p>
                                </div>
                            </div>
                            <Link href="/accounting/debts?tab=suppliers" className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1">
                                Kế hoạch trả <ArrowRight className="w-3 h-3" />
                            </Link>
                        </div>

                        <div className="mt-4 flex items-baseline justify-between">
                            <div>
                                <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
                                    {formatVND(data.totalPayables)}
                                </div>
                                <div className="text-xs text-slate-500 mt-0.5">Tổng số nợ cần chi trả đối tác</div>
                            </div>
                            {data.overduePayables > 0 && (
                                <div className="text-right">
                                    <div className="text-sm font-bold text-rose-600 flex items-center gap-1 justify-end">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        {formatVND(data.overduePayables)}
                                    </div>
                                    <div className="text-[11px] text-rose-500">Đơn hàng đến hạn / quá hạn</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Cash Flow Chart & Category Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 12-Month Cash Flow Bar Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-emerald-600" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Diễn Biến Dòng Tiền 12 Tháng (Năm {year})
                            </h3>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-teal-500"></span>
                                <span className="text-slate-600 dark:text-slate-400">Tiền Thu</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-3 h-3 rounded-sm bg-rose-500"></span>
                                <span className="text-slate-600 dark:text-slate-400">Tiền Chi</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart Container */}
                    <div className="h-64 flex items-end justify-between gap-2 pt-6 pb-2 border-b border-slate-100 dark:border-slate-800">
                        {data.monthlyData.map((m: any) => {
                            const inflowHeight = (m.inflow / maxMonthlyVal) * 100;
                            const outflowHeight = (m.outflow / maxMonthlyVal) * 100;

                            return (
                                <div key={m.month} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col bg-slate-900 text-white text-[10px] p-2 rounded-lg shadow-xl z-20 whitespace-nowrap pointer-events-none">
                                        <div className="font-bold border-b border-slate-700 pb-1 mb-1">Tháng {m.monthNum}/{year}</div>
                                        <div className="text-teal-400">Thu: {formatVND(m.inflow)}</div>
                                        <div className="text-rose-400">Chi: {formatVND(m.outflow)}</div>
                                        <div className="text-slate-300 font-semibold pt-1">Thặng dư: {formatVND(m.net)}</div>
                                    </div>

                                    {/* Bars */}
                                    <div className="w-full flex items-end justify-center gap-1 h-full">
                                        <div 
                                            style={{ height: `${Math.max(inflowHeight, 2)}%` }} 
                                            className="w-1/2 max-w-[14px] bg-teal-500 hover:bg-teal-600 rounded-t-sm transition-all duration-300"
                                        />
                                        <div 
                                            style={{ height: `${Math.max(outflowHeight, 2)}%` }} 
                                            className="w-1/2 max-w-[14px] bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all duration-300"
                                        />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-medium mt-2">{m.month}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                        <span>Đơn vị tính: VNĐ</span>
                        <Link href="/accounting/reports" className="text-emerald-600 hover:underline font-semibold">
                            Xem báo cáo P&L đầy đủ →
                        </Link>
                    </div>
                </div>

                {/* Expense Categories Breakdown */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <PieChart className="w-4 h-4 text-indigo-600" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Cơ Cấu Các Khoản Chi
                            </h3>
                        </div>

                        <div className="space-y-3.5">
                            {data.expenseCategories.slice(0, 5).map((cat: any, idx: number) => {
                                const pct = data.totalOutflow > 0 ? ((cat.amount / data.totalOutflow) * 100).toFixed(1) : 0;
                                const colors = ['bg-indigo-600', 'bg-emerald-600', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500'];
                                const barColor = colors[idx % colors.length];

                                return (
                                    <div key={cat.name} className="space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[160px]">
                                                {cat.name}
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {formatVND(cat.amount)} <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                                            </span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                            <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}

                            {data.expenseCategories.length === 0 && (
                                <div className="text-center py-8 text-xs text-slate-400">
                                    Chưa có dữ liệu phát sinh chi phí trong năm {year}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <Link href="/sales/expenses" className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline flex items-center justify-between">
                            <span>Quản lý chi tiết chi phí</span>
                            <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Recent Cash Transactions Table */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Chứng Từ Thu - Chi Mới Phát Sinh
                        </h3>
                        <p className="text-xs text-slate-500">Các phiếu thu và phiếu chi gần nhất trong sổ quỹ</p>
                    </div>
                    <Link
                        href="/accounting/cash-book"
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                    >
                        Xem toàn bộ sổ quỹ <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-semibold border-y border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="py-2.5 px-3">Mã Phiếu</th>
                                <th className="py-2.5 px-3">Ngày Lập</th>
                                <th className="py-2.5 px-3">Loại Phiếu</th>
                                <th className="py-2.5 px-3">Người Nộp / Nhận</th>
                                <th className="py-2.5 px-3">Lý Do / Nội Dung</th>
                                <th className="py-2.5 px-3">Tài Khoản / Quỹ</th>
                                <th className="py-2.5 px-3 text-right">Số Tiền (VNĐ)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.recentTransactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                        {tx.code}
                                    </td>
                                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                        {new Date(tx.transactionDate).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="py-3 px-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            tx.type === 'RECEIPT' 
                                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' 
                                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                        }`}>
                                            {tx.type === 'RECEIPT' ? 'Phiếu Thu' : 'Phiếu Chi'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                                        {tx.payerReceiver}
                                    </td>
                                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                                        {tx.reason || '—'}
                                    </td>
                                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                        {tx.financeAccount?.name || 'Tiền mặt'}
                                    </td>
                                    <td className={`py-3 px-3 text-right font-bold ${
                                        tx.type === 'RECEIPT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {tx.type === 'RECEIPT' ? '+' : '-'}{formatVND(tx.amount)}
                                    </td>
                                </tr>
                            ))}

                            {data.recentTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                                        Chưa có phát sinh phiếu thu / phiếu chi trong sổ quỹ.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

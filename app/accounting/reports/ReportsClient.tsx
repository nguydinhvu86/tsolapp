'use client'

import React, { useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { 
    FileText, TrendingUp, TrendingDown, DollarSign, 
    Download, RefreshCw, BarChart3, PieChart, ArrowRight, CheckCircle2 
} from 'lucide-react';
import { getFinancialReportsData } from '../actions';

interface Props {
    initialData: any;
}

export default function ReportsClient({ initialData }: Props) {
    const [data, setData] = useState(initialData);
    const [year, setYear] = useState<number>(initialData.year || new Date().getFullYear());
    const [activeTab, setActiveTab] = useState<'PL' | 'CASH_FLOW'>('PL');
    const [isPending, startTransition] = useTransition();

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const handleYearChange = (newYear: number) => {
        setYear(newYear);
        startTransition(async () => {
            const res = await getFinancialReportsData(newYear);
            setData(res);
        });
    };

    const handleExportExcel = () => {
        const plRows = [
            { 'Chỉ tiêu': '1. Doanh thu bán hàng và cung cấp dịch vụ', 'Số tiền (VNĐ)': data.pl.grossRevenue },
            { 'Chỉ tiêu': '2. Các khoản giảm trừ doanh thu (Chiết khấu)', 'Số tiền (VNĐ)': data.pl.discountTotal },
            { 'Chỉ tiêu': '3. Doanh thu thuần về bán hàng và cung cấp dịch vụ', 'Số tiền (VNĐ)': data.pl.netRevenue },
            { 'Chỉ tiêu': '4. Giá vốn hàng bán (COGS)', 'Số tiền (VNĐ)': data.pl.cogs },
            { 'Chỉ tiêu': '5. Lợi nhuận gộp về bán hàng (3 - 4)', 'Số tiền (VNĐ)': data.pl.grossProfit },
            { 'Chỉ tiêu': '6. Chi phí bán hàng & Quản lý doanh nghiệp', 'Số tiền (VNĐ)': data.pl.totalOperatingExpenses },
            { 'Chỉ tiêu': '7. Chi phí lương & nhân sự (Lương, BHXH)', 'Số tiền (VNĐ)': data.pl.totalPersonnelExpenses },
            { 'Chỉ tiêu': '8. Lợi nhuận thuần từ hoạt động kinh doanh (EBIT)', 'Số tiền (VNĐ)': data.pl.netProfit }
        ];

        const cfRows = [
            { 'Dòng tiền lưu chuyển': '1. Tiền thu từ bán hàng, cung cấp dịch vụ', 'Số tiền (VNĐ)': data.cashFlow.cfReceiptsFromCustomers },
            { 'Dòng tiền lưu chuyển': '2. Tiền chi trả cho người cung cấp hàng hóa/dịch vụ', 'Số tiền (VNĐ)': -data.cashFlow.cfPaymentsToSuppliers },
            { 'Dòng tiền lưu chuyển': '3. Tiền chi trả cho người lao động (Lương)', 'Số tiền (VNĐ)': -data.cashFlow.cfPaymentsToEmployees },
            { 'Dòng tiền lưu chuyển': '4. Tiền chi cho hoạt động kinh doanh khác', 'Số tiền (VNĐ)': -data.cashFlow.cfOperatingExpenses },
            { 'Dòng tiền lưu chuyển': '5. Lưu chuyển tiền thuần từ hoạt động kinh doanh', 'Số tiền (VNĐ)': data.cashFlow.netOperatingCashFlow }
        ];

        const wb = XLSX.utils.book_new();
        const wsPL = XLSX.utils.json_to_sheet(plRows);
        const wsCF = XLSX.utils.json_to_sheet(cfRows);
        XLSX.utils.book_append_sheet(wb, wsPL, `Ket_Qua_KD_PL_${year}`);
        XLSX.utils.book_append_sheet(wb, wsCF, `Luu_Chuyen_Tien_Te_${year}`);
        XLSX.writeFile(wb, `Bao_Cao_Tai_Chinh_${year}.xlsx`);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Báo Cáo Tài Chính & Hiệu Quả Kinh Doanh
                            </h1>
                            <p className="text-xs text-slate-500">
                                Báo cáo kết quả kinh doanh (P&L) và Lưu chuyển tiền tệ (Cash Flow Statement)
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
                                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
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
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-indigo-500' : ''}`} />
                    </button>

                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
                    >
                        <Download className="w-4 h-4" />
                        Xuất Excel Báo Cáo
                    </button>
                </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm max-w-lg">
                <button
                    onClick={() => setActiveTab('PL')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                        activeTab === 'PL'
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    Báo Cáo Kết Quả Kinh Doanh (P&L)
                </button>
                <button
                    onClick={() => setActiveTab('CASH_FLOW')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-xl transition-all ${
                        activeTab === 'CASH_FLOW'
                            ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                >
                    <DollarSign className="w-4 h-4" />
                    Báo Cáo Lưu Chuyển Tiền Tệ
                </button>
            </div>

            {/* Tab 1: P&L Statement */}
            {activeTab === 'PL' && (
                <div className="space-y-6">
                    {/* 3 Key Metrics Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-slate-500 uppercase">Doanh Thu Thuần</span>
                            <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                                {formatVND(data.pl.netRevenue)}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">Đã trừ chiết khấu giảm giá</div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-indigo-600 uppercase">Lợi Nhuận Gộp</span>
                            <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-2">
                                {formatVND(data.pl.grossProfit)}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                                Tỷ suất lợi nhuận gộp: <span className="font-bold text-slate-800 dark:text-slate-200">{data.pl.grossMargin.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                            <span className="text-xs font-semibold text-emerald-600 uppercase">Lợi Nhuận Thuần (EBIT)</span>
                            <div className={`text-2xl font-black mt-2 ${
                                data.pl.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                                {data.pl.netProfit >= 0 ? '+' : ''}{formatVND(data.pl.netProfit)}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                                Tỷ suất lợi nhuận ròng: <span className="font-bold text-slate-800 dark:text-slate-200">{data.pl.netMargin.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Standard P&L Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                Báo Cáo Kết Quả Hoạt Động Kinh Doanh (Năm {year})
                            </h3>
                            <p className="text-[11px] text-slate-500 italic">Đơn vị tính: VNĐ • Tính theo doanh thu và chi phí phát sinh trong kỳ</p>
                        </div>

                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4 w-12 text-center">STT</th>
                                    <th className="py-3 px-4">Chỉ Tiêu Tài Chính</th>
                                    <th className="py-3 px-4 text-right">Năm {year} (VNĐ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                                <tr>
                                    <td className="py-3 px-4 text-center font-bold text-slate-400">1</td>
                                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                        Doanh thu bán hàng và cung cấp dịch vụ
                                    </td>
                                    <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                                        {formatVND(data.pl.grossRevenue)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 text-center text-slate-400">2</td>
                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 pl-8">
                                        Các khoản giảm trừ doanh thu (Chiết khấu thương mại)
                                    </td>
                                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-400">
                                        -{formatVND(data.pl.discountTotal)}
                                    </td>
                                </tr>
                                <tr className="bg-slate-50/50 dark:bg-slate-800/30 font-bold">
                                    <td className="py-3 px-4 text-center">3</td>
                                    <td className="py-3 px-4 text-slate-900 dark:text-white">
                                        Doanh thu thuần về bán hàng và cung cấp dịch vụ (1 - 2)
                                    </td>
                                    <td className="py-3 px-4 text-right text-indigo-600 dark:text-indigo-400 text-sm">
                                        {formatVND(data.pl.netRevenue)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 text-center text-slate-400">4</td>
                                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                        Giá vốn hàng bán (COGS - Hóa đơn mua hàng hóa, nguyên vật liệu)
                                    </td>
                                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-medium">
                                        -{formatVND(data.pl.cogs)}
                                    </td>
                                </tr>
                                <tr className="bg-indigo-50/30 dark:bg-indigo-950/20 font-bold">
                                    <td className="py-3 px-4 text-center text-indigo-600">5</td>
                                    <td className="py-3 px-4 text-indigo-950 dark:text-indigo-200">
                                        Lợi nhuận gộp về bán hàng và cung cấp dịch vụ (3 - 4)
                                    </td>
                                    <td className="py-3 px-4 text-right text-indigo-700 dark:text-indigo-300 text-sm">
                                        {formatVND(data.pl.grossProfit)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 text-center text-slate-400">6</td>
                                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                        Chi phí bán hàng & Quản lý doanh nghiệp (Vận hành, tiếp khách, văn phòng...)
                                    </td>
                                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-medium">
                                        -{formatVND(data.pl.totalOperatingExpenses)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3 px-4 text-center text-slate-400">7</td>
                                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                        Chi phí nhân sự & Lao động (Lương, phụ cấp, bảo hiểm công ty đóng)
                                    </td>
                                    <td className="py-3 px-4 text-right text-rose-600 dark:text-rose-400 font-medium">
                                        -{formatVND(data.pl.totalPersonnelExpenses)}
                                    </td>
                                </tr>
                                <tr className="bg-emerald-50 dark:bg-emerald-950/40 font-black border-t-2 border-emerald-500">
                                    <td className="py-4 px-4 text-center text-emerald-700 dark:text-emerald-400 text-sm">8</td>
                                    <td className="py-4 px-4 text-emerald-950 dark:text-emerald-200 text-sm uppercase">
                                        Lợi nhuận thuần từ hoạt động kinh doanh (EBIT / Net Profit) (5 - 6 - 7)
                                    </td>
                                    <td className={`py-4 px-4 text-right text-base font-black ${
                                        data.pl.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {data.pl.netProfit >= 0 ? '+' : ''}{formatVND(data.pl.netProfit)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Cash Flow Statement */}
            {activeTab === 'CASH_FLOW' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                        <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase">
                                Báo Cáo Lưu Chuyển Tiền Tệ Trực Tiếp (Năm {year})
                            </h3>
                            <p className="text-[11px] text-slate-500 italic">Đơn vị tính: VNĐ • Dòng tiền thực thu - thực chi thực tế qua quỹ & tài khoản</p>
                        </div>

                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                                <tr>
                                    <th className="py-3 px-4 w-12 text-center">STT</th>
                                    <th className="py-3 px-4">Dòng Tiền Lưu Chuyển Từ Hoạt Động Kinh Doanh</th>
                                    <th className="py-3 px-4 text-right">Số Tiền (VNĐ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                                <tr>
                                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">1</td>
                                    <td className="py-3.5 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                        Tiền thu từ bán hàng, cung cấp dịch vụ và doanh thu khác
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                                        +{formatVND(data.cashFlow.cfReceiptsFromCustomers)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">2</td>
                                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                                        Tiền chi trả cho người cung cấp hàng hóa và dịch vụ
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                                        -{formatVND(data.cashFlow.cfPaymentsToSuppliers)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">3</td>
                                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                                        Tiền chi trả cho người lao động (Chi trả lương thực tế)
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                                        -{formatVND(data.cashFlow.cfPaymentsToEmployees)}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="py-3.5 px-4 text-center font-bold text-slate-400">4</td>
                                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                                        Tiền chi khác cho hoạt động kinh doanh (Chi phí văn phòng, quản lý...)
                                    </td>
                                    <td className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                                        -{formatVND(data.cashFlow.cfOperatingExpenses)}
                                    </td>
                                </tr>
                                <tr className="bg-purple-50 dark:bg-purple-950/40 font-black border-t-2 border-purple-500">
                                    <td className="py-4 px-4 text-center text-purple-700 dark:text-purple-400 text-sm">5</td>
                                    <td className="py-4 px-4 text-purple-950 dark:text-purple-200 text-sm uppercase">
                                        Lưu chuyển tiền thuần từ hoạt động kinh doanh (Net Operating Cash Flow)
                                    </td>
                                    <td className={`py-4 px-4 text-right text-base font-black ${
                                        data.cashFlow.netOperatingCashFlow >= 0 ? 'text-purple-700 dark:text-purple-300' : 'text-amber-600 dark:text-amber-400'
                                    }`}>
                                        {data.cashFlow.netOperatingCashFlow >= 0 ? '+' : ''}{formatVND(data.cashFlow.netOperatingCashFlow)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

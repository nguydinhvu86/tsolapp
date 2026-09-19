'use client'

import React, { useState, useEffect } from 'react';
import { 
    Activity, 
    TrendingUp, 
    TrendingDown, 
    DollarSign, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    BarChart3, 
    PieChart, 
    Layers, 
    ShieldCheck, 
    RefreshCw,
    Calendar,
    Briefcase,
    Building2,
    ArrowUpRight,
    ArrowDownRight,
    Scale,
    Wallet
} from 'lucide-react';
import { fetchExecutiveBiData } from './actions';

export default function ExecutiveBiClient() {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'aging' | 'projects'>('overview');

    const loadData = async () => {
        setLoading(true);
        const res = await fetchExecutiveBiData();
        if (res.success && res.data) {
            setData(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <RefreshCw className="w-10 h-10 animate-spin text-emerald-600" />
                <p className="text-slate-600 dark:text-slate-400 font-medium text-sm">Đang tải và tổng hợp dữ liệu Điều Hành BI...</p>
            </div>
        );
    }

    const { cashFlow, agingDebts, projectProfitability, executiveMetrics } = data || {};

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 shrink-0">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] tracking-wider uppercase">
                            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            TSOL Executive Business Intelligence
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-0.5">
                            Bảng Điều Hành BI & Dự Báo Dòng Tiền Động
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Phân tích chuyên sâu tài chính, tuổi nợ 5 nhóm, hiệu quả dự án & cảnh báo an toàn dòng tiền
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-center">
                    <button 
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer shadow-2xs"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" /> Làm mới số liệu
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Runway Card */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Khả năng hoạt động (Runway)
                            </span>
                            <div className={`p-2 rounded-xl ${
                                (executiveMetrics?.runwayMonths || 0) >= 6 
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' 
                                    : (executiveMetrics?.runwayMonths || 0) > 0
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}>
                                <Clock className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className={`text-2xl sm:text-3xl font-bold ${
                                (executiveMetrics?.runwayMonths || 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'
                            }`}>
                                {executiveMetrics?.runwayMonths ? `${executiveMetrics.runwayMonths} tháng` : 'N/A'}
                            </span>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">
                        {(executiveMetrics?.runwayMonths || 0) < 0 
                            ? '⚠️ Cảnh báo: Quỹ tiền mặt cần bổ sung' 
                            : 'Dựa trên chi phí bình quân tháng gần nhất'}
                    </p>
                </div>

                {/* Net Working Capital */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Vốn Lưu Động Ròng (NWC)
                            </span>
                            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                                <DollarSign className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white font-mono">
                                {formatCurrency(executiveMetrics?.netWorkingCapital || 0)}
                            </span>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">(Tiền mặt + Phải thu) - Phải trả ngắn hạn</p>
                </div>

                {/* DSO */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Kỳ Thu Tiền Bình Quân (DSO)
                            </span>
                            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                <BarChart3 className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                                {executiveMetrics?.dsoDays || 0} ngày
                            </span>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">Thời gian trung bình thu hồi nợ KH</p>
                </div>

                {/* DPO */}
                <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Kỳ Trả Nợ Bình Quân (DPO)
                            </span>
                            <div className="p-2 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                                <Layers className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                                {executiveMetrics?.dpoDays || 0} ngày
                            </span>
                        </div>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2">Thời gian trung bình thanh toán cho NCC</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                {[
                    { key: 'overview', label: 'Tổng Quan Dòng Tiền 30-60-90 Ngày', icon: TrendingUp },
                    { key: 'aging', label: 'Báo Cáo Tuổi Nợ (Aging Report)', icon: AlertTriangle },
                    { key: 'projects', label: 'Hiệu Quả Lãi Lỗ Dự Án (P&L)', icon: Briefcase }
                ].map(t => {
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.key}
                            onClick={() => setActiveTab(t.key as any)}
                            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-all cursor-pointer ${
                                activeTab === t.key 
                                    ? 'border-emerald-600 text-emerald-600 dark:border-emerald-500 dark:text-emerald-400 font-bold' 
                                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {t.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab 1: Cash Flow Forecast */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                                Dự Báo Dòng Tiền Cuốn Chiếu (Rolling Cash Flow Forecast)
                            </h2>
                            <span className="text-xs text-slate-400">Dự phóng dựa trên thời hạn công nợ và chi phí</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Current Cash */}
                            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                                <div>
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase">Tiền mặt hiện tại</span>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
                                        {formatCurrency(cashFlow?.startingCash || 0)}
                                    </p>
                                </div>
                                <span className="inline-flex items-center text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-3">
                                    ✓ Số dư thực tế sổ quỹ
                                </span>
                            </div>

                            {/* 30 Days Forecast */}
                            <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase">Kỳ 30 Ngày tới</span>
                                        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded-full font-bold">30D</span>
                                    </div>
                                    <p className="text-xl font-bold text-emerald-900 dark:text-emerald-100 mt-1.5 font-mono">
                                        {formatCurrency(cashFlow?.d30?.projectedCash || 0)}
                                    </p>
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 space-y-1">
                                    <div className="flex justify-between"><span>Thu dự kiến:</span> <span className="text-emerald-700 dark:text-emerald-400 font-bold">+{formatCurrency(cashFlow?.d30?.expectedInflow || 0)}</span></div>
                                    <div className="flex justify-between"><span>Chi dự kiến:</span> <span className="text-rose-600 dark:text-rose-400 font-bold">-{formatCurrency(cashFlow?.d30?.expectedOutflow || 0)}</span></div>
                                </div>
                            </div>

                            {/* 60 Days Forecast */}
                            <div className="p-4 rounded-xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/40 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-teal-800 dark:text-teal-400 uppercase">Kỳ 60 Ngày tới</span>
                                        <span className="text-[10px] bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 px-2 py-0.5 rounded-full font-bold">60D</span>
                                    </div>
                                    <p className="text-xl font-bold text-teal-900 dark:text-teal-100 mt-1.5 font-mono">
                                        {formatCurrency(cashFlow?.d60?.projectedCash || 0)}
                                    </p>
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-3 pt-2 border-t border-teal-200/60 dark:border-teal-900/40 space-y-1">
                                    <div className="flex justify-between"><span>Thu dự kiến:</span> <span className="text-emerald-700 dark:text-emerald-400 font-bold">+{formatCurrency(cashFlow?.d60?.expectedInflow || 0)}</span></div>
                                    <div className="flex justify-between"><span>Chi dự kiến:</span> <span className="text-rose-600 dark:text-rose-400 font-bold">-{formatCurrency(cashFlow?.d60?.expectedOutflow || 0)}</span></div>
                                </div>
                            </div>

                            {/* 90 Days Forecast */}
                            <div className="p-4 rounded-xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/40 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-cyan-800 dark:text-cyan-400 uppercase">Kỳ 90 Ngày tới</span>
                                        <span className="text-[10px] bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200 px-2 py-0.5 rounded-full font-bold">90D</span>
                                    </div>
                                    <p className="text-xl font-bold text-cyan-900 dark:text-cyan-100 mt-1.5 font-mono">
                                        {formatCurrency(cashFlow?.d90?.projectedCash || 0)}
                                    </p>
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-400 mt-3 pt-2 border-t border-cyan-200/60 dark:border-cyan-900/40 space-y-1">
                                    <div className="flex justify-between"><span>Thu dự kiến:</span> <span className="text-emerald-700 dark:text-emerald-400 font-bold">+{formatCurrency(cashFlow?.d90?.expectedInflow || 0)}</span></div>
                                    <div className="flex justify-between"><span>Chi dự kiến:</span> <span className="text-rose-600 dark:text-rose-400 font-bold">-{formatCurrency(cashFlow?.d90?.expectedOutflow || 0)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 2: Aging Debt Report */}
            {activeTab === 'aging' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Phải thu khách hàng */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                                <TrendingUp className="w-5 h-5 text-emerald-600" />
                                Tuổi Nợ Phải Thu Khách Hàng (Receivables)
                            </h3>
                            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                                Tổng: {formatCurrency(agingDebts?.receivables?.totalDebt || 0)}
                            </span>
                        </div>
                        <div className="space-y-2.5">
                            {[
                                { label: 'Trong hạn', val: agingDebts?.receivables?.totalCurrent, color: 'bg-emerald-500' },
                                { label: 'Quá hạn 1 - 30 ngày', val: agingDebts?.receivables?.totalOverdue1To30, color: 'bg-blue-500' },
                                { label: 'Quá hạn 31 - 60 ngày', val: agingDebts?.receivables?.totalOverdue31To60, color: 'bg-amber-500' },
                                { label: 'Quá hạn 61 - 90 ngày', val: agingDebts?.receivables?.totalOverdue61To90, color: 'bg-orange-500' },
                                { label: 'Quá hạn > 90 ngày (Khó đòi)', val: agingDebts?.receivables?.totalOverdue90Plus, color: 'bg-rose-500' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
                                        <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
                                        {formatCurrency(item.val || 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Phải trả nhà cung cấp */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                                <TrendingDown className="w-5 h-5 text-rose-600" />
                                Tuổi Nợ Phải Trả Nhà Cung Cấp (Payables)
                            </h3>
                            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                                Tổng: {formatCurrency(agingDebts?.payables?.totalDebt || 0)}
                            </span>
                        </div>
                        <div className="space-y-2.5">
                            {[
                                { label: 'Trong hạn', val: agingDebts?.payables?.totalCurrent, color: 'bg-emerald-500' },
                                { label: 'Quá hạn 1 - 30 ngày', val: agingDebts?.payables?.totalOverdue1To30, color: 'bg-blue-500' },
                                { label: 'Quá hạn 31 - 60 ngày', val: agingDebts?.payables?.totalOverdue31To60, color: 'bg-amber-500' },
                                { label: 'Quá hạn 61 - 90 ngày', val: agingDebts?.payables?.totalOverdue61To90, color: 'bg-orange-500' },
                                { label: 'Quá hạn > 90 ngày', val: agingDebts?.payables?.totalOverdue90Plus, color: 'bg-rose-500' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2.5">
                                        <span className={`w-3 h-3 rounded-full ${item.color} shrink-0`} />
                                        <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                                    </div>
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-mono">
                                        {formatCurrency(item.val || 0)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Tab 3: Project P&L Analysis */}
            {activeTab === 'projects' && (
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">Phân Tích Lợi Nhuận Gộp Theo Dự Án (Project P&L)</h3>
                    </div>
                    {(!projectProfitability || projectProfitability.length === 0) ? (
                        <p className="text-sm text-slate-500 py-8 text-center">Chưa có dự án nào có dữ liệu chi phí và hóa đơn.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-500 text-xs uppercase font-semibold">
                                        <th className="py-3 px-4">Mã & Tên Dự Án</th>
                                        <th className="py-3 px-4">Khách Hàng</th>
                                        <th className="py-3 px-4 text-right">Doanh Thu</th>
                                        <th className="py-3 px-4 text-right">Tổng Chi Phí</th>
                                        <th className="py-3 px-4 text-right">Lợi Nhuận Gộp</th>
                                        <th className="py-3 px-4 text-right">Biên Lợi Nhuận</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectProfitability.map((p: any) => (
                                        <tr key={p.projectId} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                            <td className="py-3 px-4">
                                                <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">{p.projectCode}</span>
                                                <p className="text-slate-800 dark:text-slate-200 font-semibold">{p.projectName}</p>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{p.customerName}</td>
                                            <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white font-mono">{formatCurrency(p.totalRevenue || p.revenue || 0)}</td>
                                            <td className="py-3 px-4 text-right text-rose-600 font-semibold font-mono">{formatCurrency(p.totalCost || p.cost || 0)}</td>
                                            <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">{formatCurrency(p.grossProfit || 0)}</td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    (p.marginPercent || 0) >= 20 
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                }`}>
                                                    {(p.marginPercent || 0).toFixed(1)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

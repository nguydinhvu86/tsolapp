import React, { useState, useEffect, useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Building2,
    TrendingDown,
    AlertCircle,
    CheckCircle2,
    DollarSign,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    BarChart3,
    PieChart as PieChartIcon,
    Wallet,
    TrendingUp,
    Receipt,
    Layers
} from 'lucide-react';

interface Props {
    suppliers: any[];
}

const DEBT_TIER_COLORS = {
    noDebt: '#10b981',       // emerald (Không nợ)
    lowDebt: '#3b82f6',      // blue (< 50 triệu)
    mediumDebt: '#f59e0b',   // amber (50 - 200 triệu)
    highDebt: '#ef4444'      // red (> 200 triệu)
};

const VOLUME_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

export function SupplierAnalyticsBar({ suppliers = [] }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [viewMode, setViewMode] = useState<'debt' | 'volume'>('debt');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatVND = (num: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num || 0);
    };

    const formatShortVND = (num: number) => {
        const abs = Math.abs(num);
        if (abs >= 1_000_000_000) {
            return `${(num / 1_000_000_000).toFixed(1)} Tỷ`;
        }
        if (abs >= 1_000_000) {
            return `${(num / 1_000_000).toFixed(1)} Tr`;
        }
        if (abs >= 1_000) {
            return `${(num / 1_000).toFixed(0)}k`;
        }
        return `${num}`;
    };

    // Calculate Supplier Metrics & Breakdown
    const stats = useMemo(() => {
        let totalSuppliers = suppliers.length;
        let totalDebt = 0;
        let totalPurchaseVolume = 0;
        let debtSupplierCount = 0;
        let noDebtCount = 0;
        let lowDebtCount = 0;
        let lowDebtAmount = 0;
        let mediumDebtCount = 0;
        let mediumDebtAmount = 0;
        let highDebtCount = 0;
        let highDebtAmount = 0;

        const volumeList: Array<{ name: string; fullName: string; code?: string; volume: number; billCount: number }> = [];

        suppliers.forEach(s => {
            const debt = Number(s.computedDebt !== undefined ? s.computedDebt : s.totalDebt) || 0;

            if (debt > 0) {
                totalDebt += debt;
                debtSupplierCount++;

                if (debt < 50_000_000) {
                    lowDebtCount++;
                    lowDebtAmount += debt;
                } else if (debt <= 200_000_000) {
                    mediumDebtCount++;
                    mediumDebtAmount += debt;
                } else {
                    highDebtCount++;
                    highDebtAmount += debt;
                }
            } else {
                noDebtCount++;
            }

            // Calculate Purchase Volume
            const validBills = s.bills && Array.isArray(s.bills) 
                ? s.bills.filter((b: any) => !['DRAFT', 'CANCELLED'].includes(b?.status)) 
                : [];
            const vol = validBills.reduce((acc: number, b: any) => acc + (b?.totalAmount || 0), 0);
            totalPurchaseVolume += vol;

            if (vol > 0) {
                const rawName = s.shortName || s.name || 'NCC';
                volumeList.push({
                    name: rawName.length > 22 ? rawName.slice(0, 20) + '…' : rawName,
                    fullName: s.name,
                    code: s.code,
                    volume: vol,
                    billCount: validBills.length
                });
            }
        });

        // Top 5 Suppliers with largest payable debt
        const top5Debts = [...suppliers]
            .map(s => {
                const debt = Number(s.computedDebt !== undefined ? s.computedDebt : s.totalDebt) || 0;
                const rawName = s.shortName || s.name || 'NCC';
                const shortName = rawName.length > 22 ? rawName.slice(0, 20) + '…' : rawName;
                return {
                    name: shortName,
                    fullName: s.name,
                    code: s.code,
                    debt
                };
            })
            .filter(s => s.debt > 0)
            .sort((a, b) => b.debt - a.debt)
            .slice(0, 5);

        // Top 5 Suppliers with largest purchase volume
        const top5Volumes = [...volumeList]
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5);

        // Debt Distribution Donut
        const debtTierData = [
            { name: 'Không nợ (0đ)', count: noDebtCount, amount: 0, color: DEBT_TIER_COLORS.noDebt },
            { name: 'Dưới 50 Tr', count: lowDebtCount, amount: lowDebtAmount, color: DEBT_TIER_COLORS.lowDebt },
            { name: '50 - 200 Tr', count: mediumDebtCount, amount: mediumDebtAmount, color: DEBT_TIER_COLORS.mediumDebt },
            { name: 'Trên 200 Tr', count: highDebtCount, amount: highDebtAmount, color: DEBT_TIER_COLORS.highDebt }
        ].filter(t => t.count > 0);

        // Volume distribution: Top 5 vs Others
        const top5VolSum = top5Volumes.reduce((acc, v) => acc + v.volume, 0);
        const othersVol = Math.max(0, totalPurchaseVolume - top5VolSum);
        const volumePieData = [
            ...top5Volumes.map((v, i) => ({
                name: v.name,
                volume: v.volume,
                color: VOLUME_COLORS[i % VOLUME_COLORS.length]
            })),
            ...(othersVol > 0 ? [{ name: 'Các NCC khác', volume: othersVol, color: '#94a3b8' }] : [])
        ].filter(d => d.volume > 0);

        const avgDebtPerSupplier = debtSupplierCount > 0 ? Math.round(totalDebt / debtSupplierCount) : 0;
        const debtSupplierRate = totalSuppliers > 0 ? Math.round((debtSupplierCount / totalSuppliers) * 100) : 0;

        return {
            totalSuppliers,
            totalDebt,
            totalPurchaseVolume,
            debtSupplierCount,
            noDebtCount,
            avgDebtPerSupplier,
            debtSupplierRate,
            top5Debts,
            top5Volumes,
            debtTierData,
            volumePieData
        };
    }, [suppliers]);

    if (!isMounted) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-300">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs shrink-0">
                        <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Phân Tích Cơ Cấu Nhà Cung Cấp &amp; Trọng Số Công Nợ</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                {stats.totalSuppliers} đối tác
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 hidden sm:block">
                            Trực quan hóa tỷ trọng chiếm dụng công nợ và xếp hạng nhà cung cấp cần ưu tiên đối soát
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    {/* View Mode Toggle Buttons */}
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/80 dark:border-slate-700 text-[11px] font-semibold">
                        <button
                            type="button"
                            onClick={() => setViewMode('debt')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                                viewMode === 'debt'
                                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-2xs font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Dư Nợ Phải Trả
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('volume')}
                            className={`px-2.5 py-1 rounded-lg transition-all ${
                                viewMode === 'volume'
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-2xs font-bold'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            Kim Ngạch Mua Hàng
                        </button>
                    </div>

                    {/* Collapse Button */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
                        title={isCollapsed ? 'Mở rộng biểu đồ' : 'Thu gọn biểu đồ'}
                    >
                        {isCollapsed ? (
                            <>
                                <span>Xem Biểu Đồ</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </>
                        ) : (
                            <>
                                <span>Thu Gọn</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible Chart Body */}
            {!isCollapsed && (
                <div className="p-4 sm:p-5 space-y-4">
                    {/* KPI 4 Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-xl p-3 bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-800 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tổng Nhà Cung Cấp</span>
                                <Building2 size={14} className="text-slate-400" />
                            </div>
                            <div className="text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                                {stats.totalSuppliers} <span className="text-xs font-normal text-slate-400 font-sans">đối tác</span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Toàn mạng lưới cung ứng</div>
                        </div>

                        <div className="rounded-xl p-3 bg-white dark:bg-slate-800/80 border border-rose-200/90 dark:border-rose-900/50 bg-gradient-to-br from-rose-50/30 via-white to-white dark:from-rose-950/20 dark:via-slate-800/80 dark:to-slate-800/80 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">Tổng Dư Nợ Phải Trả</span>
                                <DollarSign size={14} className="text-rose-600 dark:text-rose-400" />
                            </div>
                            <div className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400 truncate" title={formatVND(stats.totalDebt)}>
                                {formatVND(stats.totalDebt)}
                            </div>
                            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-0.5 font-medium">Cần thanh toán đối tác</div>
                        </div>

                        <div className="rounded-xl p-3 bg-white dark:bg-slate-800/80 border border-amber-200/90 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/30 via-white to-white dark:from-amber-950/20 dark:via-slate-800/80 dark:to-slate-800/80 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">NCC Đang Có Nợ</span>
                                <AlertCircle size={14} className="text-amber-500" />
                            </div>
                            <div className="text-lg font-extrabold font-mono text-amber-700 dark:text-amber-400">
                                {stats.debtSupplierCount} <span className="text-xs font-normal text-slate-400 font-sans">NCC ({stats.debtSupplierRate}%)</span>
                            </div>
                            <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Tỷ lệ phát sinh nợ</div>
                        </div>

                        <div className="rounded-xl p-3 bg-white dark:bg-slate-800/80 border border-blue-200/90 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/30 via-white to-white dark:from-blue-950/20 dark:via-slate-800/80 dark:to-slate-800/80 shadow-2xs">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Nợ Bình Quân / NCC</span>
                                <TrendingDown size={14} className="text-blue-500" />
                            </div>
                            <div className="text-lg font-extrabold font-mono text-blue-700 dark:text-blue-400 truncate" title={formatVND(stats.avgDebtPerSupplier)}>
                                {formatShortVND(stats.avgDebtPerSupplier)}
                            </div>
                            <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5">Tính trên các NCC có nợ</div>
                        </div>
                    </div>

                    {/* Multi-Chart Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* CHART 1 (7 Cols): Top 5 NCC theo Dư nợ hoặc Doanh số mua hàng */}
                        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    {viewMode === 'debt' ? (
                                        <>
                                            <Building2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                                Top 5 Nhà Cung Cấp Có Dư Nợ Phải Trả Cao Nhất
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                                Top 5 Nhà Cung Cấp Có Kim Ngạch Mua Hàng Lớn Nhất
                                            </span>
                                        </>
                                    )}
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {viewMode === 'debt' 
                                        ? `Tổng nợ: ${formatShortVND(stats.totalDebt)}` 
                                        : `Tổng mua: ${formatShortVND(stats.totalPurchaseVolume)}`}
                                </span>
                            </div>

                            <div className="h-56 sm:h-64 w-full flex flex-col justify-around space-y-2">
                                {viewMode === 'debt' ? (
                                    stats.top5Debts.length > 0 ? (
                                        stats.top5Debts.map((sup, sIdx) => {
                                            const pct = stats.totalDebt > 0 ? Math.round((sup.debt / stats.totalDebt) * 100) : 0;
                                            return (
                                                <div key={sIdx} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] flex items-center justify-center shrink-0">
                                                                {sIdx + 1}
                                                            </span>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={sup.fullName}>
                                                                {sup.fullName}
                                                            </span>
                                                            {sup.code && (
                                                                <span className="text-[10px] text-slate-400 shrink-0">
                                                                    ({sup.code})
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[10px] font-bold text-slate-500 font-mono">
                                                                {pct}%
                                                            </span>
                                                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                                                {formatVND(sup.debt)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                                                            title={`Chiếm ${pct}% tổng công nợ NCC`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                                            Không có nhà cung cấp nào đang phát sinh dư nợ
                                        </div>
                                    )
                                ) : (
                                    stats.top5Volumes.length > 0 ? (
                                        stats.top5Volumes.map((sup, sIdx) => {
                                            const pct = stats.totalPurchaseVolume > 0 
                                                ? Math.round((sup.volume / stats.totalPurchaseVolume) * 100) 
                                                : 0;
                                            return (
                                                <div key={sIdx} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                            <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-black text-[10px] flex items-center justify-center shrink-0">
                                                                {sIdx + 1}
                                                            </span>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={sup.fullName}>
                                                                {sup.fullName}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                ({sup.billCount} đơn)
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-[10px] font-bold text-slate-500 font-mono">
                                                                {pct}%
                                                            </span>
                                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                                                                {formatVND(sup.volume)}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, Math.max(3, pct))}%` }}
                                                            title={`Chiếm ${pct}% tổng kim ngạch mua hàng`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                                            Chưa có dữ liệu kim ngạch mua hàng
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {/* CHART 2 (5 Cols): Donut Pie (Phân bổ nợ hoặc tỷ trọng mua) */}
                        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-blue-600" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        {viewMode === 'debt' ? 'Phân Bổ NCC Theo Mức Dư Nợ' : 'Cơ Cấu Kim Ngạch Mua Hàng'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {viewMode === 'debt' 
                                        ? `${stats.debtTierData.length} phân đoạn` 
                                        : `${stats.volumePieData.length} nhóm`}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                {/* Donut Pie */}
                                <div className="sm:col-span-6 h-48 sm:h-56 relative flex items-center justify-center">
                                    {viewMode === 'debt' ? (
                                        stats.debtTierData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.debtTierData}
                                                        innerRadius={46}
                                                        outerRadius={68}
                                                        paddingAngle={3}
                                                        dataKey="count"
                                                    >
                                                        {stats.debtTierData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload || !payload.length) return null;
                                                            const p = payload[0].payload;
                                                            const pct = stats.totalSuppliers > 0
                                                                ? Math.round((p.count / stats.totalSuppliers) * 100)
                                                                : 0;
                                                            return (
                                                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700">
                                                                    <div className="font-bold" style={{ color: p.color }}>{p.name}</div>
                                                                    <div>Số lượng: <span className="font-bold font-mono">{p.count} NCC</span> ({pct}%)</div>
                                                                    {p.amount > 0 && (
                                                                        <div className="text-amber-300 text-[11px] font-mono">
                                                                            Tổng nợ: {formatVND(p.amount)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Chưa có dữ liệu</div>
                                        )
                                    ) : (
                                        stats.volumePieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.volumePieData}
                                                        innerRadius={46}
                                                        outerRadius={68}
                                                        paddingAngle={3}
                                                        dataKey="volume"
                                                    >
                                                        {stats.volumePieData.map((entry, index) => (
                                                            <Cell key={`cell-vol-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload || !payload.length) return null;
                                                            const p = payload[0].payload;
                                                            const pct = stats.totalPurchaseVolume > 0
                                                                ? Math.round((p.volume / stats.totalPurchaseVolume) * 100)
                                                                : 0;
                                                            return (
                                                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700">
                                                                    <div className="font-bold" style={{ color: p.color }}>{p.name}</div>
                                                                    <div className="font-mono text-emerald-400">{formatVND(p.volume)}</div>
                                                                    <div className="text-slate-300 text-[11px]">Tỷ trọng: {pct}%</div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Chưa có dữ liệu mua hàng</div>
                                        )
                                    )}

                                    {/* Donut Center Label */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">
                                            {viewMode === 'debt' ? 'Đang nợ' : 'Top 5'}
                                        </span>
                                        <span className={`text-base font-black font-mono ${viewMode === 'debt' ? 'text-rose-600' : 'text-blue-600'}`}>
                                            {viewMode === 'debt' ? `${stats.debtSupplierRate}%` : `${Math.round(((stats.top5Volumes.reduce((acc, v) => acc + v.volume, 0)) / (stats.totalPurchaseVolume || 1)) * 100)}%`}
                                        </span>
                                    </div>
                                </div>

                                {/* Legend List */}
                                <div className="sm:col-span-6 space-y-1.5 text-xs">
                                    {viewMode === 'debt' ? (
                                        stats.debtTierData.map((tier, idx) => {
                                            const pct = stats.totalSuppliers > 0 ? Math.round((tier.count / stats.totalSuppliers) * 100) : 0;
                                            return (
                                                <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: tier.color }} />
                                                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                                                            {tier.name}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                                                        {tier.count} NCC ({pct}%)
                                                    </span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        stats.volumePieData.map((vol, idx) => {
                                            const pct = stats.totalPurchaseVolume > 0 
                                                ? Math.round((vol.volume / stats.totalPurchaseVolume) * 100) 
                                                : 0;
                                            return (
                                                <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: vol.color }} />
                                                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                                                            {vol.name}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                                                        {pct}% ({formatShortVND(vol.volume)})
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

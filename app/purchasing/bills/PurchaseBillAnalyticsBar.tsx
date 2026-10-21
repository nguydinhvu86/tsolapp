'use client';

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
    Cell,
    Line,
    ComposedChart
} from 'recharts';
import {
    ShoppingBag,
    TrendingUp,
    CheckCircle2,
    Clock,
    AlertTriangle,
    BarChart3,
    PieChart as PieChartIcon,
    Building2,
    ChevronDown,
    ChevronUp,
    FileText,
    ArrowUpRight,
    Wallet
} from 'lucide-react';

interface Props {
    bills: any[];
}

const STATUS_COLORS: Record<string, string> = {
    PAID: '#10b981',         // emerald
    PARTIAL_PAID: '#f59e0b', // amber
    APPROVED: '#ef4444',     // rose
    DRAFT: '#64748b',        // slate
    CANCELLED: '#cbd5e1'     // grey
};

const SUPPLIER_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'
];

export function PurchaseBillAnalyticsBar({ bills = [] }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [viewMode, setViewMode] = useState<'MONTH' | 'SUPPLIER'>('MONTH');

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

    // Calculate Metrics & Chart Data
    const stats = useMemo(() => {
        let totalSpend = 0;
        let totalPaid = 0;
        let totalDebt = 0;
        let activeCount = 0;

        const monthlyMap: Record<string, { label: string; sortKey: number; spend: number; paid: number; debt: number; count: number }> = {};
        const supplierMap: Record<string, { name: string; total: number; count: number }> = {};
        const statusMap: Record<string, { name: string; count: number; total: number; color: string }> = {
            PAID: { name: 'Đã thanh toán đủ', count: 0, total: 0, color: STATUS_COLORS.PAID },
            PARTIAL_PAID: { name: 'Thanh toán 1 phần', count: 0, total: 0, color: STATUS_COLORS.PARTIAL_PAID },
            APPROVED: { name: 'Đã duyệt (Chưa trả)', count: 0, total: 0, color: STATUS_COLORS.APPROVED },
            DRAFT: { name: 'Lưu nháp', count: 0, total: 0, color: STATUS_COLORS.DRAFT }
        };

        bills.forEach(bill => {
            const amount = Number(bill.totalAmount) || 0;
            const paid = Number(bill.paidAmount) || 0;
            const remaining = Math.max(0, amount - paid);
            const st = bill.status || 'DRAFT';

            if (st !== 'CANCELLED') {
                totalSpend += amount;
                totalPaid += paid;
                totalDebt += remaining;
                activeCount++;

                // Status mapping
                if (statusMap[st]) {
                    statusMap[st].count++;
                    statusMap[st].total += amount;
                }

                // Monthly mapping
                const d = bill.date ? new Date(bill.date) : new Date(bill.createdAt);
                if (!isNaN(d.getTime())) {
                    const monthKey = `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
                    const sortKey = d.getFullYear() * 100 + (d.getMonth() + 1);

                    if (!monthlyMap[monthKey]) {
                        monthlyMap[monthKey] = { label: monthKey, sortKey, spend: 0, paid: 0, debt: 0, count: 0 };
                    }
                    monthlyMap[monthKey].spend += amount;
                    monthlyMap[monthKey].paid += paid;
                    monthlyMap[monthKey].debt += remaining;
                    monthlyMap[monthKey].count++;
                }

                // Supplier mapping
                const supName = bill.supplier?.name || 'Nhà cung cấp khác';
                if (!supplierMap[supName]) {
                    supplierMap[supName] = { name: supName, total: 0, count: 0 };
                }
                supplierMap[supName].total += amount;
                supplierMap[supName].count++;
            }
        });

        // Sorted Timeline (last 6 months)
        const timelineData = Object.values(monthlyMap)
            .sort((a, b) => a.sortKey - b.sortKey)
            .slice(-6);

        // Status Pie Data
        const statusPieData = Object.values(statusMap)
            .filter(item => item.count > 0)
            .map(item => ({
                name: item.name,
                value: item.total,
                count: item.count,
                color: item.color
            }));

        // Top 5 Suppliers by Spend
        const top5Suppliers = Object.values(supplierMap)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map((s, idx) => ({
                ...s,
                color: SUPPLIER_COLORS[idx % SUPPLIER_COLORS.length]
            }));

        const paidRate = totalSpend > 0 ? Math.round((totalPaid / totalSpend) * 100) : 0;

        return {
            totalSpend,
            totalPaid,
            totalDebt,
            activeCount,
            paidRate,
            timelineData,
            statusPieData,
            top5Suppliers
        };
    }, [bills]);

    if (!isMounted) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs">
                        <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Phân Tích Chi Phí Mua Hàng &amp; Dòng Tiền Trả Nhà Cung Cấp</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                {stats.activeCount} hóa đơn
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 hidden sm:block">
                            Trực quan hóa giá trị nhập hàng theo tháng, cơ cấu công nợ và các đối tác cung ứng chủ chốt
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    {!isCollapsed && (
                        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => setViewMode('MONTH')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'MONTH'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Xu Hướng Tháng
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('SUPPLIER')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    viewMode === 'SUPPLIER'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Top Nhà Cung Cấp
                            </button>
                        </div>
                    )}

                    {/* Collapse Button */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
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
                    {/* Summary Mini Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng Giá Trị Mua</span>
                            <div className="text-base sm:text-lg font-black font-mono text-slate-900 dark:text-white mt-0.5">
                                {formatVND(stats.totalSpend)}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Đã Thanh Toán</span>
                            <div className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                                {formatVND(stats.totalPaid)}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Nợ Chưa Thanh Toán</span>
                            <div className="text-base sm:text-lg font-black font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                                {formatVND(stats.totalDebt)}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Tỷ Lệ Đã Trả NCC</span>
                            <div className="text-base sm:text-lg font-black font-mono text-blue-600 dark:text-blue-400 mt-0.5 flex items-baseline gap-1.5">
                                <span>{stats.paidRate}%</span>
                                <span className="text-[10px] font-normal text-slate-400">hoàn thành</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* CHART 1 (7 Cols): Xu Hướng Mua Hàng & Thanh Toán Theo Tháng */}
                        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        Xu Hướng Mua Hàng &amp; Dòng Tiền Trả ({stats.timelineData.length} Kỳ gần nhất)
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-semibold">
                                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 dark:bg-slate-400 inline-block" /> Tổng Mua
                                    </span>
                                    <span className="flex items-center gap-1 text-emerald-600">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Đã Trả
                                    </span>
                                    <span className="flex items-center gap-1 text-rose-600">
                                        <span className="w-2.5 h-1 rounded-sm bg-rose-500 inline-block" /> Còn Nợ
                                    </span>
                                </div>
                            </div>

                            <div className="h-56 sm:h-64 w-full">
                                {stats.timelineData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={stats.timelineData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                                            <XAxis 
                                                dataKey="label" 
                                                tick={{ fontSize: 11, fill: '#64748b' }} 
                                                axisLine={{ stroke: '#cbd5e1' }}
                                                tickLine={false}
                                            />
                                            <YAxis 
                                                tick={{ fontSize: 10, fill: '#64748b' }} 
                                                tickFormatter={val => formatShortVND(val)}
                                                axisLine={false}
                                                tickLine={false}
                                            />
                                            <Tooltip
                                                content={({ active, payload, label }) => {
                                                    if (!active || !payload || !payload.length) return null;
                                                    const item = payload[0].payload;
                                                    return (
                                                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1 z-50">
                                                            <div className="font-bold text-amber-300 border-b border-slate-800 pb-1 mb-1">
                                                                Kỳ {label} ({item.count} đơn)
                                                            </div>
                                                            <div className="flex items-center justify-between gap-3 text-slate-300">
                                                                <span>Tổng tiền mua:</span>
                                                                <span className="font-bold font-mono">{formatVND(item.spend)}</span>
                                                            </div>
                                                            <div className="text-emerald-400 flex items-center justify-between gap-3">
                                                                <span>Đã thanh toán:</span>
                                                                <span className="font-bold font-mono">{formatVND(item.paid)}</span>
                                                            </div>
                                                            <div className="text-rose-400 flex items-center justify-between gap-3 font-bold border-t border-slate-800 pt-1">
                                                                <span>Còn nợ NCC:</span>
                                                                <span className="font-mono">{formatVND(item.debt)}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Bar dataKey="spend" fill="#475569" radius={[4, 4, 0, 0]} barSize={16} />
                                            <Bar dataKey="paid" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                                            <Line type="monotone" dataKey="debt" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: '#f43f5e' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                                        Chưa có đủ dữ liệu theo tháng để vẽ biểu đồ
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CHART 2 (5 Cols): Phân Bổ Tình Trạng Hóa Đơn & Top Nhà Cung Cấp */}
                        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        {viewMode === 'MONTH' ? 'Cơ Cấu Giá Trị Theo Tình Trạng' : 'Top 5 Nhà Cung Cấp Chi Tiêu Nhiều Nhất'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {viewMode === 'MONTH' ? `${stats.statusPieData.length} trạng thái` : `${stats.top5Suppliers.length} đối tác`}
                                </span>
                            </div>

                            {viewMode === 'MONTH' ? (
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                    {/* Donut Chart */}
                                    <div className="sm:col-span-6 h-48 sm:h-56 relative flex items-center justify-center">
                                        {stats.statusPieData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.statusPieData}
                                                        innerRadius={46}
                                                        outerRadius={68}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {stats.statusPieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload || !payload.length) return null;
                                                            const p = payload[0].payload;
                                                            const pct = stats.totalSpend > 0 ? Math.round((p.value / stats.totalSpend) * 100) : 0;
                                                            return (
                                                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700">
                                                                    <div className="font-bold" style={{ color: p.color }}>{p.name}</div>
                                                                    <div>Giá trị: <span className="font-mono font-bold">{formatVND(p.value)}</span> ({pct}%)</div>
                                                                    <div className="text-slate-400 text-[11px]">Số lượng: {p.count} hóa đơn</div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Chưa có dữ liệu</div>
                                        )}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">Đã trả</span>
                                            <span className="text-base font-black font-mono text-emerald-600">
                                                {stats.paidRate}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Status Legend */}
                                    <div className="sm:col-span-6 space-y-2 text-xs">
                                        {stats.statusPieData.map((item, idx) => {
                                            const pct = stats.totalSpend > 0 ? Math.round((item.value / stats.totalSpend) * 100) : 0;
                                            return (
                                                <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                        <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                                                        {pct}%
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                /* Top 5 Suppliers List */
                                <div className="h-56 sm:h-64 flex flex-col justify-around space-y-2">
                                    {stats.top5Suppliers.length > 0 ? (
                                        stats.top5Suppliers.map((sup, sIdx) => {
                                            const pct = stats.totalSpend > 0 ? Math.round((sup.total / stats.totalSpend) * 100) : 0;
                                            return (
                                                <div key={sIdx} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                            <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] flex items-center justify-center shrink-0">
                                                                {sIdx + 1}
                                                            </span>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={sup.name}>
                                                                {sup.name}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                ({sup.count} HĐ)
                                                            </span>
                                                        </div>
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                                                            {formatVND(sup.total)}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full transition-all"
                                                            style={{ width: `${Math.min(100, pct)}%`, backgroundColor: sup.color }}
                                                            title={`Chiếm ${pct}% tổng chi phí mua`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                                            Chưa có nhà cung cấp phát sinh mua hàng
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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
    Legend,
    PieChart,
    Pie,
    Cell,
    Line,
    ComposedChart
} from 'recharts';
import {
    TrendingUp,
    TrendingDown,
    ArrowDownRight,
    ArrowUpRight,
    Wallet,
    PieChart as PieChartIcon,
    BarChart3,
    ChevronDown,
    ChevronUp,
    Sparkles,
    Building2,
    Calendar,
    Scale
} from 'lucide-react';

interface Props {
    transactions: any[];
    accounts?: any[];
}

const COLORS = [
    '#10b981', // emerald
    '#0ea5e9', // sky
    '#8b5cf6', // violet
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#64748b'  // slate
];

export function CashBookAnalyticsBar({ transactions = [], accounts = [] }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [chartMode, setChartMode] = useState<'MONTH' | 'ACCOUNT'>('MONTH');

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

    // Analytics Aggregation
    const stats = useMemo(() => {
        let totalReceipt = 0;
        let totalPayment = 0;
        const timelineMap: Record<string, { label: string; sortKey: number; receipt: number; payment: number; net: number }> = {};
        const accountMap: Record<string, { name: string; receipt: number; payment: number; total: number }> = {};

        transactions.forEach(tx => {
            const amount = Number(tx.amount) || 0;
            const isReceipt = tx.type === 'RECEIPT';
            const isPayment = tx.type === 'PAYMENT';

            if (isReceipt) totalReceipt += amount;
            if (isPayment) totalPayment += amount;

            // Timeline key (Group by Month or Date)
            const dateObj = tx.transactionDate ? new Date(tx.transactionDate) : new Date();
            if (!isNaN(dateObj.getTime())) {
                const monthKey = `T${dateObj.getMonth() + 1}/${String(dateObj.getFullYear()).slice(-2)}`;
                const sortKey = dateObj.getFullYear() * 100 + (dateObj.getMonth() + 1);

                if (!timelineMap[monthKey]) {
                    timelineMap[monthKey] = { label: monthKey, sortKey, receipt: 0, payment: 0, net: 0 };
                }
                if (isReceipt) timelineMap[monthKey].receipt += amount;
                if (isPayment) timelineMap[monthKey].payment += amount;
                timelineMap[monthKey].net = timelineMap[monthKey].receipt - timelineMap[monthKey].payment;
            }

            // Account key
            const accName = tx.financeAccount?.name || 'Tiền mặt VP';
            if (!accountMap[accName]) {
                accountMap[accName] = { name: accName, receipt: 0, payment: 0, total: 0 };
            }
            if (isReceipt) accountMap[accName].receipt += amount;
            if (isPayment) accountMap[accName].payment += amount;
            accountMap[accName].total += amount;
        });

        // Sorted Timeline (last 6 - 12 months)
        const timelineData = Object.values(timelineMap)
            .sort((a, b) => a.sortKey - b.sortKey)
            .slice(-6);

        // Account Donut Data
        const accountPieData = Object.values(accountMap)
            .filter(item => item.total > 0)
            .map((item, index) => ({
                name: item.name,
                value: item.total,
                receipt: item.receipt,
                payment: item.payment,
                color: COLORS[index % COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);

        const netDifference = totalReceipt - totalPayment;
        const burnRate = totalReceipt > 0 ? Math.round((totalPayment / totalReceipt) * 100) : 0;

        return {
            totalReceipt,
            totalPayment,
            netDifference,
            burnRate,
            timelineData,
            accountPieData,
            transactionCount: transactions.length
        };
    }, [transactions]);

    if (!isMounted) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-2xs">
                        <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Phân Tích Dòng Tiền & Biểu Đồ Thu - Chi</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                {stats.transactionCount} chứng từ
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 hidden sm:block">
                            Trực quan hóa xu hướng thu chi, cân đối dòng tiền và cơ cấu theo từng quỹ
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* View Switcher */}
                    {!isCollapsed && (
                        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => setChartMode('MONTH')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    chartMode === 'MONTH'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Theo Tháng
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartMode('ACCOUNT')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    chartMode === 'ACCOUNT'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Theo Tài Khoản / Quỹ
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
                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* CHART 1 (7 Cols): Xu hướng Thu vs Chi vs Dòng tiền ròng */}
                        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        Xu Hướng Dòng Tiền Thu - Chi ({stats.timelineData.length} Kỳ gần nhất)
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-[10px] font-semibold">
                                    <span className="flex items-center gap-1 text-emerald-600">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Thu
                                    </span>
                                    <span className="flex items-center gap-1 text-rose-600">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Chi
                                    </span>
                                    <span className="flex items-center gap-1 text-indigo-600">
                                        <span className="w-2.5 h-1 rounded-sm bg-indigo-500 inline-block" /> Ròng
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
                                                                Kỳ {label}
                                                            </div>
                                                            <div className="text-emerald-400 flex items-center justify-between gap-3">
                                                                <span>Thu:</span>
                                                                <span className="font-bold font-mono">+{formatVND(item.receipt)}</span>
                                                            </div>
                                                            <div className="text-rose-400 flex items-center justify-between gap-3">
                                                                <span>Chi:</span>
                                                                <span className="font-bold font-mono">-{formatVND(item.payment)}</span>
                                                            </div>
                                                            <div className="text-indigo-300 pt-1 border-t border-slate-800 flex items-center justify-between gap-3 font-bold">
                                                                <span>Chênh lệch ròng:</span>
                                                                <span className="font-mono">
                                                                    {item.net >= 0 ? '+' : ''}{formatVND(item.net)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Bar dataKey="receipt" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                                            <Bar dataKey="payment" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={16} />
                                            <Line type="monotone" dataKey="net" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                                        Chưa có đủ dữ liệu theo tháng để vẽ biểu đồ
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CHART 2 (5 Cols): Cơ cấu Thu - Chi theo Tài Khoản / Quỹ */}
                        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-blue-600" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        Cơ Cấu Dòng Tiền Theo Quỹ / Tài Khoản
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {stats.accountPieData.length} Quỹ phát sinh
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                {/* Donut Pie */}
                                <div className="sm:col-span-6 h-48 sm:h-56 relative flex items-center justify-center">
                                    {stats.accountPieData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats.accountPieData}
                                                    innerRadius={46}
                                                    outerRadius={68}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {stats.accountPieData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    content={({ active, payload }) => {
                                                        if (!active || !payload || !payload.length) return null;
                                                        const p = payload[0].payload;
                                                        const percent = stats.totalReceipt + stats.totalPayment > 0
                                                            ? Math.round((p.value / (stats.totalReceipt + stats.totalPayment)) * 100)
                                                            : 0;
                                                        return (
                                                            <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700">
                                                                <div className="font-bold text-amber-300">{p.name}</div>
                                                                <div>Tổng lưu chuyển: <span className="font-bold font-mono">{formatVND(p.value)}</span> ({percent}%)</div>
                                                                <div className="text-emerald-400 text-[11px]">Thu: +{formatVND(p.receipt)}</div>
                                                                <div className="text-rose-400 text-[11px]">Chi: -{formatVND(p.payment)}</div>
                                                            </div>
                                                        );
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-xs text-slate-400 italic">Chưa có giao dịch</div>
                                    )}

                                    {/* Donut Center Label */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Tỷ lệ Chi/Thu</span>
                                        <span className={`text-base font-black font-mono ${stats.burnRate > 100 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {stats.burnRate}%
                                        </span>
                                    </div>
                                </div>

                                {/* Account Legend List */}
                                <div className="sm:col-span-6 space-y-1.5 max-h-52 overflow-y-auto pr-1 text-xs">
                                    {stats.accountPieData.slice(0, 4).map((acc, idx) => (
                                        <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                                                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                                                    {acc.name}
                                                </span>
                                            </div>
                                            <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                                                {formatShortVND(acc.value)}
                                            </span>
                                        </div>
                                    ))}
                                    {stats.accountPieData.length > 4 && (
                                        <div className="text-[10px] text-center text-slate-400 pt-0.5">
                                            + {stats.accountPieData.length - 4} tài khoản/quỹ khác
                                        </div>
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

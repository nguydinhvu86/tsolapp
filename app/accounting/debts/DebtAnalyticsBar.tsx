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
    Cell,
    PieChart,
    Pie
} from 'recharts';
import {
    Scale,
    AlertCircle,
    CheckCircle2,
    Clock,
    TrendingDown,
    ChevronDown,
    ChevronUp,
    ShieldAlert,
    Building2,
    Users,
    BarChart3,
    PieChart as PieChartIcon
} from 'lucide-react';

interface Props {
    partnerDebts: any[];
    tab: 'customers' | 'suppliers';
}

const AGING_COLORS = {
    inDue: '#10b981',       // emerald (trong hạn)
    aging1to30: '#f59e0b',  // amber (1-30 ngày)
    aging31to60: '#f97316', // orange (31-60 ngày)
    aging61to90: '#f43f5e', // rose (61-90 ngày)
    agingOver90: '#dc2626'  // red (trên 90 ngày)
};

export function DebtAnalyticsBar({ partnerDebts = [], tab }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

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

    // Calculate Aging Breakdown & Top 5
    const stats = useMemo(() => {
        let totalDebt = 0;
        let totalOverdue = 0;
        let inDue = 0;
        let aging1to30 = 0;
        let aging31to60 = 0;
        let aging61to90 = 0;
        let agingOver90 = 0;

        partnerDebts.forEach(p => {
            totalDebt += p.currentDebt || 0;
            totalOverdue += p.totalOverdue || 0;
            inDue += p.inDue || 0;
            aging1to30 += p.overdue1to30 || 0;
            aging31to60 += p.overdue31to60 || 0;
            aging61to90 += p.overdue61to90 || 0;
            agingOver90 += p.overdueOver90 || 0;
        });

        const inDueRate = totalDebt > 0 ? Math.round((inDue / totalDebt) * 100) : 0;
        const overdueRate = totalDebt > 0 ? Math.round((totalOverdue / totalDebt) * 100) : 0;

        // Aging Histogram Data
        const agingData = [
            {
                key: 'inDue',
                label: 'Trong hạn',
                amount: inDue,
                color: AGING_COLORS.inDue,
                desc: 'Chưa tới hạn trả'
            },
            {
                key: 'o1',
                label: '1 - 30 ngày',
                amount: aging1to30,
                color: AGING_COLORS.aging1to30,
                desc: 'Quá hạn nhẹ'
            },
            {
                key: 'o2',
                label: '31 - 60 ngày',
                amount: aging31to60,
                color: AGING_COLORS.aging31to60,
                desc: 'Cần đôn đốc'
            },
            {
                key: 'o3',
                label: '61 - 90 ngày',
                amount: aging61to90,
                color: AGING_COLORS.aging61to90,
                desc: 'Rủi ro cao'
            },
            {
                key: 'o4',
                label: '> 90 ngày',
                amount: agingOver90,
                color: AGING_COLORS.agingOver90,
                desc: 'Nợ xấu / khó đòi'
            }
        ];

        // Top 5 Partners by Current Debt
        const top5Partners = [...partnerDebts]
            .filter(p => (p.currentDebt || 0) > 0)
            .sort((a, b) => (b.currentDebt || 0) - (a.currentDebt || 0))
            .slice(0, 5)
            .map(p => {
                const partnerName = p.name || 'Đối tác';
                const shortName = partnerName.length > 20 ? partnerName.slice(0, 18) + '...' : partnerName;
                return {
                    name: shortName,
                    fullName: partnerName,
                    code: p.code,
                    debt: p.currentDebt || 0,
                    overdue: p.totalOverdue || 0,
                    inDue: p.inDue || 0
                };
            });

        return {
            totalDebt,
            totalOverdue,
            inDue,
            inDueRate,
            overdueRate,
            agingData,
            top5Partners,
            totalCount: partnerDebts.length
        };
    }, [partnerDebts]);

    if (!isMounted) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shadow-2xs">
                        <Scale className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Biểu Đồ Phân Tích Tuổi Nợ &amp; Top Đối Tác Chiếm Dụng</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
                                {tab === 'customers' ? 'Phải thu KH (AR)' : 'Phải trả NCC (AP)'}
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 hidden sm:block">
                            Phân tích chi tiết rủi ro tuổi nợ theo từng phân đoạn và đối tác có số dư lớn nhất
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Health Pill Indicator */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <span>Trong hạn: <strong className="text-emerald-600">{stats.inDueRate}%</strong></span>
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <span>Quá hạn: <strong className={stats.overdueRate > 30 ? 'text-rose-600' : 'text-amber-600'}>{stats.overdueRate}%</strong></span>
                    </div>

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
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* CHART 1 (6 Cols): Biểu đồ Cột Phân Tích Tuổi Nợ (Aging Histogram) */}
                        <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-600" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        Phân Bổ Tuổi Nợ Theo Phân Đoạn
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    Tổng: {formatShortVND(stats.totalDebt)}
                                </span>
                            </div>

                            <div className="h-56 sm:h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.agingData} margin={{ top: 15, right: 10, left: -15, bottom: 0 }}>
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
                                            content={({ active, payload }) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const d = payload[0].payload;
                                                const pct = stats.totalDebt > 0 ? Math.round((d.amount / stats.totalDebt) * 100) : 0;
                                                return (
                                                    <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-xl border border-slate-700">
                                                        <div className="font-bold flex items-center justify-between gap-3">
                                                            <span style={{ color: d.color }}>{d.label}</span>
                                                            <span className="text-[10px] text-slate-400 font-normal">{d.desc}</span>
                                                        </div>
                                                        <div className="text-white font-bold font-mono">
                                                            {formatVND(d.amount)} ({pct}%)
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar dataKey="amount" radius={[6, 6, 0, 0]} barSize={32}>
                                            {stats.agingData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 2 (6 Cols): Top 5 Đối Tác Có Số Dư Nợ Lớn Nhất */}
                        <div className="lg:col-span-6 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    {tab === 'customers' ? <Users className="w-4 h-4 text-emerald-600" /> : <Building2 className="w-4 h-4 text-amber-600" />}
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        Top 5 Đối Tác Có Dư Nợ Lớn Nhất
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {tab === 'customers' ? 'Nợ công ty nhiều nhất' : 'Công ty cần trả nhiều nhất'}
                                </span>
                            </div>

                            <div className="h-56 sm:h-64 w-full flex flex-col justify-around space-y-2">
                                {stats.top5Partners.length > 0 ? (
                                    stats.top5Partners.map((partner, pIdx) => {
                                        const pct = stats.totalDebt > 0 ? Math.round((partner.debt / stats.totalDebt) * 100) : 0;
                                        const hasOverdue = (partner.overdue || 0) > 0;
                                        return (
                                            <div key={pIdx} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                        <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-black text-[10px] flex items-center justify-center shrink-0">
                                                            {pIdx + 1}
                                                        </span>
                                                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={partner.fullName}>
                                                            {partner.fullName}
                                                        </span>
                                                        {partner.code && (
                                                            <span className="text-[10px] text-slate-400 shrink-0">
                                                                ({partner.code})
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {hasOverdue && (
                                                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded-md">
                                                                Quá hạn: {formatShortVND(partner.overdue)}
                                                            </span>
                                                        )}
                                                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                                                            {formatVND(partner.debt)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Stacked Progress Bar */}
                                                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
                                                    <div 
                                                        className="h-full bg-blue-500 rounded-l-full transition-all"
                                                        style={{ width: `${Math.min(100, pct)}%` }}
                                                        title={`Chiếm ${pct}% tổng dư nợ`}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                                        Không có đối tác nào đang có số dư nợ
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

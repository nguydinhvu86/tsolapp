'use client';

import React, { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    CartesianGrid
} from 'recharts';
import {
    Trophy,
    Award,
    TrendingUp,
    Calendar,
    ArrowRightLeft,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    Check
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface SalesLeaderboardProps {
    invoices?: any[];
    quotes?: any[];
    leads?: any[];
    users?: any[];
}

function getPeriodRange(key: string, now: Date) {
    const year = now.getFullYear();
    const month = now.getMonth();

    if (key.startsWith('MONTH_')) {
        const parts = key.split('_');
        const y = parseInt(parts[1], 10);
        const m = parseInt(parts[2], 10);
        return {
            start: new Date(y, m, 1, 0, 0, 0, 0),
            end: new Date(y, m + 1, 0, 23, 59, 59, 999),
            label: `Tháng ${m + 1}/${y}`
        };
    }

    switch (key) {
        case 'THIS_MONTH':
            return {
                start: new Date(year, month, 1, 0, 0, 0, 0),
                end: new Date(year, month + 1, 0, 23, 59, 59, 999),
                label: `Tháng ${month + 1}/${year}`
            };
        case 'LAST_MONTH': {
            const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
            const end = new Date(year, month, 0, 23, 59, 59, 999);
            return {
                start,
                end,
                label: `Tháng ${start.getMonth() + 1}/${start.getFullYear()}`
            };
        }
        case 'THIS_QUARTER': {
            const q = Math.floor(month / 3);
            return {
                start: new Date(year, q * 3, 1, 0, 0, 0, 0),
                end: new Date(year, (q + 1) * 3, 0, 23, 59, 59, 999),
                label: `Quý ${q + 1}/${year}`
            };
        }
        case 'LAST_QUARTER': {
            const q = Math.floor(month / 3);
            const prevQ = ((q - 1 + 4) % 4) + 1;
            const prevY = q === 0 ? year - 1 : year;
            return {
                start: new Date(year, (q - 1) * 3, 1, 0, 0, 0, 0),
                end: new Date(year, q * 3, 0, 23, 59, 59, 999),
                label: `Quý ${prevQ}/${prevY}`
            };
        }
        case 'THIS_YEAR':
            return {
                start: new Date(year, 0, 1, 0, 0, 0, 0),
                end: new Date(year, 11, 31, 23, 59, 59, 999),
                label: `Năm ${year}`
            };
        case 'ALL':
            return {
                start: new Date(2000, 0, 1),
                end: new Date(2100, 11, 31),
                label: 'Toàn thời gian'
            };
        default:
            return {
                start: new Date(year, month, 1, 0, 0, 0, 0),
                end: new Date(year, month + 1, 0, 23, 59, 59, 999),
                label: `Tháng ${month + 1}/${year}`
            };
    }
}

function getComparisonRange(
    compKey: string,
    currentRangeKey: string,
    currentRange: { start: Date; end: Date; label: string },
    now: Date
) {
    if (compKey === 'NONE' || currentRangeKey === 'ALL') return null;

    if (compKey === 'PREVIOUS') {
        const start = currentRange.start;
        if (
            currentRangeKey === 'THIS_MONTH' ||
            currentRangeKey.startsWith('MONTH_') ||
            currentRangeKey === 'LAST_MONTH'
        ) {
            const prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1, 0, 0, 0, 0);
            const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0, 23, 59, 59, 999);
            return {
                start: prevStart,
                end: prevEnd,
                label: `Tháng ${prevStart.getMonth() + 1}/${prevStart.getFullYear()}`
            };
        }
        if (currentRangeKey === 'THIS_QUARTER') {
            const y = now.getFullYear();
            const q = Math.floor(now.getMonth() / 3);
            const prevStart = new Date(y, (q - 1) * 3, 1, 0, 0, 0, 0);
            const prevEnd = new Date(y, q * 3, 0, 23, 59, 59, 999);
            const prevQ = ((q - 1 + 4) % 4) + 1;
            const prevY = q === 0 ? y - 1 : y;
            return { start: prevStart, end: prevEnd, label: `Quý ${prevQ}/${prevY}` };
        }
        if (currentRangeKey === 'THIS_YEAR') {
            const y = now.getFullYear();
            return {
                start: new Date(y - 1, 0, 1, 0, 0, 0, 0),
                end: new Date(y - 1, 11, 31, 23, 59, 59, 999),
                label: `Năm ${y - 1}`
            };
        }
        const diff = currentRange.end.getTime() - currentRange.start.getTime();
        const prevEnd = new Date(currentRange.start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - diff);
        return { start: prevStart, end: prevEnd, label: 'Kỳ trước' };
    }

    if (compKey === 'SAME_LAST_YEAR') {
        const start = currentRange.start;
        const end = currentRange.end;
        const prevStart = new Date(start.getFullYear() - 1, start.getMonth(), start.getDate(), 0, 0, 0, 0);
        const prevEnd = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate(), 23, 59, 59, 999);
        return {
            start: prevStart,
            end: prevEnd,
            label: `Cùng kỳ ${prevStart.getFullYear()}`
        };
    }

    if (compKey.startsWith('MONTH_')) {
        return getPeriodRange(compKey, now);
    }

    return null;
}

function tallyPeriod(
    invoices: any[],
    quotes: any[],
    leads: any[],
    users: any[],
    start: Date,
    end: Date
) {
    const repMap = new Map<
        string,
        {
            id: string;
            name: string;
            avatar?: string | null;
            revenue: number;
            wonQuotes: number;
            totalLeads: number;
        }
    >();

    // Pre-initialize users
    users.forEach((u) => {
        if (u && u.id) {
            repMap.set(u.id, {
                id: u.id,
                name: u.name || 'Nhân viên',
                avatar: u.avatar,
                revenue: 0,
                wonQuotes: 0,
                totalLeads: 0
            });
        }
    });

    const isInRange = (rawDate: any) => {
        if (!rawDate) return false;
        const t = new Date(rawDate).getTime();
        return !isNaN(t) && t >= start.getTime() && t <= end.getTime();
    };

    let totalRevenue = 0;

    // Tally invoices
    invoices.forEach((inv) => {
        if (inv.status !== 'DRAFT' && inv.status !== 'CANCELLED') {
            const invDate = inv.date || inv.createdAt;
            if (isInRange(invDate)) {
                const rep = inv.salesperson || inv.creator;
                const repId = rep?.id || inv.salespersonId || inv.creatorId;
                const repName = rep?.name || 'Nhân viên';

                if (repId) {
                    if (!repMap.has(repId)) {
                        repMap.set(repId, {
                            id: repId,
                            name: repName,
                            avatar: rep?.avatar,
                            revenue: 0,
                            wonQuotes: 0,
                            totalLeads: 0
                        });
                    }
                    const entry = repMap.get(repId)!;
                    const amount = Number(inv.totalAmount) || 0;
                    entry.revenue += amount;
                    totalRevenue += amount;
                }
            }
        }
    });

    // Tally won quotes
    quotes.forEach((q) => {
        if (q.status === 'ACCEPTED') {
            const qDate = q.date || q.createdAt;
            if (isInRange(qDate)) {
                const rep = q.salesperson || q.creator;
                const repId = rep?.id || q.salespersonId || q.creatorId;
                if (repId && repMap.has(repId)) {
                    repMap.get(repId)!.wonQuotes += 1;
                }
            }
        }
    });

    // Tally leads
    leads.forEach((l) => {
        if (isInRange(l.createdAt)) {
            const repId = l.assignedToId || l.creatorId;
            if (repId && repMap.has(repId)) {
                repMap.get(repId)!.totalLeads += 1;
            }
        }
    });

    return { repMap, totalRevenue };
}

export function SalesLeaderboardWidget({
    invoices = [],
    quotes = [],
    leads = [],
    users = []
}: SalesLeaderboardProps) {
    // Default to 'THIS_MONTH' as requested by the user
    const [periodKey, setPeriodKey] = useState<string>('THIS_MONTH');
    const [compareKey, setCompareKey] = useState<string>('PREVIOUS');

    const now = useMemo(() => new Date(), []);

    // Generate recent 12 months for selector
    const monthOptions = useMemo(() => {
        const list = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const y = d.getFullYear();
            const m = d.getMonth();
            list.push({
                key: `MONTH_${y}_${m}`,
                label: `Tháng ${m + 1}/${y}${i === 0 ? ' (Hiện tại)' : ''}`
            });
        }
        return list;
    }, [now]);

    const currentRange = useMemo(() => getPeriodRange(periodKey, now), [periodKey, now]);
    const compareRange = useMemo(
        () => getComparisonRange(compareKey, periodKey, currentRange, now),
        [compareKey, periodKey, currentRange, now]
    );

    const isComparing = !!compareRange;

    const leaderboard = useMemo(() => {
        const { repMap: currentMap, totalRevenue: currentTotal } = tallyPeriod(
            invoices,
            quotes,
            leads,
            users,
            currentRange.start,
            currentRange.end
        );

        let prevMap: Map<string, any> | null = null;
        let prevTotal = 0;
        if (compareRange) {
            const res = tallyPeriod(
                invoices,
                quotes,
                leads,
                users,
                compareRange.start,
                compareRange.end
            );
            prevMap = res.repMap;
            prevTotal = res.totalRevenue;
        }

        // Collect all active reps in either period
        const allRepIds = new Set<string>();
        currentMap.forEach((_, id) => allRepIds.add(id));
        if (prevMap) {
            prevMap.forEach((_, id) => allRepIds.add(id));
        }

        const sorted = Array.from(allRepIds)
            .map((id) => {
                const curr = currentMap.get(id) || {
                    id,
                    name: 'Nhân viên',
                    avatar: null,
                    revenue: 0,
                    wonQuotes: 0,
                    totalLeads: 0
                };
                const prev = prevMap?.get(id) || {
                    id,
                    name: curr.name,
                    avatar: curr.avatar,
                    revenue: 0,
                    wonQuotes: 0,
                    totalLeads: 0
                };

                const revenueDiff = curr.revenue - prev.revenue;
                let growthRate: number | null = null;
                if (prev.revenue > 0) {
                    growthRate = ((curr.revenue - prev.revenue) / prev.revenue) * 100;
                } else if (curr.revenue > 0) {
                    growthRate = 100;
                }

                return {
                    id,
                    name: curr.name || prev.name,
                    avatar: curr.avatar || prev.avatar,
                    revenue: curr.revenue,
                    wonQuotes: curr.wonQuotes,
                    totalLeads: curr.totalLeads,
                    prevRevenue: prev.revenue,
                    prevWonQuotes: prev.wonQuotes,
                    prevTotalLeads: prev.totalLeads,
                    revenueDiff,
                    growthRate,
                    isNewInPeriod: prev.revenue === 0 && curr.revenue > 0
                };
            })
            .filter((r) => r.revenue > 0 || r.prevRevenue > 0 || r.wonQuotes > 0 || r.totalLeads > 0)
            .sort((a, b) => {
                if (b.revenue !== a.revenue) return b.revenue - a.revenue;
                return b.prevRevenue - a.prevRevenue;
            })
            .slice(0, 5);

        const totalRevenueDiff = currentTotal - prevTotal;
        let totalGrowthRate: number | null = null;
        if (prevTotal > 0) {
            totalGrowthRate = ((currentTotal - prevTotal) / prevTotal) * 100;
        } else if (currentTotal > 0) {
            totalGrowthRate = 100;
        }

        return {
            ranks: sorted,
            currentTotal,
            prevTotal,
            totalRevenueDiff,
            totalGrowthRate
        };
    }, [invoices, quotes, leads, users, currentRange, compareRange]);

    // Palettes for Sales Reps
    const REP_COLORS = [
        { start: '#f59e0b', end: '#d97706' }, // #1 Gold
        { start: '#64748b', end: '#475569' }, // #2 Silver
        { start: '#d97706', end: '#b45309' }, // #3 Bronze
        { start: '#3b82f6', end: '#1d4ed8' }, // #4
        { start: '#8b5cf6', end: '#6d28d9' }  // #5
    ];

    const chartItems = leaderboard.ranks.map((rep, idx) => {
        const share =
            leaderboard.currentTotal > 0
                ? (rep.revenue / leaderboard.currentTotal) * 100
                : 0;
        const color = REP_COLORS[idx] || REP_COLORS[0];
        return {
            ...rep,
            shortName:
                rep.name.length > 15 ? rep.name.substring(0, 14) + '...' : rep.name,
            share: share.toFixed(1),
            colorStart: color.start,
            colorEnd: color.end,
            gradientId: `repGrad_${idx}`
        };
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full">
            {/* 1. Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Trophy size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                                Bảng Xếp Hạng Hiệu Suất Bán Hàng (Leaderboard)
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Thi đua Kinh doanh
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {currentRange.label}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-none mt-1">
                            Xếp hạng nhân viên kinh doanh dẫn đầu về doanh số hóa đơn và báo giá thành công
                        </p>
                    </div>
                </div>

                {/* Total Revenue & Comparison Summary Pill */}
                <div className="flex items-center gap-2 shrink-0">
                    <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50/50 text-amber-900 border border-amber-200/70 text-xs font-bold flex flex-col items-end shadow-2xs">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-amber-800 font-medium">🏆 Tổng Doanh số:</span>
                            <span className="font-mono text-sm font-black text-amber-950">
                                {formatMoney(leaderboard.currentTotal)}
                            </span>
                        </div>
                        {isComparing && (
                            <div className="flex items-center gap-1 text-[10.5px] font-semibold mt-0.5">
                                <span className="text-slate-500 font-normal">vs {compareRange.label}:</span>
                                {leaderboard.totalRevenueDiff > 0 ? (
                                    <span className="text-emerald-700 flex items-center gap-0.5">
                                        <ArrowUpRight size={12} strokeWidth={2.5} />
                                        +{leaderboard.totalGrowthRate?.toFixed(1)}% (+{formatMoney(leaderboard.totalRevenueDiff)})
                                    </span>
                                ) : leaderboard.totalRevenueDiff < 0 ? (
                                    <span className="text-rose-600 flex items-center gap-0.5">
                                        <ArrowDownRight size={12} strokeWidth={2.5} />
                                        {leaderboard.totalGrowthRate?.toFixed(1)}% ({formatMoney(leaderboard.totalRevenueDiff)})
                                    </span>
                                ) : (
                                    <span className="text-slate-500">0% (Bằng nhau)</span>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Period Selection & Comparison Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 py-2.5 px-3 bg-slate-50/90 rounded-xl border border-slate-200/80 my-3.5 text-xs">
                {/* Left: Quick Period Pills & Selector */}
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 mr-1">
                        <Calendar size={13} className="text-amber-600" />
                        Giai đoạn:
                    </span>

                    <button
                        type="button"
                        onClick={() => setPeriodKey('THIS_MONTH')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            periodKey === 'THIS_MONTH'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        Tháng này
                    </button>

                    <button
                        type="button"
                        onClick={() => setPeriodKey('LAST_MONTH')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            periodKey === 'LAST_MONTH'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        Tháng trước
                    </button>

                    <button
                        type="button"
                        onClick={() => setPeriodKey('THIS_QUARTER')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            periodKey === 'THIS_QUARTER'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        Quý này
                    </button>

                    <button
                        type="button"
                        onClick={() => setPeriodKey('THIS_YEAR')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            periodKey === 'THIS_YEAR'
                                ? 'bg-amber-500 text-white shadow-2xs'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        Năm nay
                    </button>

                    {/* Month Picker dropdown */}
                    <select
                        value={periodKey}
                        onChange={(e) => setPeriodKey(e.target.value)}
                        className="px-2 py-1 rounded-lg text-xs font-medium bg-white text-slate-700 border border-slate-300 focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                        title="Chọn tháng cụ thể"
                    >
                        <optgroup label="Kỳ thống kê">
                            <option value="THIS_MONTH">Tháng này (Hiện tại)</option>
                            <option value="LAST_MONTH">Tháng trước</option>
                            <option value="THIS_QUARTER">Quý này</option>
                            <option value="LAST_QUARTER">Quý trước</option>
                            <option value="THIS_YEAR">Năm nay</option>
                            <option value="ALL">Toàn thời gian</option>
                        </optgroup>
                        <optgroup label="Từng tháng cụ thể">
                            {monthOptions.map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                    {opt.label}
                                </option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                {/* Right: Comparison Mode Selector */}
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                        <ArrowRightLeft size={13} className="text-indigo-600" />
                        So sánh với:
                    </span>
                    <select
                        value={compareKey}
                        onChange={(e) => setCompareKey(e.target.value)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white text-slate-700 border border-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer shadow-2xs"
                    >
                        <option value="PREVIOUS">Kỳ trước liền kề</option>
                        <option value="SAME_LAST_YEAR">Cùng kỳ năm ngoái</option>
                        <optgroup label="So sánh với tháng">
                            {monthOptions.map((opt) => (
                                <option key={`comp_${opt.key}`} value={opt.key}>
                                    {opt.label}
                                </option>
                            ))}
                        </optgroup>
                        <option value="NONE">❌ Không so sánh</option>
                    </select>
                </div>
            </div>

            {/* 3. Main Split View: Recharts BarChart (Left) + Detailed Medal Cards (Right) */}
            {leaderboard.ranks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs flex-1">
                    <Award size={32} className="mb-2 text-slate-300" />
                    <span>Chưa có dữ liệu ghi nhận doanh số theo nhân viên trong giai đoạn {currentRange.label}.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
                    {/* Left: Recharts BarChart (7 Cols) */}
                    <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-amber-600" />
                                Biểu Đồ Doanh Số Theo Nhân Viên
                            </span>

                            {isComparing ? (
                                <div className="flex items-center gap-3 text-[11px] font-medium">
                                    <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
                                        <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block shadow-2xs" />
                                        <span>{currentRange.label} (Kỳ này)</span>
                                    </span>
                                    <span className="flex items-center gap-1.5 text-slate-500">
                                        <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block shadow-2xs" />
                                        <span>{compareRange.label} (Kỳ so sánh)</span>
                                    </span>
                                </div>
                            ) : (
                                <span className="text-[11px] font-medium text-slate-400">Đơn vị: VNĐ</span>
                            )}
                        </div>

                        <div className="w-full flex-1" style={{ minHeight: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={chartItems}
                                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                                >
                                    <defs>
                                        {chartItems.map((item) => (
                                            <linearGradient
                                                key={item.gradientId}
                                                id={item.gradientId}
                                                x1="0"
                                                y1="0"
                                                x2="1"
                                                y2="0"
                                            >
                                                <stop offset="0%" stopColor={item.colorStart} stopOpacity={0.9} />
                                                <stop offset="100%" stopColor={item.colorEnd} stopOpacity={1} />
                                            </linearGradient>
                                        ))}
                                        <linearGradient id="compGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#64748b" stopOpacity={0.95} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis
                                        type="number"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        tickFormatter={(val) => {
                                            if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} Tỷ`;
                                            if (val >= 1000000) return `${(val / 1000000).toFixed(0)} Tr`;
                                            return val;
                                        }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="shortName"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 600 }}
                                        width={105}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: '12px',
                                            border: '1px solid #cbd5e1',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            fontSize: '12px',
                                            padding: '10px 14px'
                                        }}
                                        formatter={(val: any, name: any, item: any) => {
                                            const num = Number(val) || 0;
                                            const isPrev = isComparing && name === compareRange?.label;
                                            if (isPrev) {
                                                return [formatMoney(num), `Kỳ so sánh (${name})`];
                                            }
                                            const diff = item.payload.revenueDiff;
                                            const growth = item.payload.growthRate;
                                            const diffStr =
                                                diff > 0 ? `+${formatMoney(diff)}` : formatMoney(diff);
                                            const growthStr =
                                                growth !== null
                                                    ? ` (${growth > 0 ? '+' : ''}${growth.toFixed(1)}%)`
                                                    : '';
                                            return [
                                                `${formatMoney(num)} ${
                                                    isComparing
                                                        ? `[${diffStr}${growthStr}]`
                                                        : `(${item.payload.share}%)`
                                                }`,
                                                item.payload.name
                                            ];
                                        }}
                                    />
                                    {isComparing && (
                                        <Bar
                                            dataKey="prevRevenue"
                                            name={compareRange.label}
                                            fill="url(#compGrad)"
                                            radius={[0, 6, 6, 0]}
                                            maxBarSize={18}
                                        />
                                    )}
                                    <Bar
                                        dataKey="revenue"
                                        name={currentRange.label}
                                        radius={[0, 6, 6, 0]}
                                        maxBarSize={isComparing ? 18 : 28}
                                    >
                                        {chartItems.map((entry) => (
                                            <Cell
                                                key={`cell-${entry.id}`}
                                                fill={`url(#${entry.gradientId})`}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Detailed Rep Cards (5 Cols) */}
                    <div className="lg:col-span-5 flex flex-col justify-between gap-2">
                        {chartItems.map((rep, idx) => {
                            const isTop1 = idx === 0;
                            const isTop2 = idx === 1;
                            const isTop3 = idx === 2;

                            return (
                                <div
                                    key={rep.id}
                                    className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-150 hover:shadow-xs hover:scale-[1.01] ${
                                        isTop1
                                            ? 'bg-gradient-to-r from-amber-50/90 via-yellow-50/40 to-white border-amber-300 ring-1 ring-amber-300/40'
                                            : isTop2
                                            ? 'bg-slate-50/70 border-slate-200'
                                            : 'bg-white border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    {/* Top Row: Medal + Name + Stats + Revenue */}
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {/* Rank Medal */}
                                            <div
                                                className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                                    isTop1
                                                        ? 'bg-amber-400 text-amber-950 font-black'
                                                        : isTop2
                                                        ? 'bg-slate-300 text-slate-800'
                                                        : isTop3
                                                        ? 'bg-amber-100 text-amber-800'
                                                        : 'bg-slate-100 text-slate-600'
                                                }`}
                                            >
                                                {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                                            </div>

                                            {/* Name & Stats */}
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                                    {rep.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                    <span>{rep.wonQuotes} báo giá chốt</span>
                                                    <span>•</span>
                                                    <span>{rep.totalLeads} cơ hội</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount & Share */}
                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-mono font-black text-emerald-700 block">
                                                {formatMoney(rep.revenue)}
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                                                {rep.share}%
                                            </span>
                                        </div>
                                    </div>

                                    {/* Comparison Details Row */}
                                    {isComparing && (
                                        <div className="pt-1.5 mt-1 border-t border-slate-100/80 flex items-center justify-between text-[10.5px]">
                                            <span className="text-slate-400 truncate mr-2">
                                                {compareRange.label}:{' '}
                                                <strong className="text-slate-600 font-mono">
                                                    {formatMoney(rep.prevRevenue)}
                                                </strong>
                                            </span>

                                            {rep.prevRevenue === 0 && rep.revenue > 0 ? (
                                                <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold text-[10px] shrink-0 border border-emerald-200/60">
                                                    <Sparkles size={11} className="text-emerald-500" />
                                                    Mới phát sinh
                                                </span>
                                            ) : rep.revenueDiff > 0 ? (
                                                <span className="inline-flex items-center gap-0.5 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] shrink-0 border border-emerald-200/60">
                                                    <ArrowUpRight size={12} strokeWidth={2.5} className="text-emerald-600" />
                                                    +{rep.growthRate?.toFixed(1)}% (+{formatMoney(rep.revenueDiff)})
                                                </span>
                                            ) : rep.revenueDiff < 0 ? (
                                                <span className="inline-flex items-center gap-0.5 text-rose-700 font-bold bg-rose-50 px-1.5 py-0.5 rounded text-[10px] shrink-0 border border-rose-200/60">
                                                    <ArrowDownRight size={12} strokeWidth={2.5} className="text-rose-600" />
                                                    {rep.growthRate?.toFixed(1)}% ({formatMoney(rep.revenueDiff)})
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px] shrink-0">
                                                    Không đổi (0%)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

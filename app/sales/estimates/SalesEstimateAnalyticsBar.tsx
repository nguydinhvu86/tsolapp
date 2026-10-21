'use client'

import React, { useState, useEffect, useMemo } from 'react';
import { 
    ResponsiveContainer, 
    PieChart, 
    Pie, 
    Cell, 
    Tooltip, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid 
} from 'recharts';
import { 
    TrendingUp, 
    CheckCircle2, 
    Clock, 
    Sparkles, 
    BarChart3, 
    PieChart as PieChartIcon,
    AlertCircle,
    FileText,
    ShoppingCart,
    Target
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface SalesEstimateAnalyticsBarProps {
    estimates: any[];
}

const ESTIMATE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    ACCEPTED: { label: 'Khách đã chốt', color: '#10b981', bg: '#d1fae5' },
    ORDERED: { label: 'Đã lên Đơn hàng (SO)', color: '#6366f1', bg: '#e0e7ff' },
    INVOICED: { label: 'Đã xuất Hóa đơn (SI)', color: '#059669', bg: '#d1fae5' },
    SENT: { label: 'Đang theo dõi / Đã gửi', color: '#3b82f6', bg: '#dbeafe' },
    DRAFT: { label: 'Bản nháp', color: '#f59e0b', bg: '#fef3c7' },
    EXPIRED: { label: 'Hết hạn hiệu lực', color: '#64748b', bg: '#f1f5f9' },
    REJECTED: { label: 'Từ chối / Hủy', color: '#ef4444', bg: '#fee2e2' }
};

export function SalesEstimateAnalyticsBar({ estimates }: SalesEstimateAnalyticsBarProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const stats = useMemo(() => {
        let totalPipeline = 0;
        let wonValue = 0;
        let inProgressValue = 0;
        let activeCount = 0;

        const statusMap: Record<string, { count: number; total: number }> = {
            ACCEPTED: { count: 0, total: 0 },
            ORDERED: { count: 0, total: 0 },
            INVOICED: { count: 0, total: 0 },
            SENT: { count: 0, total: 0 },
            DRAFT: { count: 0, total: 0 },
            EXPIRED: { count: 0, total: 0 },
            REJECTED: { count: 0, total: 0 }
        };

        const monthlyMap: Record<string, { month: string; value: number; count: number; sortKey: number }> = {};

        estimates.forEach(est => {
            const amount = Number(est.totalAmount) || 0;
            const st = est.status || 'DRAFT';

            if (!statusMap[st]) {
                statusMap[st] = { count: 0, total: 0 };
            }
            statusMap[st].count++;
            statusMap[st].total += amount;

            if (st !== 'REJECTED') {
                totalPipeline += amount;
                activeCount++;

                if (st === 'ACCEPTED' || st === 'ORDERED' || st === 'INVOICED') {
                    wonValue += amount;
                }
                if (st === 'SENT') {
                    inProgressValue += amount;
                }

                // Monthly chart aggregation
                const d = est.date ? new Date(est.date) : new Date(est.createdAt);
                if (!isNaN(d.getTime())) {
                    const month = `T${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
                    const sortKey = d.getFullYear() * 100 + (d.getMonth() + 1);
                    if (!monthlyMap[month]) {
                        monthlyMap[month] = { month, value: 0, count: 0, sortKey };
                    }
                    monthlyMap[month].value += amount;
                    monthlyMap[month].count++;
                }
            }
        });

        const winRate = estimates.length > 0 
            ? Math.round(((statusMap.ACCEPTED.count + statusMap.ORDERED.count + statusMap.INVOICED.count) / estimates.length) * 100) 
            : 0;

        // Pie chart data
        const pieData = Object.entries(statusMap)
            .filter(([_, data]) => data.count > 0)
            .map(([status, data]) => ({
                status,
                name: ESTIMATE_STATUS_CONFIG[status]?.label || status,
                count: data.count,
                value: data.total,
                color: ESTIMATE_STATUS_CONFIG[status]?.color || '#94a3b8'
            }))
            .sort((a, b) => b.value - a.value);

        // Bar chart data - last 6 months
        const barData = Object.values(monthlyMap)
            .sort((a, b) => a.sortKey - b.sortKey)
            .slice(-6);

        return {
            totalPipeline,
            wonValue,
            inProgressValue,
            activeCount,
            winRate,
            pieData,
            barData
        };
    }, [estimates]);

    const formatShortMoney = (val: number) => {
        if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)} Tỷ`;
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)} Tr`;
        return `${(val / 1_000).toFixed(0)}k`;
    };

    if (!isMounted) return null;

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs transition-all duration-300">
            {/* Top Insight Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 hover:bg-slate-100/60 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng giá trị chào giá</span>
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <TrendingUp size={15} />
                        </div>
                    </div>
                    <span className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono block">
                        {formatMoney(stats.totalPipeline)}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium mt-0.5 block">
                        {stats.activeCount} báo giá đang hoạt động
                    </span>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70 hover:bg-emerald-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Đã chốt / Chuyển đổi</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <CheckCircle2 size={15} />
                        </div>
                    </div>
                    <span className="text-lg sm:text-xl font-extrabold text-emerald-700 font-mono block">
                        {formatMoney(stats.wonValue)}
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium mt-0.5 block">
                        Đã chốt, lên SO hoặc lên hóa đơn
                    </span>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/70 hover:bg-blue-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider">Đang đàm phán / Gửi</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                            <Clock size={15} />
                        </div>
                    </div>
                    <span className="text-lg sm:text-xl font-extrabold text-blue-700 font-mono block">
                        {formatMoney(stats.inProgressValue)}
                    </span>
                    <span className="text-[11px] text-blue-600 font-medium mt-0.5 block">
                        Báo giá đã gửi chờ khách phản hồi
                    </span>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/70 hover:bg-purple-50 transition-colors">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold text-purple-800 uppercase tracking-wider">Tỷ lệ chốt thành công</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                            <Target size={15} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg sm:text-2xl font-black text-purple-700 font-mono">
                            {stats.winRate}%
                        </span>
                        <span className="text-xs text-purple-600 font-medium">Win Rate</span>
                    </div>
                    <div className="w-full bg-purple-100 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                            className="bg-purple-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, stats.winRate)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Visual Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 border-t border-slate-100">
                {/* Chart 1: Doanh số Báo giá theo tháng (7 cols) */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={16} className="text-indigo-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Doanh số Báo giá theo tháng gần nhất
                            </h3>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">6 tháng gần nhất</span>
                    </div>

                    <div className="h-[210px] w-full">
                        {stats.barData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.barData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="month" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#94a3b8', fontSize: 10 }}
                                        tickFormatter={formatShortMoney}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white px-3 py-2 rounded-lg shadow-xl text-xs space-y-1">
                                                        <span className="font-bold block text-slate-200">{d.month}</span>
                                                        <div className="text-emerald-400 font-mono font-bold text-sm">
                                                            {formatMoney(d.value)}
                                                        </div>
                                                        <div className="text-[11px] text-slate-400">
                                                            Số lượng: {d.count} báo giá
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        fill="#6366f1" 
                                        radius={[6, 6, 0, 0]} 
                                        maxBarSize={45} 
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-1.5">
                                <FileText size={24} className="opacity-30" />
                                <span>Chưa có dữ liệu giao dịch tháng</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chart 2: Phân bổ trạng thái Báo giá (5 cols) - Side by Side Legend */}
                <div className="lg:col-span-5 flex flex-col justify-between lg:border-l lg:border-slate-100 lg:pl-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <PieChartIcon size={16} className="text-emerald-600" />
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Phân bổ trạng thái Báo giá
                            </h3>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium">{stats.pieData.length} trạng thái</span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 h-[210px]">
                        {/* Donut graphic */}
                        <div className="w-[140px] h-[140px] sm:w-[150px] sm:h-[150px] shrink-0 relative flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={46}
                                        outerRadius={66}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {stats.pieData.map((entry, idx) => (
                                            <Cell key={`cell-${idx}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-xl text-xs space-y-0.5">
                                                        <span className="font-bold block" style={{ color: d.color }}>{d.name}</span>
                                                        <div className="text-slate-100 font-mono text-[11px]">
                                                            {formatMoney(d.value)} ({d.count} báo giá)
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                                <span className="text-[10px] uppercase font-bold text-slate-400">Tổng</span>
                                <span className="text-sm font-black text-slate-800 font-mono">{estimates.length}</span>
                            </div>
                        </div>

                        {/* Dedicated HTML Legend: side-by-side to guarantee 0 text overlap */}
                        <div className="flex-1 w-full overflow-y-auto max-h-[170px] pr-1 space-y-1.5 text-xs">
                            {stats.pieData.map(item => {
                                const percent = stats.totalPipeline > 0 ? Math.round((item.value / stats.totalPipeline) * 100) : 0;
                                return (
                                    <div key={item.status} className="flex items-center justify-between p-1 rounded hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span 
                                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                                style={{ backgroundColor: item.color }} 
                                            />
                                            <span className="text-slate-700 font-medium truncate text-[11px]" title={item.name}>
                                                {item.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0 font-mono text-[11px]">
                                            <span className="text-slate-400">({item.count})</span>
                                            <span className="font-bold text-slate-800">{formatShortMoney(item.value)}</span>
                                            <span className="text-[10px] text-slate-400 w-7 text-right">{percent}%</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client'

import React, { useState, useEffect } from 'react';
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
    BadgeDollarSign, 
    Sparkles,
    BarChart3,
    PieChart as PieChartIcon
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface QuoteAnalyticsBarProps {
    quotes: any[];
    getQuoteTotal: (quote: any) => number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'Bản nháp', color: '#64748b', bg: '#f1f5f9' },
    SENT: { label: 'Đã gửi khách', color: '#f59e0b', bg: '#fef3c7' },
    ACCEPTED: { label: 'Khách đã duyệt', color: '#10b981', bg: '#d1fae5' },
    TO_CONTRACT: { label: 'Lên hợp đồng', color: '#8b5cf6', bg: '#ede9fe' },
    REJECTED: { label: 'Từ chối', color: '#f43f5e', bg: '#ffe4e6' },
    CANCELLED: { label: 'Đã hủy', color: '#ef4444', bg: '#fee2e2' }
};

export function QuoteAnalyticsBar({ quotes, getQuoteTotal }: QuoteAnalyticsBarProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculate metrics
    let totalCount = quotes.length;
    let grandTotalValue = 0;
    let acceptedValue = 0;
    let acceptedCount = 0;
    let pendingValue = 0;
    let pendingCount = 0;

    const statusMap: Record<string, { count: number; total: number }> = {
        DRAFT: { count: 0, total: 0 },
        SENT: { count: 0, total: 0 },
        ACCEPTED: { count: 0, total: 0 },
        TO_CONTRACT: { count: 0, total: 0 },
        REJECTED: { count: 0, total: 0 },
        CANCELLED: { count: 0, total: 0 }
    };

    // Monthly aggregation
    const monthlyMap: Record<string, { month: string; value: number; count: number; sortKey: number }> = {};

    quotes.forEach(q => {
        const val = getQuoteTotal(q);
        grandTotalValue += val;

        const st = q.status || 'DRAFT';
        if (!statusMap[st]) {
            statusMap[st] = { count: 0, total: 0 };
        }
        statusMap[st].count += 1;
        statusMap[st].total += val;

        if (st === 'ACCEPTED' || st === 'TO_CONTRACT') {
            acceptedValue += val;
            acceptedCount += 1;
        } else if (st === 'SENT' || st === 'DRAFT') {
            pendingValue += val;
            pendingCount += 1;
        }

        // Aggregate by month (e.g. "T09/24")
        if (q.createdAt) {
            const date = new Date(q.createdAt);
            if (!isNaN(date.getTime())) {
                const month = `T${date.getMonth() + 1}/${String(date.getFullYear()).slice(-2)}`;
                const sortKey = date.getFullYear() * 100 + (date.getMonth() + 1);
                if (!monthlyMap[month]) {
                    monthlyMap[month] = { month, value: 0, count: 0, sortKey };
                }
                monthlyMap[month].value += val;
                monthlyMap[month].count += 1;
            }
        }
    });

    const winRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0;
    const avgDealSize = totalCount > 0 ? Math.round(grandTotalValue / totalCount) : 0;

    // Donut chart data
    const pieData = Object.entries(statusMap)
        .filter(([_, data]) => data.count > 0)
        .map(([status, data]) => ({
            key: status,
            name: STATUS_CONFIG[status]?.label || status,
            value: data.count,
            amount: data.total,
            color: STATUS_CONFIG[status]?.color || '#94a3b8'
        }))
        .sort((a, b) => b.value - a.value);

    // Monthly bar chart data (last 6 available months)
    const monthlyData = Object.values(monthlyMap)
        .sort((a, b) => a.sortKey - b.sortKey)
        .slice(-6);

    return (
        <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 mb-4 transition-all">
            {/* Top Stat Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Tổng giá trị chào giá */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Tổng giá trị chào giá
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <BadgeDollarSign size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono tracking-tight">
                            {formatMoney(grandTotalValue)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-bold text-emerald-700 font-mono">{totalCount}</span> báo giá toàn bộ hệ thống
                        </div>
                    </div>
                </div>

                {/* 2. Tỷ lệ chốt thành công */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Tỷ lệ chốt đơn (Win Rate)
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg sm:text-xl font-extrabold text-indigo-600 font-mono">
                                {winRate}%
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">
                                ({acceptedCount} đã duyệt/lên HĐ)
                            </span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div 
                                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(5, winRate))}%` }} 
                            />
                        </div>
                    </div>
                </div>

                {/* 3. Pipeline đang theo đuổi */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Đang xử lý & đàm phán
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-lg sm:text-xl font-extrabold text-amber-600 font-mono tracking-tight">
                            {formatMoney(pendingValue)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-bold text-amber-700 font-mono">{pendingCount}</span> báo giá đang chờ phản hồi
                        </div>
                    </div>
                </div>

                {/* 4. Giá trị trung bình / báo giá */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Quy mô trung bình / Deal
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                            <Sparkles size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-lg sm:text-xl font-extrabold text-slate-800 font-mono tracking-tight">
                            {formatMoney(avgDealSize)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            Mức giá trị chuẩn mỗi hợp đồng
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 1. Bar Chart: Doanh số báo giá theo tháng (7 Cols) */}
                <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <BarChart3 size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800">Xu hướng Giá trị Chào giá (Các tháng gần đây)</h4>
                                <p className="text-[11px] text-slate-400">Đơn vị: VNĐ</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-[210px] pt-2">
                        {isMounted && monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                <BarChart data={monthlyData} margin={{ top: 15, right: 15, left: 10, bottom: 10 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="month" 
                                        tickLine={false} 
                                        axisLine={{ stroke: '#e2e8f0' }} 
                                        tick={{ fill: '#64748b', fontSize: 11 }} 
                                    />
                                    <YAxis 
                                        tickLine={false} 
                                        axisLine={false} 
                                        tick={{ fill: '#64748b', fontSize: 10 }}
                                        tickFormatter={(val) => {
                                            if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} Tỷ`;
                                            if (val >= 1000000) return `${Math.round(val / 1000000)} Tr`;
                                            return `${val}`;
                                        }}
                                    />
                                    <Tooltip
                                        formatter={(val: any) => [formatMoney(val), 'Giá trị chào giá']}
                                        labelFormatter={(label) => `Tháng: ${label}`}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}
                                    />
                                    <Bar 
                                        dataKey="value" 
                                        fill="#4f46e5" 
                                        radius={[6, 6, 0, 0]} 
                                        maxBarSize={45}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                Chưa có phân bổ dữ liệu theo tháng
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Donut Chart: Trạng thái (5 Cols) - NO OVERLAP DESIGN */}
                <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <PieChartIcon size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800">Cơ cấu Báo giá theo Trạng thái</h4>
                                <p className="text-[11px] text-slate-400">Phân bố tỷ lệ quy trình chốt đơn</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 pt-2">
                        {/* Donut on Left (5 cols) */}
                        <div className="sm:col-span-5 h-[160px] relative flex items-center justify-center">
                            {isMounted && pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={42}
                                            outerRadius={62}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(val: any, name: any, item: any) => [
                                                `${val} báo giá (${formatMoney(item?.payload?.amount || 0)})`,
                                                name
                                            ]}
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                                fontSize: '11px',
                                                fontWeight: 600
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="text-xs text-slate-400">Không có dữ liệu</div>
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Tổng số</span>
                                <span className="text-base font-extrabold text-slate-800 font-mono">{totalCount}</span>
                            </div>
                        </div>

                        {/* Clean HTML Legend on Right (7 cols) - NEVER OVERLAPS */}
                        <div className="sm:col-span-7 flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                            {pieData.map(item => (
                                <div key={item.key} className="p-1.5 px-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                        <span className="font-semibold text-slate-700 truncate">{item.name}</span>
                                    </div>
                                    <div className="text-right shrink-0 font-mono">
                                        <span className="font-bold text-slate-900">{item.value}</span>
                                        {item.amount > 0 && (
                                            <span className="text-[10px] text-slate-500 block">
                                                {item.amount >= 1000000000 ? `${(item.amount / 1000000000).toFixed(1)} Tỷ` : `${Math.round(item.amount / 1000000)} Tr`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

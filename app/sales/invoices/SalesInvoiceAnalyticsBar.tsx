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
    Receipt, 
    TrendingUp, 
    CheckCircle2, 
    Clock, 
    BadgeDollarSign, 
    Sparkles, 
    BarChart3, 
    PieChart as PieChartIcon,
    AlertCircle
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface SalesInvoiceAnalyticsBarProps {
    invoices: any[];
}

const INVOICE_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    PAID: { label: 'Đã thanh toán đủ', color: '#10b981', bg: '#d1fae5' },
    PARTIAL_PAID: { label: 'Thanh toán 1 phần', color: '#3b82f6', bg: '#dbeafe' },
    ISSUED: { label: 'Đã phát hành / Chưa thu', color: '#f59e0b', bg: '#fef3c7' },
    DRAFT: { label: 'Hóa đơn nháp', color: '#64748b', bg: '#f1f5f9' },
    CANCELLED: { label: 'Đã hủy', color: '#ef4444', bg: '#fee2e2' }
};

export function SalesInvoiceAnalyticsBar({ invoices }: SalesInvoiceAnalyticsBarProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const stats = useMemo(() => {
        let totalRevenue = 0;
        let totalPaid = 0;
        let totalRemainingDebt = 0;
        let activeInvoiceCount = 0;

        const statusMap: Record<string, { count: number; total: number }> = {
            PAID: { count: 0, total: 0 },
            PARTIAL_PAID: { count: 0, total: 0 },
            ISSUED: { count: 0, total: 0 },
            DRAFT: { count: 0, total: 0 },
            CANCELLED: { count: 0, total: 0 }
        };

        const monthlyMap: Record<string, { month: string; value: number; count: number; sortKey: number }> = {};

        invoices.forEach(inv => {
            const amount = Number(inv.totalAmount) || 0;
            const paid = Number(inv.paidAmount) || 0;
            const st = inv.status || 'DRAFT';

            if (!statusMap[st]) {
                statusMap[st] = { count: 0, total: 0 };
            }
            statusMap[st].count++;
            statusMap[st].total += amount;

            if (st !== 'CANCELLED') {
                totalRevenue += amount;
                totalPaid += paid;
                totalRemainingDebt += Math.max(0, amount - paid);
                activeInvoiceCount++;

                // Monthly chart aggregation
                const d = inv.date ? new Date(inv.date) : new Date(inv.createdAt);
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

        const collectionRate = totalRevenue > 0 ? Math.round((totalPaid / totalRevenue) * 100) : 0;

        // Pie chart data
        const pieData = Object.entries(statusMap)
            .filter(([_, data]) => data.count > 0)
            .map(([status, data]) => ({
                key: status,
                name: INVOICE_STATUS_CONFIG[status]?.label || status,
                value: data.count,
                amount: data.total,
                color: INVOICE_STATUS_CONFIG[status]?.color || '#94a3b8'
            }))
            .sort((a, b) => b.value - a.value);

        // Monthly data (last 6 months)
        const monthlyData = Object.values(monthlyMap)
            .sort((a, b) => a.sortKey - b.sortKey)
            .slice(-6);

        return {
            totalRevenue,
            totalPaid,
            totalRemainingDebt,
            activeInvoiceCount,
            collectionRate,
            pieData,
            monthlyData
        };
    }, [invoices]);

    return (
        <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 mb-4 transition-all">
            {/* Top Stat Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Tổng tiền hóa đơn */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Tổng Doanh Số Xuất HĐ
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <BadgeDollarSign size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-lg sm:text-xl font-extrabold text-slate-900 font-mono tracking-tight">
                            {formatMoney(stats.totalRevenue)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-bold text-emerald-700 font-mono">{stats.activeInvoiceCount}</span> hóa đơn hợp lệ
                        </div>
                    </div>
                </div>

                {/* 2. Thực thu */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Thực Thu (Đã Thu Tiền)
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                            <CheckCircle2 size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-lg sm:text-xl font-extrabold text-teal-700 font-mono tracking-tight">
                            {formatMoney(stats.totalPaid)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            Tiền thực đã vào tài khoản / quỹ
                        </div>
                    </div>
                </div>

                {/* 3. Nợ phải thu */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Nợ Chưa Thu (Còn Lại)
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                            <Clock size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="text-lg sm:text-xl font-extrabold text-rose-600 font-mono tracking-tight">
                            {formatMoney(stats.totalRemainingDebt)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            Công nợ khách hàng cần đòi
                        </div>
                    </div>
                </div>

                {/* 4. Tỷ lệ thu hồi */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Tỷ Lệ Thu Hồi Nợ
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <TrendingUp size={16} />
                        </div>
                    </div>
                    <div className="mt-2">
                        <div className="flex items-baseline gap-2">
                            <span className="text-lg sm:text-xl font-extrabold text-indigo-700 font-mono">
                                {stats.collectionRate}%
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500">tiến độ dòng tiền</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div 
                                className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                                style={{ width: `${Math.min(100, Math.max(3, stats.collectionRate))}%` }} 
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 1. Bar Chart: Doanh số HĐ theo tháng (7 Cols) */}
                <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <BarChart3 size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800">Xu Hướng Xuất Hóa Đơn & Doanh Thu</h4>
                                <p className="text-[11px] text-slate-400">Giá trị xuất theo từng kỳ tháng gần đây (VNĐ)</p>
                            </div>
                        </div>
                    </div>

                    <div className="w-full h-[210px] pt-2">
                        {isMounted && stats.monthlyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                <BarChart data={stats.monthlyData} margin={{ top: 15, right: 15, left: 10, bottom: 10 }}>
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
                                        formatter={(val: any) => [formatMoney(val), 'Doanh số hóa đơn']}
                                        labelFormatter={(label) => `Kỳ: ${label}`}
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
                                        fill="#059669" 
                                        radius={[6, 6, 0, 0]} 
                                        maxBarSize={45}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                Chưa có phân bổ dữ liệu hóa đơn theo tháng
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Donut Chart: Trạng thái hóa đơn & Thu nợ (5 Cols) - NO OVERLAP DESIGN */}
                <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <PieChartIcon size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800">Cơ Cấu Trạng Thái Thanh Toán</h4>
                                <p className="text-[11px] text-slate-400">Tỷ lệ hóa đơn theo tiến độ thu nợ</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 pt-2">
                        {/* Donut on Left (5 cols) */}
                        <div className="sm:col-span-5 h-[160px] relative flex items-center justify-center">
                            {isMounted && stats.pieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                    <PieChart>
                                        <Pie
                                            data={stats.pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={42}
                                            outerRadius={62}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {stats.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(val: any, name: any, item: any) => [
                                                `${val} hóa đơn (${formatMoney(item?.payload?.amount || 0)})`,
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
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Hóa đơn</span>
                                <span className="text-base font-extrabold text-slate-800 font-mono">{invoices.length}</span>
                            </div>
                        </div>

                        {/* Clean HTML Legend on Right (7 cols) - NEVER OVERLAPS */}
                        <div className="sm:col-span-7 flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                            {stats.pieData.map(item => (
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

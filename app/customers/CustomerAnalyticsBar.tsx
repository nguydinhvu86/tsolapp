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
    AlertTriangle, 
    BadgeDollarSign, 
    ShieldCheck, 
    PieChart as PieChartIcon, 
    BarChart3
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface CustomerAnalyticsBarProps {
    customers: any[];
}

export function CustomerAnalyticsBar({ customers }: CustomerAnalyticsBarProps) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Calculations
    const stats = useMemo(() => {
        let totalCustomers = customers.length;
        let totalRevenue = 0;
        let totalDebt = 0;
        let noDebtCount = 0;
        let normalDebtCount = 0;
        let normalDebtTotal = 0;
        let overLimitCount = 0;
        let overLimitTotal = 0;

        customers.forEach(c => {
            const rev = Number(c.revenue) || 0;
            const debt = Number(c.totalDebt) || 0;
            const limit = Number(c.creditLimit) || 0;

            totalRevenue += rev;

            if (debt <= 0) {
                noDebtCount++;
            } else {
                totalDebt += debt;
                if (limit > 0 && debt > limit) {
                    overLimitCount++;
                    overLimitTotal += debt;
                } else {
                    normalDebtCount++;
                    normalDebtTotal += debt;
                }
            }
        });

        // Top 5 customers by revenue
        const topByRevenue = [...customers]
            .sort((a, b) => (Number(b.revenue) || 0) - (Number(a.revenue) || 0))
            .filter(c => (Number(c.revenue) || 0) > 0)
            .slice(0, 5)
            .map(c => {
                const rawName = c.shortName || c.name || 'KH';
                const displayName = rawName.length > 16 ? rawName.slice(0, 15) + '…' : rawName;
                return {
                    name: displayName,
                    fullName: c.name,
                    revenue: Number(c.revenue) || 0
                };
            });

        // Donut Data
        const debtSegments = [
            { key: 'no_debt', name: 'Không công nợ', value: noDebtCount, color: '#10b981', amount: 0 },
            { key: 'normal_debt', name: 'Nợ trong hạn', value: normalDebtCount, color: '#f59e0b', amount: normalDebtTotal },
            { key: 'over_limit', name: 'Vượt hạn mức', value: overLimitCount, color: '#ef4444', amount: overLimitTotal }
        ].filter(s => s.value > 0);

        return {
            totalCustomers,
            totalRevenue,
            totalDebt,
            topByRevenue,
            debtSegments,
            overLimitCount
        };
    }, [customers]);

    return (
        <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4 mb-4 transition-all">
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                {/* 1. BarChart: Top Khách Hàng Doanh Thu (7 Cols) */}
                <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <BarChart3 size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800">Top Khách Hàng có Doanh Thu Cao Nhất</h4>
                                <p className="text-[11px] text-slate-400">Doanh số thực ghi nhận từ hóa đơn</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Tổng doanh thu CRM</span>
                            <span className="text-xs sm:text-sm font-extrabold text-indigo-700 font-mono">
                                {formatMoney(stats.totalRevenue)}
                            </span>
                        </div>
                    </div>

                    <div className="w-full h-[220px] pt-2">
                        {isMounted && stats.topByRevenue.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                <BarChart
                                    data={stats.topByRevenue}
                                    margin={{ top: 15, right: 15, left: 10, bottom: 25 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="name"
                                        tickLine={false}
                                        axisLine={{ stroke: '#e2e8f0' }}
                                        tick={{ fill: '#334155', fontSize: 11, fontWeight: 600 }}
                                        interval={0}
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
                                        formatter={(val: any) => [formatMoney(val), 'Doanh thu']}
                                        labelFormatter={(_, items) => items?.[0]?.payload?.fullName || ''}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            fontSize: '11px',
                                            fontWeight: 600
                                        }}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        fill="#059669"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={45}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-slate-400">
                                Chưa có khách hàng nào phát sinh doanh thu
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Donut Chart: Phân bổ công nợ & rủi ro (5 Cols) - NO OVERLAP DESIGN */}
                <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <PieChartIcon size={15} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-800">Cơ cấu Phân Loại Công Nợ</h4>
                                <p className="text-[11px] text-slate-400">Phân loại theo ngưỡng an toàn</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Công nợ phải thu</span>
                            <span className="text-xs sm:text-sm font-extrabold text-rose-600 font-mono">
                                {formatMoney(stats.totalDebt)}
                            </span>
                        </div>
                    </div>

                    {/* Donut + HTML Legend side-by-side */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 pt-2">
                        {/* Donut chart on Left (5 cols) */}
                        <div className="sm:col-span-5 h-[160px] relative flex items-center justify-center">
                            {isMounted && stats.debtSegments.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%" minHeight={50} minWidth={50}>
                                    <PieChart>
                                        <Pie
                                            data={stats.debtSegments}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={42}
                                            outerRadius={62}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {stats.debtSegments.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(val: any, name: any, item: any) => [
                                                `${val} khách (${item?.payload?.amount ? formatMoney(item.payload.amount) : '0 ₫'})`,
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
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Khách hàng</span>
                                <span className="text-base font-extrabold text-slate-800 font-mono">{stats.totalCustomers}</span>
                            </div>
                        </div>

                        {/* Clean HTML Legend on Right (7 cols) - NEVER OVERLAPS */}
                        <div className="sm:col-span-7 flex flex-col gap-2">
                            {stats.debtSegments.map(item => (
                                <div key={item.key} className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
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

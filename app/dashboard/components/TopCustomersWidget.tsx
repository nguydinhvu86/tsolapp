'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
    Users,
    ArrowRight,
    Building2,
    DollarSign,
    TrendingUp,
    AlertTriangle,
    Crown
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface TopCustomersProps {
    invoices?: any[];
}

export function TopCustomersWidget({ invoices = [] }: TopCustomersProps) {
    const [activeTab, setActiveTab] = useState<'REVENUE' | 'DEBT'>('REVENUE');

    // Aggregate by customer
    const { topRevenue, topDebt, totalRevenueAll, totalDebtAll } = useMemo(() => {
        const customerMap = new Map<string, {
            id: string;
            name: string;
            shortName: string;
            totalRevenue: number;
            totalDebt: number;
            invoiceCount: number;
        }>();

        let totalRev = 0;
        let totalDbt = 0;

        invoices.forEach(inv => {
            if (inv.status !== 'DRAFT' && inv.status !== 'CANCELLED') {
                const custName = inv.customer?.name || 'Khách lẻ / Khác';
                const custId = inv.customerId || custName;

                // Create clean short name for chart labels
                let shortName = custName;
                shortName = shortName.replace(/^CÔNG TY (TNHH (MTV )?|CỔ PHẦN |CP )?/i, '').trim();
                if (shortName.length > 20) {
                    shortName = shortName.substring(0, 18) + '...';
                }

                if (!customerMap.has(custId)) {
                    customerMap.set(custId, {
                        id: custId,
                        name: custName,
                        shortName: shortName || custName,
                        totalRevenue: 0,
                        totalDebt: 0,
                        invoiceCount: 0,
                    });
                }

                const entry = customerMap.get(custId)!;
                const rev = inv.totalAmount || 0;
                const paid = inv.paidAmount || 0;
                const debt = Math.max(0, rev - paid);

                entry.totalRevenue += rev;
                entry.totalDebt += debt;
                entry.invoiceCount += 1;

                totalRev += rev;
                totalDbt += debt;
            }
        });

        const list = Array.from(customerMap.values());
        const sortedRevenue = [...list].sort((a, b) => b.totalRevenue - a.totalRevenue).slice(0, 5);
        const sortedDebt = [...list].filter(c => c.totalDebt > 0).sort((a, b) => b.totalDebt - a.totalDebt).slice(0, 5);

        return {
            topRevenue: sortedRevenue,
            topDebt: sortedDebt,
            totalRevenueAll: totalRev,
            totalDebtAll: totalDbt,
        };
    }, [invoices]);

    const displayList = activeTab === 'REVENUE' ? topRevenue : topDebt;
    const totalBase = activeTab === 'REVENUE' ? totalRevenueAll : totalDebtAll;

    // Palette for Revenue bars (Blue to Indigo)
    const REVENUE_COLORS = [
        { start: '#2563eb', end: '#1d4ed8' }, // #1
        { start: '#3b82f6', end: '#2563eb' }, // #2
        { start: '#6366f1', end: '#4f46e5' }, // #3
        { start: '#8b5cf6', end: '#7c3aed' }, // #4
        { start: '#a855f7', end: '#9333ea' }, // #5
    ];

    // Palette for Debt bars (Rose to Amber)
    const DEBT_COLORS = [
        { start: '#dc2626', end: '#b91c1c' }, // #1
        { start: '#ea580c', end: '#c2410c' }, // #2
        { start: '#f97316', end: '#ea580c' }, // #3
        { start: '#f59e0b', end: '#d97706' }, // #4
        { start: '#eab308', end: '#ca8a04' }, // #5
    ];

    const currentPalette = activeTab === 'REVENUE' ? REVENUE_COLORS : DEBT_COLORS;

    // Format chart items
    const chartItems = displayList.map((item, idx) => {
        const val = activeTab === 'REVENUE' ? item.totalRevenue : item.totalDebt;
        const share = totalBase > 0 ? (val / totalBase) * 100 : 0;
        const color = currentPalette[idx] || currentPalette[0];
        return {
            ...item,
            chartValue: val,
            share: share.toFixed(1),
            colorStart: color.start,
            colorEnd: color.end,
            gradientId: `custGrad_${activeTab}_${idx}`,
        };
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Building2 size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                                Top Khách Hàng Trọng Điểm & Công Nợ
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                5 Khách hàng lớn nhất
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-none mt-1">
                            Phân tích khách hàng có đóng góp doanh số cao nhất và dư nợ cần ưu tiên đôn đốc
                        </p>
                    </div>
                </div>

                <Link
                    href="/customers"
                    className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 group/link transition-colors py-1.5 px-3 rounded-lg bg-blue-50 hover:bg-blue-100/70 border border-blue-200/60 self-start sm:self-auto"
                >
                    <span>Xem danh bạ KH</span>
                    <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
                </Link>
            </div>

            {/* Segmented Switch Tabs */}
            <div className="p-1.5 bg-slate-100/90 rounded-xl flex gap-1.5 mb-4 border border-slate-200/60">
                <button
                    type="button"
                    onClick={() => setActiveTab('REVENUE')}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'REVENUE'
                            ? 'bg-white text-blue-800 shadow-xs border border-blue-200/70'
                            : 'text-slate-500 hover:text-slate-800 border border-transparent'
                    }`}
                >
                    <span>🏆 Top Doanh Thu</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-blue-100 text-blue-800">
                        {topRevenue.length} KH
                    </span>
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('DEBT')}
                    className={`flex-1 py-2 px-3 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        activeTab === 'DEBT'
                            ? 'bg-white text-rose-700 shadow-xs border border-rose-200/70'
                            : 'text-slate-500 hover:text-slate-800 border border-transparent'
                    }`}
                >
                    <AlertTriangle size={13} className={activeTab === 'DEBT' ? 'text-rose-600' : 'text-slate-400'} />
                    <span>⚠️ Top Dư Nợ Cần Thu</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-rose-100 text-rose-700">
                        {topDebt.length} KH
                    </span>
                </button>
            </div>

            {/* Split View: Recharts BarChart (Left) + Detailed Rank Cards (Right) */}
            {displayList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs flex-1">
                    <Users size={32} className="mb-2 text-slate-300" />
                    <span>Chưa có dữ liệu khách hàng thỏa mãn tiêu chí.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
                    {/* Left: Recharts BarChart (7 Cols) */}
                    <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <TrendingUp size={14} className={activeTab === 'REVENUE' ? 'text-blue-600' : 'text-rose-600'} />
                                Biểu Đồ Cột Giá Trị {activeTab === 'REVENUE' ? 'Doanh Thu' : 'Công Nợ'}
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">Đơn vị: VNĐ</span>
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
                                            <linearGradient key={item.gradientId} id={item.gradientId} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor={item.colorStart} stopOpacity={0.85} />
                                                <stop offset="100%" stopColor={item.colorEnd} stopOpacity={1} />
                                            </linearGradient>
                                        ))}
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
                                        width={110}
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
                                        formatter={(val: any, _name: any, item: any) => {
                                            return [
                                                `${formatMoney(Number(val) || 0)} (${item.payload.share}% tổng ${activeTab === 'REVENUE' ? 'doanh thu' : 'công nợ'})`,
                                                item.payload.name
                                            ];
                                        }}
                                    />
                                    <Bar
                                        dataKey="chartValue"
                                        radius={[0, 8, 8, 0]}
                                        maxBarSize={28}
                                    >
                                        {chartItems.map((entry) => (
                                            <Cell key={`cell-${entry.id}`} fill={`url(#${entry.gradientId})`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Detailed Customer Cards with Rank Medals (5 Cols) */}
                    <div className="lg:col-span-5 flex flex-col justify-between gap-2">
                        {chartItems.map((cust, idx) => {
                            const isTop1 = idx === 0;
                            const isTop2 = idx === 1;
                            const isTop3 = idx === 2;

                            return (
                                <div
                                    key={cust.id}
                                    className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-150 hover:shadow-xs hover:scale-[1.01] ${
                                        isTop1
                                            ? activeTab === 'REVENUE'
                                                ? 'bg-gradient-to-r from-amber-50/90 via-yellow-50/40 to-white border-amber-300 ring-1 ring-amber-300/40'
                                                : 'bg-gradient-to-r from-rose-50/90 via-orange-50/40 to-white border-rose-300 ring-1 ring-rose-300/40'
                                            : isTop2
                                            ? 'bg-slate-50/70 border-slate-200'
                                            : 'bg-white border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {/* Rank Medal */}
                                            <div className={`w-6 h-6 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                                isTop1
                                                    ? 'bg-amber-400 text-amber-950 font-black'
                                                    : isTop2
                                                    ? 'bg-slate-300 text-slate-800'
                                                    : isTop3
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                                            </div>

                                            {/* Customer Name */}
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-900 truncate" title={cust.name}>
                                                    {cust.name}
                                                </h4>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {cust.invoiceCount} hóa đơn phát hành
                                                </span>
                                            </div>
                                        </div>

                                        {/* Amount & Share */}
                                        <div className="text-right shrink-0">
                                            <span className={`text-xs font-mono font-black block ${
                                                activeTab === 'REVENUE' ? 'text-blue-900' : 'text-rose-700'
                                            }`}>
                                                {formatMoney(cust.chartValue)}
                                            </span>
                                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                                                activeTab === 'REVENUE' ? 'bg-blue-100 text-blue-800' : 'bg-rose-100 text-rose-800'
                                            }`}>
                                                {cust.share}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import React from 'react';
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
    Filter,
    ArrowRight,
    Target,
    Award,
    DollarSign,
    Users,
    ChevronRight,
    TrendingUp,
    Receipt,
    CreditCard,
    Sparkles
} from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface SalesPipelineFunnelProps {
    leads?: any[];
    quotes?: any[];
    invoices?: any[];
    paymentsThisMonth?: number;
}

export function SalesPipelineFunnelWidget({
    leads = [],
    quotes = [],
    invoices = [],
    paymentsThisMonth = 0,
}: SalesPipelineFunnelProps) {
    // 1. Leads metrics
    const totalLeadsCount = leads.length;
    const totalLeadsValue = leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
    const wonLeadsCount = leads.filter(l => l.status === 'WON').length;

    // 2. Quotes / Estimates metrics
    const totalQuotesCount = quotes.length;
    const totalQuotesValue = quotes.reduce((sum, q) => sum + (q.totalAmount || 0), 0);
    const acceptedQuotes = quotes.filter(q => q.status === 'ACCEPTED');
    const acceptedQuotesCount = acceptedQuotes.length;

    // 3. Invoices metrics
    const issuedInvoices = invoices.filter(inv => inv.status !== 'DRAFT' && inv.status !== 'CANCELLED');
    const totalInvoicesCount = issuedInvoices.length;
    const totalInvoicesValue = issuedInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    const totalCollected = issuedInvoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0);

    // Conversion rates
    const quoteWinRate = totalQuotesCount > 0 ? (acceptedQuotesCount / totalQuotesCount) * 100 : 0;
    const collectionRate = totalInvoicesValue > 0 ? (totalCollected / totalInvoicesValue) * 100 : 0;
    const avgInvoiceSize = totalInvoicesCount > 0 ? totalInvoicesValue / totalInvoicesCount : 0;

    // Chart Data for Horizontal BarChart
    const chartData = [
        {
            stage: '1. Leads',
            fullName: '1. Khách tiềm năng (Leads)',
            value: totalLeadsValue,
            count: totalLeadsCount,
            unit: 'cơ hội',
            colorStart: '#3b82f6',
            colorEnd: '#1d4ed8',
            gradientId: 'gradFunnelLead',
            rateNote: `${wonLeadsCount} chốt thành công`,
            icon: Users,
            bgLight: 'bg-blue-50/70',
            borderLight: 'border-blue-200/80',
            badgeBg: 'bg-blue-100 text-blue-800',
            link: '/sales/leads',
        },
        {
            stage: '2. Báo giá',
            fullName: '2. Báo giá chào hàng (Quotes)',
            value: totalQuotesValue,
            count: totalQuotesCount,
            unit: 'báo giá',
            colorStart: '#8b5cf6',
            colorEnd: '#6d28d9',
            gradientId: 'gradFunnelQuote',
            rateNote: `${acceptedQuotesCount} đồng ý (${quoteWinRate.toFixed(1)}%)`,
            icon: Target,
            bgLight: 'bg-purple-50/70',
            borderLight: 'border-purple-200/80',
            badgeBg: 'bg-purple-100 text-purple-800',
            link: '/sales/estimates',
        },
        {
            stage: '3. Hóa đơn',
            fullName: '3. Hóa đơn phát hành (Invoices)',
            value: totalInvoicesValue,
            count: totalInvoicesCount,
            unit: 'hóa đơn',
            colorStart: '#ec4899',
            colorEnd: '#be185d',
            gradientId: 'gradFunnelInvoice',
            rateNote: `Doanh số ghi nhận`,
            icon: Receipt,
            bgLight: 'bg-pink-50/70',
            borderLight: 'border-pink-200/80',
            badgeBg: 'bg-pink-100 text-pink-800',
            link: '/sales/invoices',
        },
        {
            stage: '4. Thực thu',
            fullName: '4. Dòng tiền thực thu (Cash)',
            value: totalCollected,
            count: issuedInvoices.filter(i => i.status === 'PAID').length,
            unit: 'HĐ tất toán',
            colorStart: '#10b981',
            colorEnd: '#047857',
            gradientId: 'gradFunnelCash',
            rateNote: `Thu hồi ${collectionRate.toFixed(1)}%`,
            icon: CreditCard,
            bgLight: 'bg-emerald-50/70',
            borderLight: 'border-emerald-200/80',
            badgeBg: 'bg-emerald-100 text-emerald-800',
            link: '/sales/invoices?filter=PAID',
        },
    ];

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Filter size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                                Phễu Chuyển Đổi & Doanh Số Bán Hàng (Sales Funnel)
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                                BI Analytics
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-none mt-1">
                            Trực quan hóa dòng chảy giá trị: Khách tiềm năng ➔ Báo giá ➔ Hóa đơn ➔ Thu tiền
                        </p>
                    </div>
                </div>

                <Link
                    href="/sales/estimates"
                    className="text-xs text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-1 group/link transition-colors py-1.5 px-3 rounded-lg bg-purple-50 hover:bg-purple-100/70 border border-purple-200/60 self-start sm:self-auto"
                >
                    <span>Quản lý Báo giá</span>
                    <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
                </Link>
            </div>

            {/* 3 Top Highlight Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-50/70 via-indigo-50/40 to-white border border-purple-200/60 flex items-center justify-between shadow-2xs">
                    <div>
                        <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                            Tỷ lệ Chốt Báo giá (Win Rate)
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-black text-purple-900 font-mono">
                                {quoteWinRate.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-purple-600 font-medium">({acceptedQuotesCount}/{totalQuotesCount} báo giá)</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                        🏆
                    </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50/70 via-sky-50/40 to-white border border-blue-200/60 flex items-center justify-between shadow-2xs">
                    <div>
                        <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                            Quy mô Đơn TB (Avg Deal Size)
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-black text-blue-900 font-mono truncate max-w-[170px]" title={formatMoney(avgInvoiceSize)}>
                                {formatMoney(avgInvoiceSize)}
                            </span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                        📊
                    </div>
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white border border-emerald-200/60 flex items-center justify-between shadow-2xs">
                    <div>
                        <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Tỷ lệ Thu tiền (Collection Rate)
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xl font-black text-emerald-900 font-mono">
                                {collectionRate.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-emerald-600 font-medium">doanh số xuất</span>
                        </div>
                    </div>
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm shadow-2xs">
                        💰
                    </div>
                </div>
            </div>

            {/* Split View: Recharts BarChart (Left) + Interactive Visual Cards (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left: Recharts BarChart (7 Cols) */}
                <div className="lg:col-span-7 bg-slate-50/60 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <TrendingUp size={14} className="text-purple-600" />
                            Biểu Đồ So Sánh Giá Trị Qua Từng Bước
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">Đơn vị: VNĐ</span>
                    </div>

                    <div className="w-full flex-1" style={{ minHeight: '260px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={chartData}
                                margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
                            >
                                <defs>
                                    {chartData.map((d) => (
                                        <linearGradient key={d.gradientId} id={d.gradientId} x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor={d.colorStart} stopOpacity={0.85} />
                                            <stop offset="100%" stopColor={d.colorEnd} stopOpacity={1} />
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
                                    dataKey="stage"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#1e293b', fontSize: 12, fontWeight: 600 }}
                                    width={90}
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
                                            `${formatMoney(Number(val) || 0)} (${item.payload.count} ${item.payload.unit})`,
                                            item.payload.fullName
                                        ];
                                    }}
                                />
                                <Bar
                                    dataKey="value"
                                    radius={[0, 8, 8, 0]}
                                    maxBarSize={32}
                                >
                                    {chartData.map((entry) => (
                                        <Cell key={`cell-${entry.stage}`} fill={`url(#${entry.gradientId})`} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right: Step Cards with Connectors (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between gap-2.5">
                    {chartData.map((step, idx) => {
                        const Icon = step.icon;
                        return (
                            <Link
                                key={idx}
                                href={step.link}
                                className={`p-3 rounded-xl border transition-all duration-150 hover:shadow-sm hover:scale-[1.01] block group ${step.bgLight} ${step.borderLight}`}
                            >
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div
                                            className="w-7 h-7 rounded-lg text-white flex items-center justify-center shrink-0 shadow-2xs"
                                            style={{ backgroundColor: step.colorStart }}
                                        >
                                            <Icon size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-xs font-bold text-slate-800 truncate block group-hover:text-purple-700 transition-colors">
                                                {step.fullName}
                                            </span>
                                            <span className="text-[10px] text-slate-500 font-medium">
                                                {step.rateNote}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="text-xs font-mono font-black text-slate-900 block">
                                            {formatMoney(step.value)}
                                        </span>
                                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${step.badgeBg}`}>
                                            {step.count} {step.unit}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

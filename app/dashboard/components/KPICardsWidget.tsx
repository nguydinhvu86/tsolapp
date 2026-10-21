'use client';

import React from 'react';
import { DollarSign, Receipt, CreditCard, Briefcase, TrendingUp, TrendingDown } from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface KPICardsWidgetProps {
    revenueThisMonth: number;
    revenueLastMonth: number;
    invoicesThisMonth: number;
    invoicesLastMonth: number;
    paymentsThisMonth: number;
    paymentsLastMonth: number;
    debtThisMonth: number;
    debtLastMonth: number;
}

export function KPICardsWidget({
    revenueThisMonth = 0,
    revenueLastMonth = 0,
    invoicesThisMonth = 0,
    invoicesLastMonth = 0,
    paymentsThisMonth = 0,
    paymentsLastMonth = 0,
    debtThisMonth = 0,
    debtLastMonth = 0,
}: KPICardsWidgetProps) {
    // Revenue calculations
    let revenueGrowth = 0;
    if (revenueLastMonth > 0) {
        revenueGrowth = ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;
    } else if (revenueThisMonth > 0) {
        revenueGrowth = 100;
    }
    const isRevenueUp = revenueGrowth >= 0;

    // Invoices calculations
    let invoiceGrowth = 0;
    if (invoicesLastMonth > 0) {
        invoiceGrowth = ((invoicesThisMonth - invoicesLastMonth) / invoicesLastMonth) * 100;
    } else if (invoicesThisMonth > 0) {
        invoiceGrowth = 100;
    }
    const isInvoiceUp = invoiceGrowth >= 0;

    // Payments calculations
    let paymentGrowth = 0;
    if (paymentsLastMonth > 0) {
        paymentGrowth = ((paymentsThisMonth - paymentsLastMonth) / paymentsLastMonth) * 100;
    } else if (paymentsThisMonth > 0) {
        paymentGrowth = 100;
    }
    const isPaymentUp = paymentGrowth >= 0;

    // Debt calculations
    let debtGrowth = 0;
    if (debtLastMonth > 0) {
        debtGrowth = ((debtThisMonth - debtLastMonth) / debtLastMonth) * 100;
    } else if (debtThisMonth > 0) {
        debtGrowth = 100;
    }
    const isDebtUp = debtGrowth >= 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-2">
            {/* Card 1: Revenue */}
            <div className="bg-gradient-to-br from-blue-50/50 via-white to-white rounded-2xl border border-blue-200/80 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 opacity-90 transition-all group-hover:w-2" />
                <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">
                        Doanh thu tháng này
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <DollarSign size={20} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono truncate" title={formatMoney(revenueThisMonth)}>
                        {formatMoney(revenueThisMonth)}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isRevenueUp
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                            {isRevenueUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(revenueGrowth).toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">so với tháng trước</span>
                    </div>
                </div>
            </div>

            {/* Card 2: Invoices */}
            <div className="bg-gradient-to-br from-indigo-50/50 via-white to-white rounded-2xl border border-indigo-200/80 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600 opacity-90 transition-all group-hover:w-2" />
                <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                        Hóa đơn phát hành
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Receipt size={20} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono">
                            {invoicesThisMonth}
                        </span>
                        <span className="text-xs text-slate-500 font-bold">hóa đơn</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isInvoiceUp
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                            {isInvoiceUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(invoiceGrowth).toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">so với tháng trước</span>
                    </div>
                </div>
            </div>

            {/* Card 3: Payments / Collected */}
            <div className="bg-gradient-to-br from-emerald-50/50 via-white to-white rounded-2xl border border-emerald-200/80 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-600 opacity-90 transition-all group-hover:w-2" />
                <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
                        Tiền thực thu
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <CreditCard size={20} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight font-mono truncate" title={formatMoney(paymentsThisMonth)}>
                        {formatMoney(paymentsThisMonth)}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isPaymentUp
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                            {isPaymentUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(paymentGrowth).toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">so với tháng trước</span>
                    </div>
                </div>
            </div>

            {/* Card 4: Debt */}
            <div className="bg-gradient-to-br from-amber-50/50 via-white to-white rounded-2xl border border-amber-200/80 p-4 sm:p-4.5 shadow-2xs hover:shadow-md transition-all duration-200 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 opacity-90 transition-all group-hover:w-2" />
                <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                        Công nợ quá hạn
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Briefcase size={20} strokeWidth={2.5} />
                    </div>
                </div>
                <div className="flex flex-col gap-1.5">
                    <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-mono truncate" title={formatMoney(debtThisMonth)}>
                        {formatMoney(debtThisMonth)}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isDebtUp
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                            {isDebtUp ? '↑ Tăng' : '↓ Giảm'} {Math.abs(debtGrowth).toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">so với tháng trước</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

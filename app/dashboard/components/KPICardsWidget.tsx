'use client';

import React from 'react';
import { DollarSign, Receipt, CreditCard, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
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
    // Helper format tiền tệ tách rời số và ký hiệu ₫
    const renderMoney = (val: number) => {
        const full = formatMoney(val);
        const num = full.replace(/[đ₫?]/g, '').trim() || '0';
        return (
            <div className="flex items-baseline gap-1 min-w-0" title={full}>
                <span className="text-xl sm:text-[23px] font-black text-slate-800 tracking-tight font-sans truncate">
                    {num}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-slate-400 select-none">₫</span>
            </div>
        );
    };

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
    // Đối với công nợ: Giảm là TỐT, Tăng là NGUY HIỂM
    const isDebtGood = debtGrowth <= 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3">
            {/* Thẻ 1: Doanh thu tháng này (Sky / Blue Theme) */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(14,165,233,0.15)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                {/* Dải gradient trang trí mép trên */}
                <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500" />
                {/* Quầng sáng ambient góc phải */}
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/15 transition-all duration-300" />

                <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">
                        Doanh thu tháng này
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-sky-600 group-hover:text-white transition-all duration-200">
                        <DollarSign size={20} strokeWidth={2.2} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    {renderMoney(revenueThisMonth)}
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isRevenueUp
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        }`}>
                            {isRevenueUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(revenueGrowth).toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">so với tháng trước</span>
                    </div>
                </div>

                {/* Đường sóng mini sparkline decor */}
                <svg className="absolute bottom-2.5 right-3 w-20 h-6 opacity-20 group-hover:opacity-35 text-sky-500 pointer-events-none transition-opacity duration-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 24 Q 25 28, 45 14 T 95 6" />
                </svg>
            </div>

            {/* Thẻ 2: Hóa đơn phát hành (Violet Theme) */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(139,92,246,0.15)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-violet-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-violet-500/15 transition-all duration-300" />

                <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">
                        Hóa đơn phát hành
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 border border-violet-200/60 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-violet-600 group-hover:text-white transition-all duration-200">
                        <Receipt size={20} strokeWidth={2.2} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl sm:text-[23px] font-black text-slate-800 tracking-tight font-sans">
                            {invoicesThisMonth}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">hóa đơn</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isInvoiceUp
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        }`}>
                            {isInvoiceUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(invoiceGrowth).toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">so với tháng trước</span>
                    </div>
                </div>

                <svg className="absolute bottom-2.5 right-3 w-20 h-6 opacity-20 group-hover:opacity-35 text-violet-500 pointer-events-none transition-opacity duration-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 22 Q 30 10, 60 20 T 95 8" />
                </svg>
            </div>

            {/* Thẻ 3: Tiền thực thu (Emerald Green Theme) */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.15)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/15 transition-all duration-300" />

                <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">
                        Tiền thực thu
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-200">
                        <CreditCard size={20} strokeWidth={2.2} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    {renderMoney(paymentsThisMonth)}
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isPaymentUp
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        }`}>
                            {isPaymentUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {Math.abs(paymentGrowth).toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">so với tháng trước</span>
                    </div>
                </div>

                <svg className="absolute bottom-2.5 right-3 w-20 h-6 opacity-20 group-hover:opacity-35 text-emerald-500 pointer-events-none transition-opacity duration-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 16 Q 35 28, 65 12 T 95 18" />
                </svg>
            </div>

            {/* Thẻ 4: Công nợ quá hạn (Amber / Warning Theme) */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(245,158,11,0.15)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
                <div className="absolute -top-10 -right-10 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/15 transition-all duration-300" />

                <div className="flex justify-between items-start mb-2.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider group-hover:text-slate-700 transition-colors">
                        Công nợ quá hạn
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-amber-500 group-hover:text-white transition-all duration-200">
                        <AlertCircle size={20} strokeWidth={2.2} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    {renderMoney(debtThisMonth)}
                    <div className="flex items-center gap-1.5 text-xs">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            isDebtGood
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : 'bg-rose-50 text-rose-700 border border-rose-200/80'
                        }`}>
                            {isDebtGood ? <TrendingDown size={12} /> : <TrendingUp size={12} />}
                            {isDebtGood ? 'Giảm' : 'Tăng'} {Math.abs(debtGrowth).toFixed(1)}%
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">so với tháng trước</span>
                    </div>
                </div>

                <svg className="absolute bottom-2.5 right-3 w-20 h-6 opacity-20 group-hover:opacity-35 text-amber-500 pointer-events-none transition-opacity duration-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 10 Q 40 26, 70 14 T 95 26" />
                </svg>
            </div>
        </div>
    );
}

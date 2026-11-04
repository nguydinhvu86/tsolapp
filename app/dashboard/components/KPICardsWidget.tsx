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
                <span className="text-xl sm:text-[23px] font-extrabold text-slate-800 tracking-tight font-sans tabular-nums truncate">
                    {num}
                </span>
                <span className="text-xs font-semibold text-slate-400 select-none">₫</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-3.5">
            {/* THẺ 1: DOANH THU THÁNG NÀY (Dải Cyan -> Emerald, hoa văn quầng tròn + sóng uốn lượn) */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(14,165,233,0.15)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                {/* Dải màu gradient trang trí trên đỉnh */}
                <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400" />
                
                {/* Hoa văn hình tròn góc trên bên phải */}
                <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-sky-100/60 pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                <div className="flex justify-between items-start mb-2.5 relative z-10">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        DOANH THU THÁNG NÀY
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/60 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-all duration-200">
                        <DollarSign size={20} strokeWidth={2.2} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 relative z-10">
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

                {/* Hoa văn đường sóng mini uốn lượn góc dưới phải */}
                <svg className="absolute bottom-2.5 right-3 w-16 h-5 opacity-40 group-hover:opacity-75 text-sky-400 pointer-events-none transition-opacity duration-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M 5 18 C 28 26, 48 8, 72 18 C 84 23, 94 14, 98 10" />
                </svg>
            </div>

            {/* THẺ 2: HÓA ĐƠN PHÁT HÀNH (Dải Tím / Violet, hoa văn quầng tròn + sóng uốn lượn) */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(139,92,246,0.15)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
                
                {/* Hoa văn hình tròn góc trên bên phải */}
                <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-purple-100/60 pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                <div className="flex justify-between items-start mb-2.5 relative z-10">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        HÓA ĐƠN PHÁT HÀNH
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-all duration-200">
                        <Receipt size={20} strokeWidth={2.2} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 relative z-10">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-xl sm:text-[23px] font-extrabold text-slate-800 tracking-tight font-sans">
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

                {/* Hoa văn đường sóng mini uốn lượn góc dưới phải */}
                <svg className="absolute bottom-2.5 right-3 w-16 h-5 opacity-40 group-hover:opacity-75 text-purple-400 pointer-events-none transition-opacity duration-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M 5 18 C 28 26, 48 8, 72 18 C 84 23, 94 14, 98 10" />
                </svg>
            </div>

            {/* THẺ 3: TIỀN THỰC THU (Dải Xanh Ngọc / Emerald, hoa văn quầng tròn + sóng uốn lượn) */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(16,185,129,0.15)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500" />
                
                {/* Hoa văn hình tròn góc trên bên phải */}
                <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-emerald-100/60 pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                <div className="flex justify-between items-start mb-2.5 relative z-10">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        TIỀN THỰC THU
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-all duration-200">
                        <CreditCard size={20} strokeWidth={2.2} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 relative z-10">
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

                {/* Hoa văn đường sóng mini uốn lượn góc dưới phải */}
                <svg className="absolute bottom-2.5 right-3 w-16 h-5 opacity-40 group-hover:opacity-75 text-emerald-400 pointer-events-none transition-opacity duration-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M 5 18 C 28 26, 48 8, 72 18 C 84 23, 94 14, 98 10" />
                </svg>
            </div>

            {/* THẺ 4: CÔNG NỢ QUÁ HẠN (Dải Cam / Amber, hoa văn quầng tròn + sóng uốn lượn) */}
            <div className="relative bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-4.5 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(245,158,11,0.15)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group">
                <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />
                
                {/* Hoa văn hình tròn góc trên bên phải */}
                <div className="absolute -top-5 -right-5 w-24 h-24 rounded-full bg-amber-100/60 pointer-events-none group-hover:scale-110 transition-transform duration-300" />

                <div className="flex justify-between items-start mb-2.5 relative z-10">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        CÔNG NỢ QUÁ HẠN
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shadow-2xs group-hover:scale-105 transition-all duration-200">
                        <AlertCircle size={20} strokeWidth={2.2} />
                    </div>
                </div>

                <div className="flex flex-col gap-1.5 relative z-10">
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

                {/* Hoa văn đường sóng mini uốn lượn góc dưới phải */}
                <svg className="absolute bottom-2.5 right-3 w-16 h-5 opacity-40 group-hover:opacity-75 text-amber-400 pointer-events-none transition-opacity duration-300" viewBox="0 0 100 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M 5 18 C 28 26, 48 8, 72 18 C 84 23, 94 14, 98 10" />
                </svg>
            </div>
        </div>
    );
}

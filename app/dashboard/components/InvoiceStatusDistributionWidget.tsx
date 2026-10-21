'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
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
    Clock,
    Building2,
    CheckCircle2,
    ArrowRight,
    AlertTriangle,
    DollarSign,
    PieChart as PieIcon,
    AlertCircle,
    Check
} from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils/formatters';

interface InvoiceStatusProps {
    invoices?: any[];
}

export function InvoiceStatusDistributionWidget({ invoices = [] }: InvoiceStatusProps) {
    const [activeTab, setActiveTab] = useState<'OVERDUE' | 'DUE_SOON' | 'PAID'>('OVERDUE');

    // Start of today normalized
    const now = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    // Filter valid invoices (exclude DRAFT and CANCELLED)
    const validInvoices = useMemo(() => {
        return invoices.filter(inv => inv.status !== 'DRAFT' && inv.status !== 'CANCELLED');
    }, [invoices]);

    // Categorize invoices
    const {
        overdueList,
        dueSoonList,
        paidList,
        partialList,
        totalOverdueDebt,
        totalDueSoonDebt,
        totalPaidAmount,
        totalInvoiceAmount,
        totalRemainingDebt
    } = useMemo(() => {
        const overdue: any[] = [];
        const dueSoon: any[] = [];
        const paid: any[] = [];
        const partial: any[] = [];

        let overdueDebt = 0;
        let dueSoonDebt = 0;
        let paidAmt = 0;
        let totalAmt = 0;
        let totalDebt = 0;

        validInvoices.forEach(inv => {
            const tot = inv.totalAmount || 0;
            const pd = inv.paidAmount || 0;
            const remaining = Math.max(0, tot - pd);

            totalAmt += tot;
            paidAmt += pd;
            totalDebt += remaining;

            if (inv.status === 'PAID' || remaining === 0) {
                paid.push(inv);
            } else {
                if (inv.status === 'PARTIAL_PAID' || pd > 0) {
                    partial.push(inv);
                }

                if (inv.dueDate) {
                    const due = new Date(inv.dueDate);
                    due.setHours(0, 0, 0, 0);
                    if (due < now) {
                        overdue.push(inv);
                        overdueDebt += remaining;
                    } else {
                        dueSoon.push(inv);
                        dueSoonDebt += remaining;
                    }
                } else {
                    dueSoon.push(inv);
                    dueSoonDebt += remaining;
                }
            }
        });

        // Sort by due date
        overdue.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
        dueSoon.sort((a, b) => new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime());
        paid.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        return {
            overdueList: overdue,
            dueSoonList: dueSoon,
            paidList: paid,
            partialList: partial,
            totalOverdueDebt: overdueDebt,
            totalDueSoonDebt: dueSoonDebt,
            totalPaidAmount: paidAmt,
            totalInvoiceAmount: totalAmt,
            totalRemainingDebt: totalDebt
        };
    }, [validInvoices, now]);

    // Donut Chart Data
    const donutData = useMemo(() => {
        const data = [
            {
                name: 'Quá hạn thanh toán',
                value: totalOverdueDebt,
                count: overdueList.length,
                color: '#ef4444', // Red
                bg: 'bg-rose-50 text-rose-700 border-rose-200',
            },
            {
                name: 'Trong hạn thanh toán',
                value: totalDueSoonDebt,
                count: dueSoonList.length,
                color: '#3b82f6', // Blue
                bg: 'bg-blue-50 text-blue-700 border-blue-200',
            },
            {
                name: 'Đã thu tiền (Tất toán)',
                value: totalPaidAmount,
                count: paidList.length,
                color: '#10b981', // Emerald
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            },
        ].filter(d => d.value > 0 || d.count > 0);

        return data;
    }, [totalOverdueDebt, totalDueSoonDebt, totalPaidAmount, overdueList.length, dueSoonList.length, paidList.length]);

    const collectionRate = totalInvoiceAmount > 0 ? (totalPaidAmount / totalInvoiceAmount) * 100 : 0;

    const displayList = activeTab === 'OVERDUE'
        ? overdueList
        : activeTab === 'DUE_SOON'
        ? dueSoonList
        : paidList;

    return (
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-100 gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Receipt size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                                Cơ Cấu Hóa Đơn & Đôn Đốc Công Nợ
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                {overdueList.length} Quá hạn
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-none mt-1">
                            Biểu đồ tỷ lệ thu hồi công nợ và danh sách đôn đốc hóa đơn tới hạn
                        </p>
                    </div>
                </div>

                <Link
                    href={`/sales/invoices?filter=${activeTab}`}
                    className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 group/link transition-colors py-1.5 px-3 rounded-lg bg-rose-50 hover:bg-rose-100/70 border border-rose-200/60 self-start sm:self-auto"
                >
                    <span>Xem tất cả Hóa đơn</span>
                    <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
                </Link>
            </div>

            {/* Split View: Recharts Donut & Summary (Left 55%) + Actionable Debt List (Right 45%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
                {/* Left: Recharts Donut Chart (7 Cols) */}
                <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                            <PieIcon size={14} className="text-rose-600" />
                            Biểu Đồ Cơ Cấu Công Nợ & Tỷ Lệ Thu Hồi
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            Thu hồi: {collectionRate.toFixed(1)}%
                        </span>
                    </div>

                    {donutData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-12">
                            Chưa có dữ liệu hóa đơn phát hành.
                        </div>
                    ) : (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-1 my-2">
                            {/* Donut Chart */}
                            <div className="relative w-full sm:w-[220px] h-[200px] shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {donutData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#ffffff',
                                                borderRadius: '12px',
                                                border: '1px solid #cbd5e1',
                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                                fontSize: '12px',
                                                padding: '10px 14px'
                                            }}
                                            formatter={(val: any, _name: any, item: any) => [
                                                `${formatMoney(Number(val) || 0)} (${item.payload.count} HĐ)`,
                                                item.payload.name
                                            ]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng xuất</span>
                                    <span className="text-sm font-black text-slate-900 font-mono text-center px-1" title={formatMoney(totalInvoiceAmount)}>
                                        {formatMoney(totalInvoiceAmount)}
                                    </span>
                                </div>
                            </div>

                            {/* HTML Side-by-side Legend (Zero overlap) */}
                            <div className="flex-1 space-y-2 w-full">
                                {donutData.map((d, idx) => {
                                    const share = totalInvoiceAmount > 0 ? (d.value / totalInvoiceAmount) * 100 : 0;
                                    return (
                                        <div
                                            key={idx}
                                            className="p-2.5 rounded-xl border bg-white border-slate-200/80 shadow-2xs hover:border-slate-300 transition-all flex items-center justify-between gap-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="w-3 h-3 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: d.color }} />
                                                <div className="min-w-0">
                                                    <span className="text-xs font-bold text-slate-800 truncate block">
                                                        {d.name}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-medium">
                                                        {d.count} hóa đơn
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="text-right shrink-0">
                                                <span className="text-xs font-mono font-black text-slate-900 block">
                                                    {formatMoney(d.value)}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-500">
                                                    {share.toFixed(1)}%
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Actionable Debt Tracker List (5 Cols) */}
                <div className="lg:col-span-5 flex flex-col justify-between">
                    {/* Segmented Pill Tabs */}
                    <div className="p-1 bg-slate-100/90 rounded-xl flex gap-1 mb-3 border border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setActiveTab('OVERDUE')}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'OVERDUE'
                                    ? 'bg-white text-rose-700 shadow-xs border border-rose-200/70'
                                    : 'text-slate-500 hover:text-slate-800 border border-transparent'
                            }`}
                        >
                            <AlertTriangle size={12} className={activeTab === 'OVERDUE' ? 'text-rose-600' : 'text-slate-400'} />
                            <span>Quá hạn</span>
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-rose-100 text-rose-700">
                                {overdueList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('DUE_SOON')}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'DUE_SOON'
                                    ? 'bg-white text-blue-700 shadow-xs border border-blue-200/70'
                                    : 'text-slate-500 hover:text-slate-800 border border-transparent'
                            }`}
                        >
                            <Clock size={12} className={activeTab === 'DUE_SOON' ? 'text-blue-600' : 'text-slate-400'} />
                            <span>Trong hạn</span>
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-blue-100 text-blue-700">
                                {dueSoonList.length}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('PAID')}
                            className={`flex-1 py-1.5 px-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'PAID'
                                    ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200/70'
                                    : 'text-slate-500 hover:text-slate-800 border border-transparent'
                            }`}
                        >
                            <Check size={12} className={activeTab === 'PAID' ? 'text-emerald-600' : 'text-slate-400'} />
                            <span>Đã thu</span>
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold bg-emerald-100 text-emerald-700">
                                {paidList.length}
                            </span>
                        </button>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2" style={{ maxHeight: '250px' }}>
                        {displayList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-400 text-xs h-full">
                                <CheckCircle2 size={24} className="mb-2 text-emerald-500" />
                                <span className="font-semibold text-slate-600">
                                    {activeTab === 'OVERDUE'
                                        ? 'Không có hóa đơn quá hạn cần thu hồi!'
                                        : activeTab === 'DUE_SOON'
                                        ? 'Không có hóa đơn sắp tới hạn.'
                                        : 'Chưa có hóa đơn tất toán.'}
                                </span>
                            </div>
                        ) : (
                            displayList.slice(0, 15).map(inv => {
                                const remaining = inv.totalAmount - (inv.paidAmount || 0);
                                const isOverdue = activeTab === 'OVERDUE';
                                return (
                                    <div
                                        key={inv.id}
                                        className="group p-2.5 rounded-xl border border-slate-200/80 bg-white hover:border-slate-400 hover:shadow-2xs transition-all duration-150 flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <Link
                                                href={`/sales/invoices/${inv.id}`}
                                                className="font-mono font-bold text-xs text-slate-900 group-hover:text-primary transition-colors flex items-center gap-1.5 truncate"
                                                title={inv.code}
                                            >
                                                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                    isOverdue ? 'bg-rose-500' : activeTab === 'DUE_SOON' ? 'bg-blue-500' : 'bg-emerald-500'
                                                }`} />
                                                {inv.code}
                                            </Link>
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                                                isOverdue
                                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                    : activeTab === 'DUE_SOON'
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            }`}>
                                                <Clock size={10} />
                                                {formatDate(new Date(inv.dueDate || inv.createdAt))}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                                            <span className="text-[11px] text-slate-500 truncate max-w-[150px]" title={inv.customer?.name}>
                                                {inv.customer?.name || 'Khách lẻ'}
                                            </span>
                                            <span className={`font-mono font-black text-xs ${
                                                isOverdue ? 'text-rose-600' : activeTab === 'DUE_SOON' ? 'text-blue-700' : 'text-emerald-700'
                                            }`}>
                                                {activeTab === 'PAID' ? formatMoney(inv.totalAmount) : formatMoney(remaining)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

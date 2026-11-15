'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Printer, Calendar, ArrowRight, ExternalLink, Search } from 'lucide-react';
import Link from 'next/link';
import { formatMoney } from '@/lib/utils/formatters';
import { getSupplierStatement } from '@/app/suppliers/[id]/statement/actions';

interface SupplierStatementPanelProps {
    supplierId: string;
    supplierName: string;
}

export function SupplierStatementPanel({ supplierId, supplierName }: SupplierStatementPanelProps) {
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await getSupplierStatement(supplierId, startDate, endDate);
            if (!res.success) {
                throw new Error(res.error || 'Có lỗi khi tải dữ liệu sao kê công nợ');
            }
            setData(res);
        } catch (err: any) {
            setError(err.message || 'Không thể tải dữ liệu sao kê');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [supplierId]);

    const handlePrint = () => {
        window.print();
    };

    const setQuickDate = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR') => {
        const now = new Date();
        if (preset === 'THIS_MONTH') {
            setStartDate(format(startOfMonth(now), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(now), 'yyyy-MM-dd'));
        } else if (preset === 'LAST_MONTH') {
            const lastMonth = subMonths(now, 1);
            setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
            setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
        } else if (preset === 'THIS_YEAR') {
            setStartDate(format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd'));
            setEndDate(format(now, 'yyyy-MM-dd'));
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(amount || 0));
    };

    const summary = data?.summary;
    const transactions = data?.transactions || [];

    return (
        <div className="statement-panel w-full space-y-4">
            {/* Header & Controls - Hidden when printing */}
            <div className="print-hide space-y-3">
                <div className="flex justify-end items-center">
                    <button 
                        type="button"
                        onClick={handlePrint} 
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition-all cursor-pointer"
                        title="In bản sao kê đối chiếu A4"
                    >
                        <Printer size={13} className="text-slate-500" />
                        <span>In Sao Kê (A4)</span>
                    </button>
                </div>

                {/* Filter Toolbar Card */}
                <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs">
                    <div className="flex flex-wrap gap-3.5 items-end justify-between">
                        <div className="flex flex-wrap sm:flex-nowrap gap-3 flex-1 min-w-[260px]">
                            <div className="flex-1 min-w-[120px]">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Từ ngày</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-1.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-slate-800 font-mono transition-all"
                                />
                            </div>
                            <div className="flex-1 min-w-[120px]">
                                <label className="block text-xs font-semibold text-slate-600 mb-1">Đến ngày</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="w-full px-3 py-1.5 text-xs bg-slate-50/50 border border-slate-200 rounded-lg outline-none focus:border-emerald-500 text-slate-800 font-mono transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button 
                                type="button" 
                                onClick={() => setQuickDate('THIS_MONTH')} 
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer"
                            >
                                Tháng này
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setQuickDate('LAST_MONTH')} 
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer"
                            >
                                Tháng trước
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setQuickDate('THIS_YEAR')} 
                                className="px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-200/80 transition-colors cursor-pointer"
                            >
                                Năm nay
                            </button>

                            <button 
                                type="button"
                                onClick={loadData} 
                                disabled={isLoading} 
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                            >
                                <Search size={13} />
                                <span>{isLoading ? 'Đang tải...' : 'Xem báo cáo'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {error && (
                <div className="print-hide p-3 bg-rose-50 text-rose-700 text-xs font-medium rounded-xl border border-rose-200">
                    {error}
                </div>
            )}

            {/* A4 Target Print Area */}
            <div className="print-a4-container space-y-4">
                {/* Print Header - Visible only when printing */}
                <div className="print-only" style={{ display: 'none', marginBottom: '2rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 0.5rem 0', textTransform: 'uppercase' }}>SAO KÊ CÔNG NỢ NHÀ CUNG CẤP</h1>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 600 }}>Tên nhà cung cấp: {supplierName}</p>
                    <p style={{ margin: 0, fontSize: '0.9rem', fontStyle: 'italic', color: '#334155' }}>
                        Từ {format(new Date(startDate), 'dd/MM/yyyy')} đến {format(new Date(endDate), 'dd/MM/yyyy')}
                    </p>
                </div>

                {/* Harmonized KPI Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 statement-summary-grid">
                        <div className="summary-card bg-white p-3.5 rounded-xl border border-slate-200/90 border-l-4 border-l-slate-400 shadow-2xs">
                            <div className="summary-label text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Số Dư Đầu Kỳ
                            </div>
                            <div className="summary-value text-base font-bold font-mono text-slate-900 tracking-tight">
                                {formatCurrency(summary.openingBalance)}
                            </div>
                        </div>

                        <div className="summary-card bg-white p-3.5 rounded-xl border border-slate-200/90 border-l-4 border-l-rose-500 shadow-2xs">
                            <div className="summary-label text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-1">
                                Phát Sinh Nợ (Hóa Đơn)
                            </div>
                            <div className="summary-value text-base font-bold font-mono text-rose-600 tracking-tight">
                                +{formatCurrency(summary.billedAmount)}
                            </div>
                        </div>

                        <div className="summary-card bg-white p-3.5 rounded-xl border border-slate-200/90 border-l-4 border-l-emerald-500 shadow-2xs">
                            <div className="summary-label text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">
                                Thanh Toán (Có)
                            </div>
                            <div className="summary-value text-base font-bold font-mono text-emerald-600 tracking-tight">
                                -{formatCurrency(summary.paidAmount)}
                            </div>
                        </div>

                        <div className="summary-card closing-card bg-blue-50/50 p-3.5 rounded-xl border border-blue-200 border-l-4 border-l-blue-600 shadow-2xs">
                            <div className="summary-label text-[11px] font-bold uppercase tracking-wider text-blue-700 mb-1">
                                Dư Nợ Cuối Kỳ
                            </div>
                            <div className="summary-value text-base font-black font-mono text-blue-700 tracking-tight">
                                {formatCurrency(summary.closingBalance)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Harmonized Transactions Table */}
                <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden statement-table-card">
                    <div className="overflow-x-auto custom-scrollbar table-responsive-wrapper">
                        <table className="w-full text-left border-collapse min-w-[760px] statement-table">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-500 text-xs font-bold uppercase tracking-wider">
                                    <th className="py-2.5 px-3 text-center w-[120px]">Ngày CT</th>
                                    <th className="py-2.5 px-3 text-center w-[140px]">Số CT</th>
                                    <th className="py-2.5 px-3 text-left">Diễn giải</th>
                                    <th className="py-2.5 px-3 text-right w-[150px]">Phát sinh (Nợ)</th>
                                    <th className="py-2.5 px-3 text-right w-[150px]">Thanh toán (Có)</th>
                                    <th className="py-2.5 px-3 text-right w-[160px]">Số dư nợ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {/* Opening Balance Row */}
                                {summary && (
                                    <tr className="bg-slate-50/60 font-semibold text-slate-700">
                                        <td colSpan={3} className="py-2 px-3 text-right font-bold uppercase tracking-wider text-slate-500 text-[11px]">
                                            Số Dư Đầu Kỳ:
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                                        <td className="py-2 px-3 text-right font-mono text-slate-400">-</td>
                                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">
                                            {formatCurrency(summary.openingBalance)}
                                        </td>
                                    </tr>
                                )}

                                {/* Detail Rows */}
                                {transactions.length > 0 ? (
                                    transactions.map((tx: any, idx: number) => (
                                        <tr key={`${tx.id}-${idx}`} className="hover:bg-slate-50/70 transition-colors">
                                            <td suppressHydrationWarning className="py-2 px-3 text-center font-mono text-slate-600">
                                                {format(new Date(tx.date), 'dd/MM/yyyy')}
                                            </td>
                                            <td className="py-2 px-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="print-hide px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight shrink-0" style={{
                                                        background: tx.type === 'BILL' ? '#fee2e2' : '#dcfce7',
                                                        color: tx.type === 'BILL' ? '#b91c1c' : '#15803d'
                                                    }}>
                                                        {tx.type === 'BILL' ? 'HĐ' : 'PC'}
                                                    </span>
                                                    <span className="print-only text-xs" style={{ display: 'none' }}>
                                                        {tx.type === 'BILL' ? '[HĐ]' : '[PC]'}
                                                    </span>
                                                    <Link 
                                                        href={tx.type === 'BILL' ? `/purchasing/bills/${tx.id}` : `/purchasing/payments/${tx.id}`}
                                                        className="font-mono text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                                    >
                                                        <span>{tx.code}</span>
                                                        <ExternalLink size={11} className="print-hide text-slate-400" />
                                                    </Link>
                                                </div>
                                            </td>
                                            <td className="py-2 px-3 text-slate-700 truncate max-w-md">
                                                {tx.description}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-semibold text-rose-600">
                                                {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-semibold text-emerald-600">
                                                {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                                                {formatCurrency(tx.runningBalance)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-10 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center gap-1.5">
                                                <Calendar size={24} className="text-slate-300" />
                                                <p className="text-xs text-slate-500 m-0">Không có giao dịch phát sinh trong kỳ này.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}

                                {/* Closing Balance Row */}
                                {summary && (
                                    <tr className="bg-slate-50/80 border-t-2 border-slate-200/90 font-bold text-slate-900">
                                        <td colSpan={3} className="py-2.5 px-3 text-right uppercase tracking-wider text-[11px] text-slate-700">
                                            Tổng Cộng Phát Sinh Trong Kỳ:
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">
                                            {formatCurrency(summary.billedAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">
                                            {formatCurrency(summary.paidAmount)}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-black text-blue-700 text-xs sm:text-sm">
                                            {formatCurrency(summary.closingBalance)}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Print Signatures - Visible only when printing */}
                <div className="print-only print-signatures" style={{ display: 'none', justifyContent: 'space-between', padding: '0 3rem', marginTop: '3rem' }}>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>XÁC NHẬN CỦA NHÀ CUNG CẤP</strong>
                        <i style={{ fontSize: '0.85rem' }}>(Ký, đóng dấu và ghi rõ họ tên)</i>
                        <div style={{ height: '80px' }}></div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <strong style={{ display: 'block', fontSize: '0.95rem' }}>NGƯỜI LẬP SAO KÊ</strong>
                        <i style={{ fontSize: '0.85rem' }}>(Ký và ghi rõ họ tên)</i>
                        <div style={{ height: '80px' }}></div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .statement-panel * {
                    box-sizing: border-box;
                }
                @media print {
                    @page { size: A4 landscape; margin: 12mm; }
                    body { visibility: hidden; background-color: white !important; }
                    .statement-panel { position: absolute; left: 0; top: 0; width: 100%; min-height: 0; padding: 0 !important; background-color: white !important; }
                    .statement-panel * { 
                        visibility: visible; 
                        overflow: visible !important;
                    }
                    
                    .print-hide { display: none !important; }
                    .print-only { display: block !important; }
                    .print-signatures { display: flex !important; }
                    
                    .print-a4-container {
                        font-family: "Times New Roman", Times, serif !important;
                        color: #0f172a !important;
                    }

                    .statement-summary-grid {
                        display: flex !important;
                        flex-direction: row !important;
                        flex-wrap: nowrap !important;
                        gap: 0 !important;
                        margin-bottom: 1.5rem !important;
                        border: 1px solid #1e293b !important;
                    }
                    .statement-summary-grid > .summary-card {
                        flex: 1 1 25% !important;
                        width: 25% !important;
                        border: none !important;
                        border-right: 1px solid #1e293b !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        padding: 0.75rem !important;
                        background: none !important;
                    }
                    .statement-summary-grid > .summary-card:last-child {
                        border-right: none !important;
                        background: #f1f5f9 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .summary-card .summary-label {
                        font-size: 0.8rem !important;
                        color: #0f172a !important;
                    }
                    .summary-card .summary-value {
                        font-size: 1rem !important;
                        color: #0f172a !important;
                    }
                    .closing-card .summary-value {
                        font-size: 1.1rem !important;
                        color: #0f172a !important;
                    }

                    .statement-table-card {
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                    }
                    .table-responsive-wrapper {
                        overflow: visible !important;
                        overflow-x: visible !important;
                    }
                    .statement-table {
                        border: none !important;
                        margin-bottom: 1.5rem !important;
                        width: 100% !important;
                        border: 1px solid #1e293b !important;
                        border-collapse: collapse !important;
                        font-size: 0.9rem !important;
                        page-break-inside: auto;
                    }
                    .statement-table th {
                        border: 1px solid #1e293b !important;
                        padding: 0.5rem !important;
                        background-color: #f8fafc !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .statement-table td {
                        border: 1px solid #1e293b !important;
                        padding: 0.4rem 0.5rem !important;
                    }
                    .statement-table tr {
                        page-break-inside: avoid; 
                        page-break-after: auto;
                    }

                    a { text-decoration: none !important; color: inherit !important; }
                }
            `}} />
        </div>
    );
}

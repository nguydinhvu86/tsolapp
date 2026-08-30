'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, FileText, Receipt, CreditCard, Filter, ArrowUpRight, CheckCircle2, Clock, Ban } from 'lucide-react';
import PortalQuickDateFilter from '../components/PortalQuickDateFilter';
import PortalExportPdfButton from '../components/PortalExportPdfButton';

export interface UnifiedTransaction {
    id: string;
    type: 'ORDER' | 'INVOICE' | 'PAYMENT' | 'ESTIMATE';
    typeLabel: string;
    code: string;
    date: string;
    amount: number;
    paidAmount?: number;
    status: string;
    statusLabel: string;
    statusColor: string;
    description: string;
    url: string;
    iconType: string;
}

interface OrdersClientProps {
    initialTransactions: UnifiedTransaction[];
    customerName: string;
    customerEmail?: string | null;
    customerPhone?: string | null;
}

export default function OrdersClient({
    initialTransactions,
    customerName,
    customerEmail,
    customerPhone
}: OrdersClientProps) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const [selectedType, setSelectedType] = useState<string>('ALL');
    const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

    // Lọc dữ liệu theo tất cả tiêu chí
    const filteredTransactions = useMemo(() => {
        return initialTransactions.filter(item => {
            // Lọc theo loại
            if (selectedType !== 'ALL' && item.type !== selectedType) {
                return false;
            }

            // Lọc theo trạng thái
            if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
                return false;
            }

            // Lọc theo từ khóa
            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchCode = item.code.toLowerCase().includes(q);
                const matchDesc = item.description?.toLowerCase().includes(q) || false;
                const matchType = item.typeLabel.toLowerCase().includes(q);
                if (!matchCode && !matchDesc && !matchType) return false;
            }

            // Lọc theo ngày
            if (from) {
                const txDate = item.date.split('T')[0];
                if (txDate < from) return false;
            }
            if (to) {
                const txDate = item.date.split('T')[0];
                if (txDate > to) return false;
            }

            return true;
        });
    }, [initialTransactions, selectedType, selectedStatus, search, from, to]);

    // Thống kê theo phân loại (dựa trên bộ lọc thời gian & từ khóa hiện tại)
    const categoryStats = useMemo(() => {
        const relevant = initialTransactions.filter(item => {
            if (from && item.date.split('T')[0] < from) return false;
            if (to && item.date.split('T')[0] > to) return false;
            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchCode = item.code.toLowerCase().includes(q);
                const matchDesc = item.description?.toLowerCase().includes(q) || false;
                if (!matchCode && !matchDesc) return false;
            }
            return true;
        });

        const estimates = relevant.filter(t => t.type === 'ESTIMATE');
        const orders = relevant.filter(t => t.type === 'ORDER');
        const invoices = relevant.filter(t => t.type === 'INVOICE');
        const payments = relevant.filter(t => t.type === 'PAYMENT');

        return {
            estimates: { count: estimates.length, total: estimates.reduce((s, t) => s + t.amount, 0) },
            orders: { count: orders.length, total: orders.reduce((s, t) => s + t.amount, 0) },
            invoices: { count: invoices.length, total: invoices.reduce((s, t) => s + t.amount, 0) },
            payments: { count: payments.length, total: payments.reduce((s, t) => s + t.amount, 0) },
        };
    }, [initialTransactions, from, to, search]);

    // Thống kê theo trạng thái
    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        initialTransactions.forEach(t => {
            counts[t.status] = (counts[t.status] || 0) + 1;
        });
        return counts;
    }, [initialTransactions]);

    // Tổng hàng giao dịch hiện tại trong bảng
    const tableTotals = useMemo(() => {
        let totalOrders = 0;
        let totalInvoices = 0;
        let totalPayments = 0;

        filteredTransactions.forEach(t => {
            if (t.type === 'ORDER') totalOrders += t.amount;
            if (t.type === 'INVOICE') totalInvoices += t.amount;
            if (t.type === 'PAYMENT') totalPayments += t.amount;
        });

        return {
            totalOrders,
            totalInvoices,
            totalPayments,
            netBalance: totalInvoices - totalPayments
        };
    }, [filteredTransactions]);

    const handleResetFilter = () => {
        setFrom('');
        setTo('');
        setSearch('');
        setSelectedType('ALL');
        setSelectedStatus('ALL');
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <ShoppingCart size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Lịch Sử Giao Dịch</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Tổng hợp tất cả đơn hàng, hóa đơn, báo giá và lịch sử thanh toán của bạn.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <PortalExportPdfButton
                        targetId="portal-transaction-history-print"
                        fileName={`Lich_su_giao_dich_${customerName}`}
                    />
                </div>
            </div>

            {/* Category Stats Cards (Tổng theo phân loại) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div 
                    onClick={() => setSelectedType(selectedType === 'ORDER' ? 'ALL' : 'ORDER')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedType === 'ORDER' 
                            ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/30' 
                            : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <ShoppingCart size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100/60 text-indigo-700">
                            {categoryStats.orders.count} đơn
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tổng Đơn Hàng</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">{formatCurrency(categoryStats.orders.total)}</p>
                </div>

                <div 
                    onClick={() => setSelectedType(selectedType === 'INVOICE' ? 'ALL' : 'INVOICE')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedType === 'INVOICE' 
                            ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/30' 
                            : 'bg-white border-slate-200 hover:border-rose-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <Receipt size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100/60 text-rose-700">
                            {categoryStats.invoices.count} HĐ
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tổng Hóa Đơn (Phát sinh)</p>
                    <p className="text-lg sm:text-xl font-black text-rose-600 tracking-tight">{formatCurrency(categoryStats.invoices.total)}</p>
                </div>

                <div 
                    onClick={() => setSelectedType(selectedType === 'PAYMENT' ? 'ALL' : 'PAYMENT')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedType === 'PAYMENT' 
                            ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30' 
                            : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CreditCard size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-700">
                            {categoryStats.payments.count} phiếu
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đã Thanh Toán (Có)</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">{formatCurrency(categoryStats.payments.total)}</p>
                </div>

                <div 
                    onClick={() => setSelectedType(selectedType === 'ESTIMATE' ? 'ALL' : 'ESTIMATE')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedType === 'ESTIMATE' 
                            ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/30' 
                            : 'bg-white border-slate-200 hover:border-sky-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                            <FileText size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100/60 text-sky-700">
                            {categoryStats.estimates.count} báo giá
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tổng Báo Giá</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">{formatCurrency(categoryStats.estimates.total)}</p>
                </div>
            </div>

            {/* Quick Filters Component */}
            <PortalQuickDateFilter
                from={from}
                to={to}
                search={search}
                onFromChange={setFrom}
                onToChange={setTo}
                onSearchChange={setSearch}
                onReset={handleResetFilter}
                placeholderSearch="Tìm mã giao dịch, phân loại, nội dung..."
            />

            {/* Sub-Filters: Type Tabs & Status Selector */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                {/* Category Pill Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs font-semibold">
                    <span className="text-slate-400 uppercase text-[11px] mr-1 hidden sm:inline">Phân loại:</span>
                    {[
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'ORDER', label: 'Đơn hàng' },
                        { id: 'INVOICE', label: 'Hóa đơn' },
                        { id: 'PAYMENT', label: 'Thanh toán' },
                        { id: 'ESTIMATE', label: 'Báo giá' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setSelectedType(tab.id)}
                            className={`px-3 py-1.5 rounded-xl transition-all ${
                                selectedType === tab.id
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Status Dropdown Filter */}
                <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 uppercase text-[11px]">Trạng thái:</span>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="COMPLETED">Hoàn thành / Đã TT</option>
                        <option value="PAID">Đã thanh toán</option>
                        <option value="CONFIRMED">Đã chốt</option>
                        <option value="ACCEPTED">Đã chấp nhận</option>
                        <option value="SENT">Đã gửi</option>
                        <option value="PARTIAL_PAID">Thanh toán 1 phần</option>
                        <option value="PENDING_PAYMENT">Chờ thanh toán</option>
                        <option value="DRAFT">Bản nháp</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>
                </div>
            </div>

            {/* Printable & Exportable Container */}
            <div id="portal-transaction-history-print" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Print Only Header */}
                <div className="hidden print:block p-6 border-b border-slate-800 text-center">
                    <h2 className="text-2xl font-black uppercase text-slate-900 mb-1">LỊCH SỬ GIAO DỊCH KHÁCH HÀNG</h2>
                    <p className="text-base font-bold text-slate-800">Khách hàng: {customerName}</p>
                    {(from || to) && (
                        <p className="text-xs text-slate-500 italic mt-1">
                            Thời gian: {from ? `Từ ${new Date(from).toLocaleDateString('vi-VN')}` : ''} {to ? `Đến ${new Date(to).toLocaleDateString('vi-VN')}` : ''}
                        </p>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider font-bold print:text-slate-800">
                                <th className="px-5 py-4 w-36">Mã Giao Dịch</th>
                                <th className="px-4 py-4 w-28">Phân Loại</th>
                                <th className="px-4 py-4 w-32">Ngày CT</th>
                                <th className="px-4 py-4">Diễn Giải / Nội Dung</th>
                                <th className="px-5 py-4 text-right w-36">Giá Trị</th>
                                <th className="px-4 py-4 text-center w-32">Trạng Thái</th>
                                <th className="px-4 py-4 text-right w-20 print:hidden">Xem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                        Không tìm thấy giao dịch nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((tx) => {
                                    const isPayment = tx.type === 'PAYMENT';
                                    const isInvoice = tx.type === 'INVOICE';
                                    return (
                                        <tr key={tx.id + tx.type} className="hover:bg-slate-50/80 transition-colors">
                                            <td className="px-5 py-3.5 font-bold">
                                                <a
                                                    href={tx.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-slate-800 hover:text-emerald-600 flex items-center gap-1 group font-semibold"
                                                >
                                                    {tx.code}
                                                    <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 print:hidden" />
                                                </a>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                                    tx.type === 'ORDER' ? 'bg-indigo-100 text-indigo-700' :
                                                    tx.type === 'INVOICE' ? 'bg-rose-100 text-rose-700' :
                                                    tx.type === 'PAYMENT' ? 'bg-emerald-100 text-emerald-700' :
                                                    'bg-sky-100 text-sky-700'
                                                }`}>
                                                    {tx.typeLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-600 font-medium">
                                                {new Date(tx.date).toLocaleDateString('vi-VN')}
                                            </td>
                                            <td className="px-4 py-3.5 text-slate-700">
                                                <p className="line-clamp-1">{tx.description}</p>
                                            </td>
                                            <td className={`px-5 py-3.5 text-right font-bold tracking-tight ${
                                                isPayment ? 'text-emerald-600' : isInvoice ? 'text-rose-600' : 'text-slate-800'
                                            }`}>
                                                {isPayment ? '-' : isInvoice ? '+' : ''} {formatCurrency(tx.amount)}
                                            </td>
                                            <td className="px-4 py-3.5 text-center">
                                                <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${tx.statusColor}`}>
                                                    {tx.statusLabel}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5 text-right print:hidden">
                                                <a
                                                    href={tx.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                                                >
                                                    Chi tiết &rarr;
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>

                        {/* Hàng Tổng Giao Dịch (Table Summary Footer) */}
                        {filteredTransactions.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-slate-800">
                                    <td colSpan={3} className="px-5 py-4 uppercase text-xs">
                                        Tổng cộng ({filteredTransactions.length} giao dịch):
                                    </td>
                                    <td className="px-4 py-4 text-xs text-slate-500 font-medium">
                                        {tableTotals.totalInvoices > 0 && <span>HĐ: <strong>{formatCurrency(tableTotals.totalInvoices)}</strong> | </span>}
                                        {tableTotals.totalPayments > 0 && <span>Đã TT: <strong>{formatCurrency(tableTotals.totalPayments)}</strong></span>}
                                    </td>
                                    <td className="px-5 py-4 text-right text-base font-black text-slate-900">
                                        {selectedType === 'PAYMENT' 
                                            ? formatCurrency(tableTotals.totalPayments)
                                            : selectedType === 'INVOICE'
                                            ? formatCurrency(tableTotals.totalInvoices)
                                            : selectedType === 'ORDER'
                                            ? formatCurrency(tableTotals.totalOrders)
                                            : formatCurrency(tableTotals.totalInvoices + tableTotals.totalOrders)}
                                    </td>
                                    <td colSpan={2} className="px-4 py-4 text-center text-xs text-slate-400">
                                        {selectedType === 'ALL' && tableTotals.netBalance !== 0 && (
                                            <span className={tableTotals.netBalance > 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                                                Dư nợ: {formatCurrency(tableTotals.netBalance)}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>

                {/* Print Signatures */}
                <div className="hidden print:flex justify-between items-start mt-12 p-8 pt-12 border-t border-slate-300">
                    <div className="text-center font-serif">
                        <h3 className="font-bold text-sm uppercase mb-1">XÁC NHẬN CỦA KHÁCH HÀNG</h3>
                        <p className="italic text-xs text-slate-600">(Ký, ghi rõ họ tên và đóng dấu)</p>
                    </div>
                    <div className="text-center font-serif">
                        <h3 className="font-bold text-sm uppercase mb-1">ĐẠI DIỆN CÔNG TY</h3>
                        <p className="italic text-xs text-slate-600">(Ký và ghi rõ họ tên)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

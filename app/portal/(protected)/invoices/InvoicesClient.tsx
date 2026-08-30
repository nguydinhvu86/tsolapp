'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Receipt, ArrowUpRight, CheckCircle2, Clock, AlertCircle, FileSpreadsheet } from 'lucide-react';
import PortalQuickDateFilter from '../components/PortalQuickDateFilter';
import PortalExportPdfButton from '../components/PortalExportPdfButton';

export interface InvoiceItem {
    id: string;
    code: string;
    date: string;
    dueDate?: string | null;
    totalAmount: number;
    paidAmount: number;
    remainingDebt: number;
    status: string;
    statusLabel: string;
    statusColor: string;
    url: string;
}

interface InvoicesClientProps {
    initialInvoices: InvoiceItem[];
    customerName: string;
}

export default function InvoicesClient({ initialInvoices, customerName }: InvoicesClientProps) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    // Lọc dữ liệu
    const filteredInvoices = useMemo(() => {
        return initialInvoices.filter(item => {
            if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchCode = item.code.toLowerCase().includes(q);
                if (!matchCode) return false;
            }

            if (from) {
                const itemDate = item.date.split('T')[0];
                if (itemDate < from) return false;
            }
            if (to) {
                const itemDate = item.date.split('T')[0];
                if (itemDate > to) return false;
            }

            return true;
        });
    }, [initialInvoices, selectedStatus, search, from, to]);

    // Thống kê tổng quan (Overall metrics)
    const stats = useMemo(() => {
        const validInvoices = initialInvoices.filter(i => !['CANCELLED', 'DRAFT'].includes(i.status));
        const totalAmount = validInvoices.reduce((s, i) => s + i.totalAmount, 0);
        const totalPaid = validInvoices.reduce((s, i) => s + i.paidAmount, 0);
        const totalDebt = validInvoices.reduce((s, i) => s + i.remainingDebt, 0);

        const paidCount = initialInvoices.filter(i => i.status === 'PAID').length;
        const partialCount = initialInvoices.filter(i => i.status === 'PARTIAL_PAID').length;
        const pendingCount = initialInvoices.filter(i => ['PENDING_PAYMENT', 'SENT'].includes(i.status)).length;
        const draftCount = initialInvoices.filter(i => i.status === 'DRAFT').length;

        return {
            totalCount: initialInvoices.length,
            totalAmount,
            totalPaid,
            totalDebt,
            paidCount,
            partialCount,
            pendingCount,
            draftCount
        };
    }, [initialInvoices]);

    // Tổng giá trị trong bảng lọc hiện tại
    const tableTotals = useMemo(() => {
        let sumTotal = 0;
        let sumPaid = 0;
        let sumDebt = 0;

        filteredInvoices.forEach(inv => {
            sumTotal += inv.totalAmount;
            sumPaid += inv.paidAmount;
            sumDebt += inv.remainingDebt;
        });

        return { sumTotal, sumPaid, sumDebt };
    }, [filteredInvoices]);

    const handleResetFilter = () => {
        setFrom('');
        setTo('');
        setSearch('');
        setSelectedStatus('ALL');
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <Receipt size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Hóa Đơn Của Tôi</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Tra cứu chi tiết các hóa đơn xuất bán, số tiền đã thanh toán và dư nợ còn lại.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <PortalExportPdfButton
                        targetId="portal-invoices-print"
                        fileName={`Danh_sach_hoa_don_${customerName}`}
                    />
                </div>
            </div>

            {/* Summary KPI Cards (Có Tổng & Có Tổng theo trạng thái) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div 
                    onClick={() => setSelectedStatus('ALL')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'ALL' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Receipt size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-700">
                            {stats.totalCount} HĐ
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tổng Phát Sinh</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.totalAmount)}</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'PAID' ? 'ALL' : 'PAID')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'PAID' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-700">
                            {stats.paidCount} HĐ xong
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đã Thanh Toán</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">{formatCurrency(stats.totalPaid)}</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'PENDING_PAYMENT' ? 'ALL' : 'PENDING_PAYMENT')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'PENDING_PAYMENT' ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/30' : 'bg-white border-slate-200 hover:border-rose-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                            <AlertCircle size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100/60 text-rose-700">
                            {stats.partialCount + stats.pendingCount} HĐ nợ
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Còn Phải Trả</p>
                    <p className="text-lg sm:text-xl font-black text-rose-600 tracking-tight">{formatCurrency(stats.totalDebt)}</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'PARTIAL_PAID' ? 'ALL' : 'PARTIAL_PAID')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'PARTIAL_PAID' ? 'bg-yellow-50/80 border-yellow-300 ring-2 ring-yellow-400/30' : 'bg-white border-slate-200 hover:border-yellow-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
                            <Clock size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100/60 text-yellow-800">
                            Thanh toán 1 phần
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Trả Một Phần</p>
                    <p className="text-lg sm:text-xl font-black text-yellow-700 tracking-tight">{stats.partialCount} HĐ</p>
                </div>
            </div>

            {/* Quick Filter Component */}
            <PortalQuickDateFilter
                from={from}
                to={to}
                search={search}
                onFromChange={setFrom}
                onToChange={setTo}
                onSearchChange={setSearch}
                onReset={handleResetFilter}
                placeholderSearch="Tìm mã hóa đơn (INV...)..."
            />

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm print:hidden text-xs font-semibold">
                <span className="text-slate-400 uppercase text-[11px] mr-1">Trạng thái:</span>
                {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'PAID', label: 'Đã thanh toán' },
                    { id: 'PARTIAL_PAID', label: 'Thanh toán 1 phần' },
                    { id: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
                    { id: 'SENT', label: 'Đã gửi' },
                    { id: 'DRAFT', label: 'Bản nháp' },
                    { id: 'CANCELLED', label: 'Đã hủy' },
                ].map(st => (
                    <button
                        key={st.id}
                        type="button"
                        onClick={() => setSelectedStatus(st.id)}
                        className={`px-3 py-1.5 rounded-xl transition-all ${
                            selectedStatus === st.id
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        {st.label}
                    </button>
                ))}
            </div>

            {/* Printable Container */}
            <div id="portal-invoices-print" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Print Header */}
                <div className="hidden print:block p-6 border-b border-slate-800 text-center">
                    <h2 className="text-2xl font-black uppercase text-slate-900 mb-1">DANH SÁCH HÓA ĐƠN BÁN HÀNG</h2>
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
                                <th className="px-5 py-4 w-36">Mã Hóa Đơn</th>
                                <th className="px-4 py-4 w-32">Ngày Xuất</th>
                                <th className="px-4 py-4 w-32">Hạn Thanh Toán</th>
                                <th className="px-5 py-4 text-right w-36">Tổng Tiền</th>
                                <th className="px-5 py-4 text-right w-36">Đã Thanh Toán</th>
                                <th className="px-5 py-4 text-right w-36">Còn Nợ</th>
                                <th className="px-4 py-4 text-center w-32">Trạng Thái</th>
                                <th className="px-4 py-4 text-right w-24 print:hidden">Chi Tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400 italic">
                                        Không tìm thấy hóa đơn nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-3.5 font-bold">
                                            <a
                                                href={invoice.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 group font-semibold"
                                            >
                                                {invoice.code}
                                                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 print:hidden" />
                                            </a>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                                            {new Date(invoice.date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                                            {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-black tracking-tight text-slate-800">
                                            {formatCurrency(invoice.totalAmount)}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-bold text-emerald-600">
                                            {formatCurrency(invoice.paidAmount)}
                                        </td>
                                        <td className={`px-5 py-3.5 text-right font-black tracking-tight ${
                                            invoice.remainingDebt > 0 ? 'text-rose-600' : 'text-slate-400'
                                        }`}>
                                            {invoice.remainingDebt > 0 ? formatCurrency(invoice.remainingDebt) : '0 đ'}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${invoice.statusColor}`}>
                                                {invoice.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right print:hidden">
                                            <a
                                                href={invoice.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                                            >
                                                Xem &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Hàng Tổng Giao Dịch Chân Bảng */}
                        {filteredInvoices.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-slate-800">
                                    <td colSpan={3} className="px-5 py-4 uppercase text-xs">
                                        Tổng cộng ({filteredInvoices.length} hóa đơn trong kỳ lọc):
                                    </td>
                                    <td className="px-5 py-4 text-right text-base font-black text-slate-900">
                                        {formatCurrency(tableTotals.sumTotal)}
                                    </td>
                                    <td className="px-5 py-4 text-right text-base font-black text-emerald-600">
                                        {formatCurrency(tableTotals.sumPaid)}
                                    </td>
                                    <td className="px-5 py-4 text-right text-base font-black text-rose-600">
                                        {formatCurrency(tableTotals.sumDebt)}
                                    </td>
                                    <td colSpan={2}></td>
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
                        <h3 className="font-bold text-sm uppercase mb-1">BỘ PHẬN KẾ TOÁN</h3>
                        <p className="italic text-xs text-slate-600">(Ký và ghi rõ họ tên)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { FileSignature, ArrowUpRight, CheckCircle2, Clock, XCircle, FileText } from 'lucide-react';
import PortalQuickDateFilter from '../components/PortalQuickDateFilter';
import PortalExportPdfButton from '../components/PortalExportPdfButton';

export interface QuoteItem {
    id: string;
    code: string;
    title: string;
    date: string;
    validUntil?: string | null;
    status: string;
    statusLabel: string;
    statusColor: string;
    amount: number | null;
    type: string;
    url: string;
}

interface QuotesClientProps {
    initialQuotes: QuoteItem[];
    customerName: string;
}

export default function QuotesClient({ initialQuotes, customerName }: QuotesClientProps) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    // Lọc dữ liệu
    const filteredQuotes = useMemo(() => {
        return initialQuotes.filter(item => {
            if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchCode = item.code?.toLowerCase().includes(q) || false;
                const matchTitle = item.title?.toLowerCase().includes(q) || false;
                if (!matchCode && !matchTitle) return false;
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
    }, [initialQuotes, selectedStatus, search, from, to]);

    // Thống kê tổng theo trạng thái
    const stats = useMemo(() => {
        const totalCount = initialQuotes.length;
        const totalAmount = initialQuotes.reduce((s, q) => s + (q.amount || 0), 0);
        const accepted = initialQuotes.filter(q => q.status === 'ACCEPTED');
        const sent = initialQuotes.filter(q => q.status === 'SENT');
        const rejected = initialQuotes.filter(q => q.status === 'REJECTED');
        const draft = initialQuotes.filter(q => q.status === 'DRAFT');

        return {
            totalCount,
            totalAmount,
            acceptedCount: accepted.length,
            acceptedAmount: accepted.reduce((s, q) => s + (q.amount || 0), 0),
            sentCount: sent.length,
            rejectedCount: rejected.length,
            draftCount: draft.length
        };
    }, [initialQuotes]);

    // Tổng giá trị các báo giá đang hiển thị trong bảng
    const currentTableTotal = useMemo(() => {
        return filteredQuotes.reduce((sum, q) => sum + (q.amount || 0), 0);
    }, [filteredQuotes]);

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
                    <div className="w-11 h-11 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <FileSignature size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Báo Giá Của Tôi</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Danh sách các bản báo giá giải pháp, sản phẩm và dịch vụ dành cho bạn.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <PortalExportPdfButton
                        targetId="portal-quotes-print"
                        fileName={`Danh_sach_bao_gia_${customerName}`}
                    />
                </div>
            </div>

            {/* Summary Cards by Status (Tổng theo trạng thái) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div 
                    onClick={() => setSelectedStatus('ALL')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'ALL' ? 'bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/30' : 'bg-white border-slate-200 hover:border-sky-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
                            <FileText size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100/60 text-sky-700">
                            {stats.totalCount} báo giá
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tổng Giá Trị</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.totalAmount)}</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'ACCEPTED' ? 'ALL' : 'ACCEPTED')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'ACCEPTED' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-700">
                            {stats.acceptedCount} báo giá
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đã Chấp Nhận</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">{formatCurrency(stats.acceptedAmount)}</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'SENT' ? 'ALL' : 'SENT')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'SENT' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/30' : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Clock size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100/60 text-blue-700">
                            Đang xử lý
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đã Gửi</p>
                    <p className="text-lg sm:text-xl font-black text-blue-600 tracking-tight">{stats.sentCount} bản</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'REJECTED' ? 'ALL' : 'REJECTED')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'REJECTED' ? 'bg-red-50/80 border-red-300 ring-2 ring-red-400/30' : 'bg-white border-slate-200 hover:border-red-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                            <XCircle size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100/60 text-red-700">
                            Từ chối / Nháp
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Từ Chối / Nháp</p>
                    <p className="text-lg sm:text-xl font-black text-slate-700 tracking-tight">{stats.rejectedCount + stats.draftCount} bản</p>
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
                placeholderSearch="Tìm mã báo giá, tiêu đề báo giá..."
            />

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm print:hidden text-xs font-semibold">
                <span className="text-slate-400 uppercase text-[11px] mr-1">Trạng thái:</span>
                {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'ACCEPTED', label: 'Đã chấp nhận' },
                    { id: 'SENT', label: 'Đã gửi' },
                    { id: 'DRAFT', label: 'Bản nháp' },
                    { id: 'REJECTED', label: 'Từ chối' },
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
            <div id="portal-quotes-print" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Print Header */}
                <div className="hidden print:block p-6 border-b border-slate-800 text-center">
                    <h2 className="text-2xl font-black uppercase text-slate-900 mb-1">DANH SÁCH BÁO GIÁ KHÁCH HÀNG</h2>
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
                                <th className="px-5 py-4 w-36">Mã Báo Giá</th>
                                <th className="px-4 py-4">Tiêu Đề / Nội Dung</th>
                                <th className="px-4 py-4 w-32">Ngày Lập</th>
                                <th className="px-4 py-4 w-32">Hiệu Lực Đến</th>
                                <th className="px-5 py-4 text-right w-36">Tổng Tiền</th>
                                <th className="px-4 py-4 text-center w-32">Trạng Thái</th>
                                <th className="px-4 py-4 text-right w-24 print:hidden">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredQuotes.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                        Không tìm thấy báo giá nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            ) : (
                                filteredQuotes.map((quote) => (
                                    <tr key={quote.id + quote.type} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-3.5 font-bold">
                                            <a
                                                href={quote.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 group font-semibold"
                                            >
                                                {quote.code || quote.title}
                                                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-600 print:hidden" />
                                            </a>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-800 font-medium">
                                            <p className="line-clamp-1">{quote.title}</p>
                                            <span className="text-[10px] text-slate-400 font-normal">{quote.type}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                                            {new Date(quote.date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                                            {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('vi-VN') : '—'}
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-black tracking-tight text-slate-800">
                                            {quote.amount !== null ? formatCurrency(quote.amount) : '—'}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${quote.statusColor}`}>
                                                {quote.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right print:hidden">
                                            <a
                                                href={quote.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                                            >
                                                Xem PDF &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Hàng Tổng Giao Dịch Chân Bảng */}
                        {filteredQuotes.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-slate-800">
                                    <td colSpan={4} className="px-5 py-4 uppercase text-xs">
                                        Tổng cộng ({filteredQuotes.length} báo giá trong kỳ lọc):
                                    </td>
                                    <td className="px-5 py-4 text-right text-base font-black text-slate-900">
                                        {formatCurrency(currentTableTotal)}
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
                        <h3 className="font-bold text-sm uppercase mb-1">ĐẠI DIỆN BÁN HÀNG</h3>
                        <p className="italic text-xs text-slate-600">(Ký và ghi rõ họ tên)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

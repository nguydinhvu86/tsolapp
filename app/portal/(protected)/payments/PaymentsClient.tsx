'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { CreditCard, ArrowUpRight, CheckCircle2, Landmark, Banknote, Clock } from 'lucide-react';
import PortalQuickDateFilter from '../components/PortalQuickDateFilter';
import PortalExportPdfButton from '../components/PortalExportPdfButton';

export interface PaymentItem {
    id: string;
    code: string;
    date: string;
    amount: number;
    paymentMethod: string;
    paymentMethodLabel: string;
    reference?: string | null;
    status: string;
    statusLabel: string;
    statusColor: string;
    bankAccountName?: string | null;
    url: string;
}

interface PaymentsClientProps {
    initialPayments: PaymentItem[];
    customerName: string;
}

export default function PaymentsClient({ initialPayments, customerName }: PaymentsClientProps) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const [selectedMethod, setSelectedMethod] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    // Lọc dữ liệu
    const filteredPayments = useMemo(() => {
        return initialPayments.filter(item => {
            if (selectedMethod !== 'ALL' && item.paymentMethod !== selectedMethod) return false;
            if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false;

            if (search.trim()) {
                const q = search.toLowerCase().trim();
                const matchCode = item.code.toLowerCase().includes(q);
                const matchRef = item.reference?.toLowerCase().includes(q) || false;
                const matchBank = item.bankAccountName?.toLowerCase().includes(q) || false;
                if (!matchCode && !matchRef && !matchBank) return false;
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
    }, [initialPayments, selectedMethod, selectedStatus, search, from, to]);

    // Thống kê tổng quan
    const stats = useMemo(() => {
        const validPayments = initialPayments.filter(p => !['CANCELLED', 'FAILED'].includes(p.status));
        const totalAmount = validPayments.reduce((s, p) => s + p.amount, 0);

        const bankTransfers = validPayments.filter(p => p.paymentMethod === 'BANK_TRANSFER');
        const cash = validPayments.filter(p => p.paymentMethod === 'CASH');
        const completed = initialPayments.filter(p => ['COMPLETED', 'SUCCESS'].includes(p.status) || !p.status);

        return {
            totalCount: initialPayments.length,
            totalAmount,
            bankTotal: bankTransfers.reduce((s, p) => s + p.amount, 0),
            bankCount: bankTransfers.length,
            cashTotal: cash.reduce((s, p) => s + p.amount, 0),
            cashCount: cash.length,
            completedCount: completed.length
        };
    }, [initialPayments]);

    // Tổng tiền trong bảng đang lọc
    const currentTableTotal = useMemo(() => {
        return filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    }, [filteredPayments]);

    const handleResetFilter = () => {
        setFrom('');
        setTo('');
        setSearch('');
        setSelectedMethod('ALL');
        setSelectedStatus('ALL');
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <CreditCard size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Lịch Sử Thanh Toán</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Tra cứu các khoản thanh toán, phiếu thu tiền và biên nhận đã được ghi nhận.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <PortalExportPdfButton
                        targetId="portal-payments-print"
                        fileName={`Lich_su_thanh_toan_${customerName}`}
                    />
                </div>
            </div>

            {/* Summary KPI Cards (Có Tổng & Phân loại phương thức/trạng thái) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div 
                    onClick={() => { setSelectedMethod('ALL'); setSelectedStatus('ALL'); }}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedMethod === 'ALL' && selectedStatus === 'ALL' ? 'bg-teal-50/80 border-teal-300 ring-2 ring-teal-400/30' : 'bg-white border-slate-200 hover:border-teal-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center">
                            <CreditCard size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100/60 text-teal-700">
                            {stats.totalCount} phiếu
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tổng Thanh Toán</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.totalAmount)}</p>
                </div>

                <div 
                    onClick={() => setSelectedMethod(selectedMethod === 'BANK_TRANSFER' ? 'ALL' : 'BANK_TRANSFER')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedMethod === 'BANK_TRANSFER' ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/30' : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Landmark size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100/60 text-indigo-700">
                            {stats.bankCount} giao dịch
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Chuyển Khoản</p>
                    <p className="text-lg sm:text-xl font-black text-indigo-600 tracking-tight">{formatCurrency(stats.bankTotal)}</p>
                </div>

                <div 
                    onClick={() => setSelectedMethod(selectedMethod === 'CASH' ? 'ALL' : 'CASH')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedMethod === 'CASH' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <Banknote size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-700">
                            {stats.cashCount} giao dịch
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tiền Mặt</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">{formatCurrency(stats.cashTotal)}</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'COMPLETED' ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30' : 'bg-white border-slate-200 hover:border-emerald-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100/60 text-emerald-700">
                            Thành công
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đã Ghi Nhận</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-700 tracking-tight">{stats.completedCount} phiếu</p>
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
                placeholderSearch="Tìm mã phiếu thu, tham chiếu, nội dung..."
            />

            {/* Sub-Filters: Method & Status Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm print:hidden">
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="text-slate-400 uppercase text-[11px] mr-1">Hình thức:</span>
                    {[
                        { id: 'ALL', label: 'Tất cả' },
                        { id: 'BANK_TRANSFER', label: 'Chuyển khoản' },
                        { id: 'CASH', label: 'Tiền mặt' },
                    ].map(m => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMethod(m.id)}
                            className={`px-3 py-1.5 rounded-xl transition-all ${
                                selectedMethod === m.id
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {m.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400 uppercase text-[11px]">Trạng thái:</span>
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value)}
                        className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="COMPLETED">Đã xác nhận</option>
                        <option value="DRAFT">Bản nháp</option>
                        <option value="CANCELLED">Đã hủy</option>
                    </select>
                </div>
            </div>

            {/* Printable Container */}
            <div id="portal-payments-print" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Print Header */}
                <div className="hidden print:block p-6 border-b border-slate-800 text-center">
                    <h2 className="text-2xl font-black uppercase text-slate-900 mb-1">LỊCH SỬ THANH TOÁN KHÁCH HÀNG</h2>
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
                                <th className="px-5 py-4 w-36">Mã Phiếu</th>
                                <th className="px-4 py-4 w-32">Ngày TT</th>
                                <th className="px-4 py-4 w-36">Phương Thức</th>
                                <th className="px-4 py-4">Nội Dung / Tham Chiếu</th>
                                <th className="px-5 py-4 text-right w-40">Số Tiền</th>
                                <th className="px-4 py-4 text-center w-32">Trạng Thái</th>
                                <th className="px-4 py-4 text-right w-24 print:hidden">Xem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">
                                        Không tìm thấy khoản thanh toán nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-3.5 font-bold">
                                            <a
                                                href={payment.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-teal-700 hover:text-teal-900 flex items-center gap-1 group font-semibold"
                                            >
                                                {payment.code}
                                                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-teal-600 print:hidden" />
                                            </a>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                                            {new Date(payment.date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
                                                payment.paymentMethod === 'BANK_TRANSFER' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {payment.paymentMethodLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-700">
                                            <p className="line-clamp-1">{payment.reference || 'Thanh toán tiền hàng'}</p>
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-black tracking-tight text-emerald-600">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${payment.statusColor}`}>
                                                {payment.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right print:hidden">
                                            <a
                                                href={payment.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs font-semibold text-teal-600 hover:text-teal-800"
                                            >
                                                Biên lai &rarr;
                                            </a>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Hàng Tổng Giao Dịch Chân Bảng */}
                        {filteredPayments.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-slate-800">
                                    <td colSpan={4} className="px-5 py-4 uppercase text-xs">
                                        Tổng cộng thanh toán ({filteredPayments.length} giao dịch trong kỳ):
                                    </td>
                                    <td className="px-5 py-4 text-right text-base font-black text-emerald-600">
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
                        <h3 className="font-bold text-sm uppercase mb-1">NGƯỜI NỘP TIỀN</h3>
                        <p className="italic text-xs text-slate-600">(Ký và ghi rõ họ tên)</p>
                    </div>
                    <div className="text-center font-serif">
                        <h3 className="font-bold text-sm uppercase mb-1">THỦ QUỸ / KẾ TOÁN</h3>
                        <p className="italic text-xs text-slate-600">(Ký và ghi rõ họ tên)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

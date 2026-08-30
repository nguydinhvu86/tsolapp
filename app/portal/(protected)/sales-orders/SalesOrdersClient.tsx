'use client';

import React, { useState, useMemo } from 'react';
import { formatCurrency } from '@/lib/utils';
import { ShoppingCart, ArrowUpRight, CheckCircle2, Truck, Clock, AlertCircle } from 'lucide-react';
import PortalQuickDateFilter from '../components/PortalQuickDateFilter';
import PortalExportPdfButton from '../components/PortalExportPdfButton';

export interface OrderItem {
    id: string;
    code: string;
    date: string;
    totalAmount: number;
    status: string;
    statusLabel: string;
    statusColor: string;
    url: string;
}

interface SalesOrdersClientProps {
    initialOrders: OrderItem[];
    customerName: string;
}

export default function SalesOrdersClient({ initialOrders, customerName }: SalesOrdersClientProps) {
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('ALL');

    // Lọc dữ liệu
    const filteredOrders = useMemo(() => {
        return initialOrders.filter(item => {
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
    }, [initialOrders, selectedStatus, search, from, to]);

    // Thống kê tổng theo trạng thái
    const stats = useMemo(() => {
        const totalCount = initialOrders.length;
        const totalAmount = initialOrders.reduce((s, o) => s + o.totalAmount, 0);
        const completed = initialOrders.filter(o => o.status === 'COMPLETED');
        const confirmed = initialOrders.filter(o => o.status === 'CONFIRMED');
        const shipping = initialOrders.filter(o => o.status === 'PARTIAL_SHIPPED');
        const pending = initialOrders.filter(o => ['SENT', 'DRAFT'].includes(o.status));

        return {
            totalCount,
            totalAmount,
            completedCount: completed.length,
            completedAmount: completed.reduce((s, o) => s + o.totalAmount, 0),
            confirmedCount: confirmed.length,
            confirmedAmount: confirmed.reduce((s, o) => s + o.totalAmount, 0),
            shippingCount: shipping.length,
            pendingCount: pending.length
        };
    }, [initialOrders]);

    // Tổng tiền trong bảng hiện tại
    const currentTableTotal = useMemo(() => {
        return filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    }, [filteredOrders]);

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
                    <div className="w-11 h-11 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                        <ShoppingCart size={22} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Đơn Hàng Của Tôi</h1>
                        <p className="text-xs sm:text-sm text-slate-500 font-medium">
                            Theo dõi tình trạng đơn đặt hàng, khối lượng và tiến độ giao nhận.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <PortalExportPdfButton
                        targetId="portal-orders-print"
                        fileName={`Danh_sach_don_hang_${customerName}`}
                    />
                </div>
            </div>

            {/* Summary Cards by Status (Tổng theo trạng thái) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                <div 
                    onClick={() => setSelectedStatus('ALL')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'ALL' ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-400/30' : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <ShoppingCart size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100/60 text-indigo-700">
                            {stats.totalCount} đơn
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Tổng Giá Trị Đơn</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">{formatCurrency(stats.totalAmount)}</p>
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
                            {stats.completedCount} đơn
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đã Hoàn Thành</p>
                    <p className="text-lg sm:text-xl font-black text-emerald-600 tracking-tight">{formatCurrency(stats.completedAmount)}</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'CONFIRMED' ? 'ALL' : 'CONFIRMED')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'CONFIRMED' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/30' : 'bg-white border-slate-200 hover:border-blue-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Clock size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100/60 text-blue-700">
                            {stats.confirmedCount} đơn
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đã Chốt / Đang Thực Hiện</p>
                    <p className="text-lg sm:text-xl font-black text-blue-600 tracking-tight">{formatCurrency(stats.confirmedAmount)}</p>
                </div>

                <div 
                    onClick={() => setSelectedStatus(selectedStatus === 'PARTIAL_SHIPPED' ? 'ALL' : 'PARTIAL_SHIPPED')}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm ${
                        selectedStatus === 'PARTIAL_SHIPPED' ? 'bg-yellow-50/80 border-yellow-300 ring-2 ring-yellow-400/30' : 'bg-white border-slate-200 hover:border-yellow-300'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl bg-yellow-100 text-yellow-700 flex items-center justify-center">
                            <Truck size={18} />
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100/60 text-yellow-800">
                            Đang giao hàng
                        </span>
                    </div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">Đang Giao Hàng</p>
                    <p className="text-lg sm:text-xl font-black text-slate-800 tracking-tight">{stats.shippingCount} đơn</p>
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
                placeholderSearch="Tìm theo mã đơn hàng (SO...)..."
            />

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm print:hidden text-xs font-semibold">
                <span className="text-slate-400 uppercase text-[11px] mr-1">Trạng thái:</span>
                {[
                    { id: 'ALL', label: 'Tất cả' },
                    { id: 'COMPLETED', label: 'Hoàn thành' },
                    { id: 'CONFIRMED', label: 'Đã chốt' },
                    { id: 'PARTIAL_SHIPPED', label: 'Giao 1 phần' },
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
            <div id="portal-orders-print" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:border-none print:shadow-none">
                {/* Print Header */}
                <div className="hidden print:block p-6 border-b border-slate-800 text-center">
                    <h2 className="text-2xl font-black uppercase text-slate-900 mb-1">DANH SÁCH ĐƠN ĐẶT HÀNG KHÁCH HÀNG</h2>
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
                                <th className="px-5 py-4 w-40">Mã Đơn Hàng</th>
                                <th className="px-4 py-4 w-36">Ngày Đặt</th>
                                <th className="px-4 py-4">Ghi Chú / Diễn Giải</th>
                                <th className="px-5 py-4 text-right w-44">Tổng Tiền Đơn</th>
                                <th className="px-4 py-4 text-center w-36">Trạng Thái</th>
                                <th className="px-4 py-4 text-right w-24 print:hidden">Chi Tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                                        Không tìm thấy đơn hàng nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-5 py-3.5 font-bold">
                                            <a
                                                href={order.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group font-semibold"
                                            >
                                                {order.code}
                                                <ArrowUpRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 print:hidden" />
                                            </a>
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-600 font-medium">
                                            {new Date(order.date).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3.5 text-slate-700">
                                            <p className="line-clamp-1">Đơn đặt hàng bán {order.code}</p>
                                        </td>
                                        <td className="px-5 py-3.5 text-right font-black tracking-tight text-slate-800">
                                            {formatCurrency(order.totalAmount)}
                                        </td>
                                        <td className="px-4 py-3.5 text-center">
                                            <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${order.statusColor}`}>
                                                {order.statusLabel}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right print:hidden">
                                            <a
                                                href={order.url}
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
                        {filteredOrders.length > 0 && (
                            <tfoot>
                                <tr className="bg-slate-50/90 border-t-2 border-slate-200 font-bold text-slate-800">
                                    <td colSpan={3} className="px-5 py-4 uppercase text-xs">
                                        Tổng cộng ({filteredOrders.length} đơn hàng trong kỳ lọc):
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
                        <h3 className="font-bold text-sm uppercase mb-1">BỘ PHẬN ĐƠN HÀNG</h3>
                        <p className="italic text-xs text-slate-600">(Ký và ghi rõ họ tên)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

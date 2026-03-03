'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Wallet, Calendar, ArrowUpDown, Receipt, MoreVertical, Trash2, CheckCircle2, Upload, FileText, Eye, X, XCircle, RefreshCw } from 'lucide-react';
import { createSalesPayment, deleteSalesPayment, cancelSalesPayment, restoreSalesPayment } from './actions';
import { SearchableSelect } from '@/app/components/ui/SearchableSelect';
import { formatMoney, formatDate } from '@/lib/utils/formatters';

export function SalesPaymentClient({ initialPayments, customers, unpaidInvoices, initialAction, initialCustomerId }: any) {
    const [payments, setPayments] = useState(initialPayments);

    // Filter states
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'date', direction: 'desc' });

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialAction === 'new');
    const [viewingPayment, setViewingPayment] = useState<any>(null);

    // Generic Action Modal State
    const [actionModal, setActionModal] = useState<{ isOpen: boolean, title: string, message: React.ReactNode, action: () => Promise<void> } | null>(null);
    const [isActioning, setIsActioning] = useState(false);

    // Create form state
    const [formData, setFormData] = useState({
        code: `PT-${Date.now().toString().slice(-6)}`,
        customerId: initialCustomerId || '',
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        paymentMethod: 'BANK_TRANSFER',
        reference: '',
        notes: '',
        attachment: ''
    });

    const [allocations, setAllocations] = useState<{ [key: string]: number }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Derived Data
    const customerInvoices = useMemo(() => {
        if (!formData.customerId) return [];
        return unpaidInvoices
            .filter((inv: any) => inv.customerId === formData.customerId)
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [formData.customerId, unpaidInvoices]);

    const totalAllocated = useMemo(() => {
        return Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);
    }, [allocations]);

    const totalStats = useMemo(() => {
        const validPayments = payments.filter((p: any) => p.status !== 'CANCELLED');
        return {
            count: validPayments.length,
            totalAmount: validPayments.reduce((sum: number, p: any) => sum + p.amount, 0),
            thisMonth: validPayments
                .filter((p: any) => new Date(p.date).getMonth() === new Date().getMonth())
                .reduce((sum: number, p: any) => sum + p.amount, 0)
        };
    }, [payments]);

    // Filtering & Sorting
    const filteredPayments = useMemo(() => {
        return payments.filter((payment: any) => {
            const matchSearch =
                payment.code.toLowerCase().includes(search.toLowerCase()) ||
                payment.customer?.name.toLowerCase().includes(search.toLowerCase()) ||
                payment.reference?.toLowerCase().includes(search.toLowerCase());

            let matchDate = true;
            if (dateRange.start) matchDate = matchDate && new Date(payment.date) >= new Date(dateRange.start);
            if (dateRange.end) matchDate = matchDate && new Date(payment.date) <= new Date(dateRange.end);

            return matchSearch && matchDate;
        });
    }, [payments, search, dateRange]);

    const sortedPayments = useMemo(() => {
        return [...filteredPayments].sort((a: any, b: any) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];

            if (sortConfig.key === 'customer') {
                aValue = a.customer?.name || '';
                bValue = b.customer?.name || '';
            }

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredPayments, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Form Handlers
    const handleCustomerChange = (customerId: string) => {
        setFormData(prev => ({ ...prev, customerId }));
        setAllocations({});
    };

    const handleAutoAllocate = () => {
        if (formData.amount <= 0) {
            alert("Vui lòng nhập số tiền thu trước khi phân bổ tự động");
            return;
        }

        let remainingAmount = formData.amount;
        const newAllocations: { [key: string]: number } = {};

        for (const invoice of customerInvoices) {
            if (remainingAmount <= 0) break;
            const debt = invoice.totalAmount - invoice.paidAmount;
            if (debt > 0) {
                const allocated = Math.min(debt, remainingAmount);
                newAllocations[invoice.id] = allocated;
                remainingAmount -= allocated;
            }
        }

        setAllocations(newAllocations);
    };

    const handleAllocationChange = (invoiceId: string, value: number, maxDebt: number) => {
        if (value < 0) value = 0;
        if (value > maxDebt) value = maxDebt;

        setAllocations(prev => {
            const newAlloc = { ...prev, [invoiceId]: value };
            if (value === 0) delete newAlloc[invoiceId];
            return newAlloc;
        });
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        const file = event.target.files[0];

        setIsUploading(true);
        const fbFormData = new FormData();
        fbFormData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: fbFormData
            });
            const data = await res.json();
            if (data.url) {
                setFormData(prev => ({ ...prev, attachment: data.url }));
            }
        } catch (error) {
            console.error("Lỗi upload:", error);
            alert("Không thể tải file lên.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.customerId || formData.amount <= 0) return;

        if (totalAllocated > formData.amount) {
            alert("Số tiền phân bổ không được vượt quá tổng tiền thu!");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                allocations: Object.entries(allocations).map(([invoiceId, amount]) => ({
                    invoiceId,
                    amount
                }))
            };

            await createSalesPayment(payload);
            setFormData({
                code: `PT-${Date.now().toString().slice(-6)}`,
                customerId: '',
                date: new Date().toISOString().split('T')[0],
                amount: 0,
                paymentMethod: 'BANK_TRANSFER',
                reference: '',
                notes: '',
                attachment: ''
            });
            setAllocations({});
            setIsCreateModalOpen(false);
            window.location.href = window.location.pathname;
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = async (id: string, code: string) => {
        setActionModal({
            isOpen: true,
            title: 'Hủy Phiếu Thu',
            message: `Bạn có chắc chắn muốn HỦY Phiếu Thu ${code}? Hệ thống sẽ hoàn trả công nợ cho Khách hàng.`,
            action: async () => {
                try {
                    await cancelSalesPayment(id);
                    window.location.href = window.location.pathname;
                } catch (error: any) {
                    alert(error.message);
                }
            }
        });
    };

    const handleRestore = async (id: string, code: string) => {
        setActionModal({
            isOpen: true,
            title: 'Khôi Phục Phiếu Thu',
            message: `Bạn có chắc KHÔI PHỤC Phiếu Thu ${code}? Hệ thống sẽ tính lại công nợ cho Khách hàng.`,
            action: async () => {
                try {
                    await restoreSalesPayment(id);
                    window.location.href = window.location.pathname;
                } catch (error: any) {
                    alert(error.message);
                }
            }
        });
    };

    const handleDelete = async (id: string, code: string) => {
        setActionModal({
            isOpen: true,
            title: 'Xóa Phiếu Thu',
            message: `Bạn có chắc chắn muốn xóa vĩnh viễn Phiếu Thu ${code}? Hệ thống sẽ hoàn tác công nợ và trạng thái hóa đơn (nếu phiếu chưa hủy).`,
            action: async () => {
                try {
                    await deleteSalesPayment(id);
                    window.location.href = window.location.pathname;
                } catch (error: any) {
                    alert(error.message);
                }
            }
        });
    };

    const customerFormOptions = customers.map((c: any) => ({
        value: c.id,
        label: `${c.code ? c.code + ' - ' : ''}${c.name} (Nợ: ${formatMoney(c.totalDebt)})`
    }));

    return (
        <div className="p-8">
            <div className="page-header">
                <div>
                    <h1 className="text-2xl mb-1">Thanh Toán Bán Hàng</h1>
                    <p className="text-sm text-gray-500">Ghi nhận các khoản thu tiền công nợ từ khách hàng</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary">
                    <Plus size={20} style={{ marginRight: '8px' }} />
                    <span>Tạo Phiếu Thu</span>
                </button>
            </div>

            <div className="card search-card">
                <div className="search-input-wrapper">
                    <Search className="search-icon" size={20} />
                    <input
                        type="text"
                        placeholder="Tìm theo mã PT, KH, tham chiếu..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input"
                    />
                </div>
                <div className="flex gap-4 w-full sm:w-auto text-sm mt-4 sm:mt-0">
                    <div className="stat-card stat-card-blue" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">Tổng Lượt Thu Mới</span>
                            <span className="stat-value">{totalStats.count}</span>
                        </div>
                    </div>
                    <div className="stat-card stat-card-green" style={{ minWidth: '160px' }}>
                        <div className="stat-info">
                            <span className="stat-title">Tổng Tiền Đã Thu</span>
                            <span className="stat-value">{formatMoney(totalStats.totalAmount)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('code')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Mã Phiếu <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('date')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Ngày / Khách Hàng <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('paymentMethod')} className="cursor-pointer hover:bg-gray-100">
                                <div className="flex items-center gap-1">Phương Thức <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th onClick={() => requestSort('amount')} className="cursor-pointer hover:bg-gray-100 text-right">
                                <div className="flex items-center justify-end gap-1">Số Tiền <ArrowUpDown size={14} className="text-gray-400" /></div>
                            </th>
                            <th className="text-center">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedPayments.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-gray-500">
                                    Không tìm thấy phiếu thu nào
                                </td>
                            </tr>
                        ) : (
                            sortedPayments.map((payment) => (
                                <tr key={payment.id} className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${payment.status === 'CANCELLED' ? 'opacity-60 bg-red-50/20' : ''}`}>
                                    <td className="p-4 text-sm font-bold text-gray-900 dark:text-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/sales/payments/${payment.id}`} className="hover:text-primary hover:underline">
                                                {payment.code}
                                            </Link>
                                            {payment.status === 'CANCELLED' && (
                                                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">Đã Hủy</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                                            <Calendar size={13} /> {formatDate(payment.date)}
                                        </div>
                                        <Link href={`/customers/${payment.customerId}`} className="font-semibold text-primary hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline">
                                            {payment.customer?.name}
                                        </Link>
                                    </td>
                                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                                        {payment.paymentMethod === 'CASH' ? 'Tiền Mặt' : 'Chuyển Khoản'}
                                        {payment.reference && <div className="text-xs text-gray-500 mt-1">Ref: {payment.reference}</div>}
                                    </td>
                                    <td className="p-4 text-right">
                                        <span className={`font-semibold text-base ${payment.status === 'CANCELLED' ? 'text-gray-500 line-through' : 'text-green-600 dark:text-green-400'}`}>
                                            {formatMoney(payment.amount)}
                                        </span>
                                        <div className="text-xs text-gray-500 mt-1">
                                            Đã PB: {formatMoney(payment.allocations?.reduce((sum: number, a: any) => sum + a.amount, 0) || 0)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <Link
                                                href={`/sales/payments/${payment.id}`}
                                                className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded inline-block"
                                                title="Xem chi tiết"
                                            >
                                                <Eye size={18} />
                                            </Link>
                                            {payment.status === 'CANCELLED' ? (
                                                <button
                                                    onClick={() => handleRestore(payment.id, payment.code)}
                                                    className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded inline-block"
                                                    title="Khôi phục phiếu thu"
                                                >
                                                    <RefreshCw size={18} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleCancel(payment.id, payment.code)}
                                                    className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded inline-block"
                                                    title="Hủy phiếu thu"
                                                >
                                                    <XCircle size={18} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {
                isCreateModalOpen && (
                    <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="modal-container bg-white dark:bg-[#1E1E1E] rounded-xl w-full flex flex-col max-w-4xl shadow-2xl">
                            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Wallet className="text-green-500" /> Tạo Phiếu Thu Khách Hàng
                                </h2>
                                <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
                            </div>

                            <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
                                <form id="paymentForm" onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <div className="sm:col-span-2 lg:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Khách Hàng *</label>
                                            <SearchableSelect
                                                value={formData.customerId}
                                                onChange={(val) => handleCustomerChange(val)}
                                                options={customerFormOptions}
                                                placeholder="-- Chọn Khách Hàng --"
                                            />
                                        </div>
                                        <div className="sm:col-span-2 lg:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số Tiền Thu Vào *</label>
                                            <input
                                                type="number" required min="1"
                                                value={formData.amount}
                                                onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5 font-bold text-lg text-green-600 dark:text-green-400"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Định dạng số: {formatMoney(formData.amount)}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày Thu</label>
                                            <input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hình Thức</label>
                                            <select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5">
                                                <option value="BANK_TRANSFER">Chuyển Khoản</option>
                                                <option value="CASH">Tiền Mặt</option>
                                            </select>
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tham Chiếu (UNC)</label>
                                            <input type="text" value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 p-2.5" />
                                        </div>
                                        <div className="sm:col-span-1">
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hình ảnh/Tài liệu</label>
                                            <div className="flex items-center gap-3 mt-1">
                                                <label className="cursor-pointer bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 transition-colors w-full justify-center">
                                                    <Upload size={16} />
                                                    {isUploading ? 'Đang tải lên...' : 'Chọn file'}
                                                    <input type="file" accept="image/*,.pdf,.doc,.docx" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                                </label>
                                                {formData.attachment && (
                                                    <a href={formData.attachment} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm flex items-center gap-1 min-w-max">
                                                        <CheckCircle2 size={16} className="text-green-500" /> Đã tải lên
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Allocation Section */}
                                    {formData.customerId && customerInvoices.length > 0 && (
                                        <div>
                                            <div className="flex justify-between items-end mb-3">
                                                <div>
                                                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg flex items-center gap-2">
                                                        Phân Bổ Cấn Trừ Hóa Đơn Nợ
                                                    </h3>
                                                    {formData.amount > 0 && (
                                                        <div className="mt-1.5 text-sm flex items-center gap-2">
                                                            <span className="text-gray-600 dark:text-gray-400">Số tiền chưa phân bổ:</span>
                                                            <span className={`font-bold px-2 py-0.5 rounded-md ${formData.amount - totalAllocated > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : formData.amount === totalAllocated ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                                {formatMoney(formData.amount - totalAllocated)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAutoAllocate}
                                                    className="text-sm font-medium bg-blue-50 text-blue-600 dark:bg-blue-900/30 px-3 py-1.5 rounded hover:bg-blue-100 flex items-center gap-1.5 transition-colors"
                                                >
                                                    <CheckCircle2 size={16} /> Phân bổ tự động
                                                </button>
                                            </div>
                                            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                                                <table className="w-full text-left border-collapse">
                                                    <thead>
                                                        <tr className="bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm">Hóa Đơn / Ngày</th>
                                                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm text-right">Giá Trị HĐ</th>
                                                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm text-right">Còn Nợ</th>
                                                            <th className="p-3 font-semibold text-gray-600 dark:text-gray-300 text-sm text-right w-48">Số Tiền Thu</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {customerInvoices.map((inv: any) => {
                                                            const debt = inv.totalAmount - inv.paidAmount;
                                                            return (
                                                                <tr key={inv.id} className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-[#1E1E1E]">
                                                                    <td className="p-3">
                                                                        <div className="font-medium text-gray-900 dark:text-gray-100">{inv.code}</div>
                                                                        <div className="text-xs text-gray-500">{formatDate(inv.date)}</div>
                                                                    </td>
                                                                    <td className="p-3 text-right text-gray-600 dark:text-gray-400">{formatMoney(inv.totalAmount)}</td>
                                                                    <td className="p-3 text-right font-medium text-red-600 dark:text-red-400">{formatMoney(debt)}</td>
                                                                    <td className="p-3 pr-4 align-top">
                                                                        <div className="relative">
                                                                            <input
                                                                                type="number"
                                                                                min="0"
                                                                                max={debt}
                                                                                value={allocations[inv.id] || ''}
                                                                                onChange={(e) => handleAllocationChange(inv.id, Number(e.target.value), debt)}
                                                                                className="w-full rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 p-2 text-sm text-right focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                                                                placeholder="0"
                                                                            />
                                                                            {(() => {
                                                                                const currentVal = allocations[inv.id] || 0;
                                                                                const maxCanAdd = Math.max(0, formData.amount - totalAllocated + currentVal);
                                                                                const recommendVal = Math.min(debt, maxCanAdd);

                                                                                if (recommendVal > 0 && currentVal !== recommendVal) {
                                                                                    return (
                                                                                        <div className="flex justify-end mt-1.5">
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={() => handleAllocationChange(inv.id, recommendVal, debt)}
                                                                                                className="text-[11px] font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-2 py-0.5 rounded shadow-sm transition-colors active:scale-95"
                                                                                                title="Điền tối đa số tiền còn lại có thể phân bổ"
                                                                                            >
                                                                                                Điền {formatMoney(recommendVal)}
                                                                                            </button>
                                                                                        </div>
                                                                                    );
                                                                                }
                                                                                return null;
                                                                            })()}
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )
                                                        })}
                                                        <tr className="bg-gray-50 dark:bg-gray-800/80 border-t-2 border-gray-200 dark:border-gray-700">
                                                            <td colSpan={2} className="p-3 text-right font-semibold text-gray-700 dark:text-gray-300">Tổng Phân Bổ:</td>
                                                            <td className="p-3 text-right font-bold text-red-600 dark:text-red-400">
                                                                {formatMoney(customerInvoices.reduce((s: number, b: any) => s + (b.totalAmount - b.paidAmount), 0))}
                                                            </td>
                                                            <td className={`p-3 text-right font-bold text-lg pr-4 ${totalAllocated > formData.amount ? 'text-red-600' : 'text-green-600'}`}>
                                                                {formatMoney(totalAllocated)}
                                                                <span className="block text-xs font-normal text-gray-500 mt-1">
                                                                    / Tiền thu: {formatMoney(formData.amount)}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            {totalAllocated > formData.amount && (
                                                <p className="text-red-500 text-sm mt-2 text-right">Lỗi: Tiền phân bổ đang lớn hơn Tổng tiền nhận được.</p>
                                            )}
                                        </div>
                                    )}
                                </form>
                            </div>
                            <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 mt-auto">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 border rounded-lg hover:bg-gray-50">Hủy</button>
                                <button
                                    type="submit"
                                    form="paymentForm"
                                    disabled={isSubmitting || totalAllocated > formData.amount}
                                    style={{ backgroundColor: (isSubmitting || totalAllocated > formData.amount) ? '#9ca3af' : '#16a34a', color: 'white' }}
                                    className="px-6 py-2 rounded-lg font-medium transition-colors"
                                >
                                    {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Có Tiền'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Generic Action Modal */}
            {actionModal?.isOpen && (
                <div className="modal-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="modal-container bg-white dark:bg-[#1E1E1E] rounded-xl w-full flex flex-col max-w-md shadow-2xl">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{actionModal.title}</h2>
                            <button onClick={() => !isActioning && setActionModal(null)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <div className="p-6">
                            <div className="text-gray-700 dark:text-gray-300 text-[15px] mb-6 leading-relaxed">
                                {actionModal.message}
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                                <button type="button" onClick={() => setActionModal(null)} disabled={isActioning} className="px-4 py-2 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 dark:text-gray-300">Hủy Bỏ</button>
                                <button
                                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] px-4 py-2 rounded-lg font-medium flex justify-center items-center"
                                    onClick={async () => {
                                        setIsActioning(true);
                                        try {
                                            await actionModal.action();
                                            setActionModal(null);
                                        } finally {
                                            setIsActioning(false);
                                        }
                                    }}
                                    disabled={isActioning}
                                >
                                    {isActioning ? (
                                        <>
                                            <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '8px' }}></span>
                                            Đang xử lý...
                                        </>
                                    ) : 'Xác Nhận'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}

export default SalesPaymentClient;

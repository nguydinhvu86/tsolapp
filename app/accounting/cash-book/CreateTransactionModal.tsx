'use client'

import React, { useState, useEffect } from 'react';
import { 
    X, Check, DollarSign, Calendar, User, Phone, MapPin, 
    FileText, Landmark, ArrowLeft, Receipt, ShoppingCart, 
    CheckCircle2, AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import { 
    createCashTransaction, 
    getCustomerUnpaidInvoices, 
    getSupplierUnpaidBills 
} from '../actions';
import { numberToVietnameseWords } from '@/lib/vietnameseCurrency';

interface Props {
    initialType?: 'RECEIPT' | 'PAYMENT';
    accounts: any[];
    customers: any[];
    suppliers: any[];
    projects: any[];
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateTransactionModal({
    initialType = 'RECEIPT',
    accounts,
    customers,
    suppliers,
    projects,
    onClose,
    onSuccess
}: Props) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const [type, setType] = useState<'RECEIPT' | 'PAYMENT'>(initialType);
    const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [amount, setAmount] = useState<number>(0);
    const [category, setCategory] = useState<string>(initialType === 'RECEIPT' ? 'SALES' : 'EXPENSE');
    const [payerReceiver, setPayerReceiver] = useState<string>('');
    const [phone, setPhone] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [reason, setReason] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
    const [financeAccountId, setFinanceAccountId] = useState<string>(
        accounts.find(a => a.isDefault)?.id || accounts[0]?.id || ''
    );
    const [customerId, setCustomerId] = useState<string>('');
    const [supplierId, setSupplierId] = useState<string>('');
    const [projectId, setProjectId] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Unpaid Invoices / Bills state for allocation
    const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
    const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
    const [isLoadingDocs, setIsLoadingDocs] = useState<boolean>(false);
    
    // Allocations map: { [id: string]: number }
    const [allocations, setAllocations] = useState<{ [id: string]: number }>({});

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    // Load customer unpaid invoices when customer changes
    const handleCustomerChange = async (cId: string) => {
        setCustomerId(cId);
        setAllocations({});
        const c = customers.find(item => item.id === cId);
        if (c) {
            setPayerReceiver(c.name);
            if (c.phone) setPhone(c.phone);
            if (c.address) setAddress(c.address);
            if (!reason || reason.startsWith('Thu tiền')) setReason(`Thu tiền bán hàng khách hàng ${c.name}`);
            
            setIsLoadingDocs(true);
            try {
                const invoices = await getCustomerUnpaidInvoices(cId);
                setUnpaidInvoices(invoices);
            } catch (err) {
                console.error('Error fetching unpaid invoices:', err);
            } finally {
                setIsLoadingDocs(false);
            }
        } else {
            setUnpaidInvoices([]);
        }
    };

    // Load supplier unpaid bills when supplier changes
    const handleSupplierChange = async (sId: string) => {
        setSupplierId(sId);
        setAllocations({});
        const s = suppliers.find(item => item.id === sId);
        if (s) {
            setPayerReceiver(s.name);
            if (s.phone) setPhone(s.phone);
            if (s.address) setAddress(s.address);
            if (!reason || reason.startsWith('Chi thanh toán')) setReason(`Chi thanh toán mua hàng NCC ${s.name}`);

            setIsLoadingDocs(true);
            try {
                const bills = await getSupplierUnpaidBills(sId);
                setUnpaidBills(bills);
            } catch (err) {
                console.error('Error fetching unpaid bills:', err);
            } finally {
                setIsLoadingDocs(false);
            }
        } else {
            setUnpaidBills([]);
        }
    };

    // Allocation change helper
    const handleAllocationToggle = (docId: string, maxAmount: number) => {
        setAllocations(prev => {
            const next = { ...prev };
            if (next[docId]) {
                delete next[docId];
            } else {
                next[docId] = maxAmount;
            }

            // Recalculate total amount from allocations
            const totalAllocated = Object.values(next).reduce((sum, v) => sum + (v || 0), 0);
            if (totalAllocated > 0) {
                setAmount(totalAllocated);
            }
            return next;
        });
    };

    const handleAllocationAmountChange = (docId: string, val: number, maxAmount: number) => {
        const safeVal = Math.min(Math.max(0, val), maxAmount);
        setAllocations(prev => {
            const next = { ...prev };
            if (safeVal <= 0) {
                delete next[docId];
            } else {
                next[docId] = safeVal;
            }
            const totalAllocated = Object.values(next).reduce((sum, v) => sum + (v || 0), 0);
            if (totalAllocated > 0) {
                setAmount(totalAllocated);
            }
            return next;
        });
    };

    // Quick auto allocate from amount
    const handleAutoAllocate = () => {
        let remainingToAlloc = amount;
        if (remainingToAlloc <= 0) return;

        const docs = type === 'RECEIPT' ? unpaidInvoices : unpaidBills;
        const newAlloc: { [id: string]: number } = {};

        for (const doc of docs) {
            if (remainingToAlloc <= 0) break;
            const canTake = Math.min(remainingToAlloc, doc.remainingAmount);
            if (canTake > 0) {
                newAlloc[doc.id] = canTake;
                remainingToAlloc -= canTake;
            }
        }
        setAllocations(newAlloc);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0) {
            setError('Số tiền phải lớn hơn 0');
            return;
        }
        if (!payerReceiver.trim()) {
            setError(type === 'RECEIPT' ? 'Vui lòng nhập họ tên người nộp tiền' : 'Vui lòng nhập họ tên người nhận tiền');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Build allocations array
            const formattedAllocations = Object.entries(allocations).map(([id, allocAmount]) => {
                if (type === 'RECEIPT') {
                    return { invoiceId: id, amount: allocAmount };
                } else {
                    return { billId: id, amount: allocAmount };
                }
            });

            const res = await createCashTransaction({
                type,
                category,
                transactionDate,
                amount,
                payerReceiver,
                phone,
                address,
                reason,
                paymentMethod,
                financeAccountId: financeAccountId || undefined,
                customerId: customerId || undefined,
                supplierId: supplierId || undefined,
                projectId: projectId || undefined,
                notes,
                allocations: formattedAllocations
            });

            if (res.success) {
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lập chứng từ');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 max-h-[92vh] flex flex-col">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md ${
                            type === 'RECEIPT' 
                                ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20' 
                                : 'bg-gradient-to-tr from-rose-600 to-pink-500 shadow-rose-500/20'
                        }`}>
                            {type === 'RECEIPT' ? 'PT' : 'PC'}
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {type === 'RECEIPT' ? 'Lập Phiếu Thu Tiền (PT)' : 'Lập Phiếu Chi Tiền (PC)'}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                {type === 'RECEIPT' ? 'Ghi nhận dòng tiền vào sổ quỹ & liên kết thu tiền hóa đơn bán hàng' : 'Ghi nhận dòng tiền chi từ quỹ & liên kết thanh toán hóa đơn NCC'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/80 dark:hover:bg-slate-700/80 rounded-xl transition"
                        title="Đóng cửa sổ (ESC)"
                    >
                        <X className="w-4 h-4" />
                        <span>Đóng</span>
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-900 font-semibold flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Switch Receipt / Payment */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => {
                                setType('RECEIPT');
                                setCategory('SALES');
                                setSupplierId('');
                                setUnpaidBills([]);
                                setAllocations({});
                            }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                type === 'RECEIPT' 
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            + LẬP PHIẾU THU (INFLOW)
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setType('PAYMENT');
                                setCategory('PURCHASE');
                                setCustomerId('');
                                setUnpaidInvoices([]);
                                setAllocations({});
                            }}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                type === 'PAYMENT' 
                                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30' 
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            - LẬP PHIẾU CHI (OUTFLOW)
                        </button>
                    </div>

                    {/* Partner Selection (Customer for Receipt / Supplier for Payment) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {type === 'RECEIPT' ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                    Chọn Khách Hàng (Tự liên kết Hóa đơn nợ)
                                </label>
                                <select
                                    value={customerId}
                                    onChange={(e) => handleCustomerChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                >
                                    <option value="">-- Không chọn / Khách vãng lai --</option>
                                    {customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.code ? `[${c.code}] ` : ''}{c.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                    Chọn Nhà Cung Cấp (Tự liên kết HĐ mua hàng)
                                </label>
                                <select
                                    value={supplierId}
                                    onChange={(e) => handleSupplierChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                >
                                    <option value="">-- Không chọn / NCC khác --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Gắn vào Dự Án (Nếu có)
                            </label>
                            <select
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                <option value="">-- Không gắn dự án --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Invoice / Bill Allocations Section (Bidirectional Link) */}
                    {type === 'RECEIPT' && customerId && (
                        <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Receipt className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                                        Phân Bổ Thu Tiền Từ Hóa Đơn Bán Hàng ({unpaidInvoices.length} HĐ còn nợ)
                                    </span>
                                </div>
                                {unpaidInvoices.length > 0 && amount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleAutoAllocate}
                                        className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline flex items-center gap-1"
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        Tự động phân bổ theo số tiền
                                    </button>
                                )}
                            </div>

                            {isLoadingDocs ? (
                                <div className="py-4 text-center text-xs text-slate-400">
                                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-emerald-600" />
                                    Đang tải danh sách hóa đơn...
                                </div>
                            ) : unpaidInvoices.length > 0 ? (
                                <div className="border border-emerald-200/80 dark:border-emerald-900/40 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-emerald-50/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-emerald-200 dark:border-slate-800 text-[10px] uppercase">
                                            <tr>
                                                <th className="py-2.5 px-3 w-8 text-center">Chọn</th>
                                                <th className="py-2.5 px-3">Mã Hóa Đơn</th>
                                                <th className="py-2.5 px-3">Ngày HĐ</th>
                                                <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                                                <th className="py-2.5 px-3 text-right">Còn Nợ</th>
                                                <th className="py-2.5 px-3 text-right w-36">Tiền Phân Bổ (đ)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {unpaidInvoices.map((inv) => {
                                                const isAllocated = !!allocations[inv.id];
                                                const allocVal = allocations[inv.id] || 0;
                                                return (
                                                    <tr key={inv.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                                                        <td className="py-2 px-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllocated}
                                                                onChange={() => handleAllocationToggle(inv.id, inv.remainingAmount)}
                                                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                                            {inv.code}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-500">
                                                            {new Date(inv.date).toLocaleDateString('vi-VN')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                            {formatVND(inv.totalAmount)}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-bold text-rose-600">
                                                            {formatVND(inv.remainingAmount)}
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={inv.remainingAmount}
                                                                value={allocVal || ''}
                                                                onChange={(e) => handleAllocationAmountChange(inv.id, Number(e.target.value), inv.remainingAmount)}
                                                                placeholder="0"
                                                                className="w-full px-2 py-1 text-right font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 italic">
                                    Khách hàng này hiện không có hóa đơn nào chưa thanh toán. Phiếu thu sẽ được ghi nhận vào sổ quỹ thông thường.
                                </div>
                            )}
                        </div>
                    )}

                    {type === 'PAYMENT' && supplierId && (
                        <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-rose-600" />
                                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wide">
                                        Phân Bổ Chi Thanh Toán Cho Hóa Đơn NCC ({unpaidBills.length} HĐ còn nợ)
                                    </span>
                                </div>
                                {unpaidBills.length > 0 && amount > 0 && (
                                    <button
                                        type="button"
                                        onClick={handleAutoAllocate}
                                        className="text-[11px] font-bold text-rose-700 dark:text-rose-300 hover:underline flex items-center gap-1"
                                    >
                                        <Layers className="w-3.5 h-3.5" />
                                        Tự động phân bổ theo số tiền
                                    </button>
                                )}
                            </div>

                            {isLoadingDocs ? (
                                <div className="py-4 text-center text-xs text-slate-400">
                                    <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-rose-600" />
                                    Đang tải danh sách hóa đơn mua hàng...
                                </div>
                            ) : unpaidBills.length > 0 ? (
                                <div className="border border-rose-200/80 dark:border-rose-900/40 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-rose-50/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-rose-200 dark:border-slate-800 text-[10px] uppercase">
                                            <tr>
                                                <th className="py-2.5 px-3 w-8 text-center">Chọn</th>
                                                <th className="py-2.5 px-3">Mã Đơn / HĐ Mua</th>
                                                <th className="py-2.5 px-3">Ngày</th>
                                                <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                                                <th className="py-2.5 px-3 text-right">Còn Nợ</th>
                                                <th className="py-2.5 px-3 text-right w-36">Tiền Chi (đ)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {unpaidBills.map((bill) => {
                                                const isAllocated = !!allocations[bill.id];
                                                const allocVal = allocations[bill.id] || 0;
                                                return (
                                                    <tr key={bill.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                                                        <td className="py-2 px-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllocated}
                                                                onChange={() => handleAllocationToggle(bill.id, bill.remainingAmount)}
                                                                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
                                                            />
                                                        </td>
                                                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                                            {bill.code}
                                                            {bill.supplierInvoice && (
                                                                <span className="text-[10px] text-slate-400 block">Số: {bill.supplierInvoice}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-500">
                                                            {new Date(bill.date).toLocaleDateString('vi-VN')}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                                                            {formatVND(bill.totalAmount)}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-bold text-amber-600">
                                                            {formatVND(bill.remainingAmount)}
                                                        </td>
                                                        <td className="py-2 px-3 text-right">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                max={bill.remainingAmount}
                                                                value={allocVal || ''}
                                                                onChange={(e) => handleAllocationAmountChange(bill.id, Number(e.target.value), bill.remainingAmount)}
                                                                placeholder="0"
                                                                className="w-full px-2 py-1 text-right font-bold text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-rose-700 dark:text-rose-400 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-xs text-slate-500 italic">
                                    Nhà cung cấp này hiện không có hóa đơn mua hàng nào chưa thanh toán. Phiếu chi sẽ được ghi nhận vào sổ quỹ thông thường.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amount & Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Tổng số tiền chứng từ (VNĐ) <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                step="1000"
                                required
                                value={amount || ''}
                                onChange={(e) => setAmount(Number(e.target.value))}
                                placeholder="0"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-950 dark:text-white font-black text-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Ngày chứng từ <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={transactionDate}
                                onChange={(e) => setTransactionDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Currency in Words Preview */}
                    {amount > 0 && (
                        <div className="p-3 bg-emerald-50/60 dark:bg-slate-800 rounded-xl border border-emerald-200/80 dark:border-slate-700 text-xs">
                            <span className="text-slate-500 font-semibold">Bằng chữ: </span>
                            <span className="font-bold italic text-emerald-800 dark:text-emerald-400">
                                {numberToVietnameseWords(amount)}
                            </span>
                        </div>
                    )}

                    {/* Category & Account */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Danh mục nghiệp vụ
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                {type === 'RECEIPT' ? (
                                    <>
                                        <option value="SALES">Thu tiền bán hàng / Khách thanh toán</option>
                                        <option value="ADVANCE_REFUND">Thu hoàn ứng tạm ứng</option>
                                        <option value="BANK_INTEREST">Thu lãi tiền gửi / Đầu tư</option>
                                        <option value="DEBT_RECOVERY">Thu hồi nợ khó đòi</option>
                                        <option value="OTHER">Thu khác</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="PURCHASE">Chi trả tiền mua hàng / NCC</option>
                                        <option value="EXPENSE">Chi phí vận hành doanh nghiệp</option>
                                        <option value="PAYROLL">Chi trả lương & thưởng nhân viên</option>
                                        <option value="ADVANCE">Tạm ứng cho nhân viên</option>
                                        <option value="OFFICE">Chi mua sắm văn phòng phẩm / TSCĐ</option>
                                        <option value="OTHER">Chi khác</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Tài khoản / Quỹ hạch toán
                            </label>
                            <select
                                value={financeAccountId}
                                onChange={(e) => setFinanceAccountId(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            >
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name} ({new Intl.NumberFormat('vi-VN').format(acc.currentBalance)} đ)
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Payer/Receiver details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                {type === 'RECEIPT' ? 'Họ tên người nộp tiền' : 'Họ tên người nhận tiền'} <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={payerReceiver}
                                onChange={(e) => setPayerReceiver(e.target.value)}
                                placeholder="VD: Nguyễn Văn A..."
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Số điện thoại
                            </label>
                            <input
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="098xxxxxxx"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Địa chỉ / Đơn vị
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Địa chỉ hoặc đơn vị công tác..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                            Lý do {type === 'RECEIPT' ? 'nộp tiền' : 'chi tiền'}
                        </label>
                        <input
                            type="text"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Nội dung cụ thể..."
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Đóng Lại</span>
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 ${
                                type === 'RECEIPT' 
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/30' 
                                    : 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 shadow-rose-600/30'
                            }`}
                        >
                            <Check className="w-4 h-4" />
                            <span>{isSubmitting ? 'Đang lưu...' : type === 'RECEIPT' ? 'Lưu Phiếu Thu & Phân Bổ' : 'Lưu Phiếu Chi & Phân Bổ'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

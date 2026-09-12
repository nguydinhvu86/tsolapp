'use client'

import React, { useState, useEffect } from 'react';
import { X, Check, DollarSign, Calendar, User, Phone, MapPin, FileText, Landmark, ArrowLeft } from 'lucide-react';
import { createCashTransaction } from '../actions';
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

    const handleCustomerChange = (cId: string) => {
        setCustomerId(cId);
        const c = customers.find(item => item.id === cId);
        if (c) {
            setPayerReceiver(c.name);
            if (c.phone) setPhone(c.phone);
            if (c.address) setAddress(c.address);
            if (!reason) setReason(`Thu tiền bán hàng khách hàng ${c.name}`);
        }
    };

    const handleSupplierChange = (sId: string) => {
        setSupplierId(sId);
        const s = suppliers.find(item => item.id === sId);
        if (s) {
            setPayerReceiver(s.name);
            if (s.phone) setPhone(s.phone);
            if (s.address) setAddress(s.address);
            if (!reason) setReason(`Chi thanh toán mua hàng NCC ${s.name}`);
        }
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
                notes
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
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
                                {type === 'RECEIPT' ? 'Ghi nhận dòng tiền vào sổ quỹ & tài khoản ngân hàng' : 'Ghi nhận dòng tiền chi từ quỹ & tài khoản'}
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-900 font-semibold flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* Switch Receipt / Payment */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={() => {
                                setType('RECEIPT');
                                setCategory('SALES');
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
                                setCategory('EXPENSE');
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

                    {/* Row 1: Amount & Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Số tiền (VNĐ) <span className="text-rose-500">*</span>
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

                    {/* Row 2: Category & Account */}
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

                    {/* Row 3: Quick Partner Link (Customer / Supplier / Project) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {type === 'RECEIPT' ? (
                            <div>
                                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
                                    Chọn Khách Hàng (Tự điền thông tin)
                                </label>
                                <select
                                    value={customerId}
                                    onChange={(e) => handleCustomerChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                                    Chọn Nhà Cung Cấp (Tự điền thông tin)
                                </label>
                                <select
                                    value={supplierId}
                                    onChange={(e) => handleSupplierChange(e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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

                    {/* Row 4: Payer/Receiver details */}
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

                    {/* Row 5: Address */}
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

                    {/* Row 6: Reason */}
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
                            <span>{isSubmitting ? 'Đang lưu...' : type === 'RECEIPT' ? 'Lưu Phiếu Thu' : 'Lưu Phiếu Chi'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

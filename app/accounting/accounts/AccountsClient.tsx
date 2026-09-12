'use client'

import React, { useState, useTransition } from 'react';
import { 
    Landmark, Wallet, Plus, Edit2, Check, X, 
    CreditCard, Building2, CheckCircle2, RefreshCw, AlertCircle
} from 'lucide-react';
import { getFinanceAccounts, createFinanceAccount, updateFinanceAccount } from '../actions';

interface Props {
    initialAccounts: any[];
}

export default function AccountsClient({ initialAccounts }: Props) {
    const [accounts, setAccounts] = useState<any[]>(initialAccounts);
    const [isPending, startTransition] = useTransition();

    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any | null>(null);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setShowModal(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Form state
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<'BANK' | 'CASH'>('BANK');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [branch, setBranch] = useState('');
    const [initialBalance, setInitialBalance] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const handleOpenCreate = () => {
        setEditingAccount(null);
        setCode('');
        setName('');
        setType('BANK');
        setAccountNumber('');
        setBankName('');
        setBranch('');
        setInitialBalance(0);
        setDescription('');
        setIsDefault(false);
        setError(null);
        setShowModal(true);
    };

    const handleOpenEdit = (acc: any) => {
        setEditingAccount(acc);
        setCode(acc.code);
        setName(acc.name);
        setType(acc.type);
        setAccountNumber(acc.accountNumber || '');
        setBankName(acc.bankName || '');
        setBranch(acc.branch || '');
        setInitialBalance(acc.initialBalance || 0);
        setDescription(acc.description || '');
        setIsDefault(acc.isDefault || false);
        setError(null);
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) {
            setError('Vui lòng nhập tên tài khoản / quỹ');
            return;
        }

        try {
            if (editingAccount) {
                await updateFinanceAccount(editingAccount.id, {
                    name,
                    type,
                    accountNumber,
                    bankName,
                    branch,
                    description,
                    isDefault
                });
            } else {
                if (!code.trim()) {
                    setError('Vui lòng nhập mã định danh');
                    return;
                }
                await createFinanceAccount({
                    code,
                    name,
                    type,
                    accountNumber,
                    bankName,
                    branch,
                    initialBalance,
                    description,
                    isDefault
                });
            }

            setShowModal(false);
            startTransition(async () => {
                const refreshed = await getFinanceAccounts();
                setAccounts(refreshed);
            });
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lưu tài khoản');
        }
    };

    const totalBalance = accounts.reduce((sum, a) => sum + (a.currentBalance || 0), 0);

    return (
        <div className="space-y-6 pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                            <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Tài Khoản Ngân Hàng & Sổ Quỹ Tiền Mặt
                            </h1>
                            <p className="text-xs text-slate-500">
                                Quản lý danh mục tài khoản giao dịch, theo dõi số dư tức thời và hạch toán sổ quỹ
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        Thêm Tài Khoản / Quỹ Mới
                    </button>
                </div>
            </div>

            {/* Total Balance Banner */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-600/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <span className="text-xs font-medium text-emerald-100 uppercase tracking-wider">
                        Tổng Số Dư Khả Dụng Toàn Hệ Thống
                    </span>
                    <div className="text-3xl font-black mt-1 tracking-tight">
                        {formatVND(totalBalance)}
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-100 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                    <span>{accounts.length} tài khoản & quỹ đang hoạt động</span>
                </div>
            </div>

            {/* Accounts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {accounts.map(acc => (
                    <div
                        key={acc.id}
                        className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:border-emerald-500/50 transition flex flex-col justify-between"
                    >
                        <div>
                            {/* Card Header */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                                        acc.type === 'CASH' 
                                            ? 'bg-amber-500 shadow-amber-500/20' 
                                            : 'bg-emerald-600 shadow-emerald-600/20'
                                    }`}>
                                        {acc.type === 'CASH' ? <Wallet className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                                                {acc.name}
                                            </h3>
                                            {acc.isDefault && (
                                                <span className="px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded">
                                                    Mặc định
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[11px] font-mono font-semibold text-slate-400">
                                            {acc.code}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleOpenEdit(acc)}
                                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                                    title="Chỉnh sửa"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Bank Details if Bank */}
                            {acc.type === 'BANK' && acc.accountNumber && (
                                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1 text-xs">
                                    <div className="text-slate-500">
                                        Số TK: <span className="font-mono font-bold text-slate-900 dark:text-white">{acc.accountNumber}</span>
                                    </div>
                                    {acc.bankName && (
                                        <div className="text-slate-600 dark:text-slate-300 truncate">
                                            {acc.bankName} {acc.branch ? `(${acc.branch})` : ''}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description if Cash */}
                            {acc.type === 'CASH' && acc.description && (
                                <div className="mt-4 text-xs text-slate-500 italic">
                                    {acc.description}
                                </div>
                            )}
                        </div>

                        {/* Balance Section */}
                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-baseline justify-between">
                            <div>
                                <span className="text-[10px] uppercase font-semibold text-slate-400">Số dư hiện tại</span>
                                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                                    {formatVND(acc.currentBalance)}
                                </div>
                            </div>
                            <div className="text-[11px] text-slate-400">
                                {acc._count?.transactions || 0} giao dịch
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal Create / Edit */}
            {showModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowModal(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold">
                                    <Landmark size={18} />
                                </div>
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                    {editingAccount ? 'Chỉnh Sửa Tài Khoản / Quỹ' : 'Thêm Tài Khoản / Quỹ Mới'}
                                </h2>
                            </div>
                            <button 
                                onClick={() => setShowModal(false)} 
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition"
                                title="Đóng (ESC)"
                            >
                                <X className="w-4 h-4" />
                                <span>Đóng</span>
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 text-xs rounded-xl border border-rose-200">
                                    {error}
                                </div>
                            )}

                            {/* Type Switch */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Loại tài khoản
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('BANK')}
                                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-2 ${
                                            type === 'BANK'
                                                ? 'bg-emerald-50 dark:bg-emerald-950 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                                        }`}
                                    >
                                        <Landmark className="w-4 h-4" />
                                        Tài Khoản Ngân Hàng
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('CASH')}
                                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-2 ${
                                            type === 'CASH'
                                                ? 'bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600'
                                        }`}
                                    >
                                        <Wallet className="w-4 h-4" />
                                        Quỹ Tiền Mặt
                                    </button>
                                </div>
                            </div>

                            {/* Code & Name */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Mã viết tắt <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!editingAccount}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        placeholder="VD: VCB-01, TM-01"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs uppercase font-mono font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Tên tài khoản / quỹ <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="VD: Vietcombank CN Hà Nội"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                    />
                                </div>
                            </div>

                            {/* Bank Specific Fields */}
                            {type === 'BANK' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Số tài khoản ngân hàng
                                        </label>
                                        <input
                                            type="text"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            placeholder="001100xxxxxxx"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Tên ngân hàng
                                            </label>
                                            <input
                                                type="text"
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                                placeholder="VD: Vietcombank"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                Chi nhánh
                                            </label>
                                            <input
                                                type="text"
                                                value={branch}
                                                onChange={(e) => setBranch(e.target.value)}
                                                placeholder="VD: Sở Giao Dịch"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Initial Balance (only for new account) */}
                            {!editingAccount && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Số dư ban đầu (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        value={initialBalance || ''}
                                        onChange={(e) => setInitialBalance(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                                    />
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Mô tả / Ghi chú
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ghi chú về tài khoản này..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                />
                            </div>

                            {/* Default Checkbox */}
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pt-2">
                                <input
                                    type="checkbox"
                                    checked={isDefault}
                                    onChange={(e) => setIsDefault(e.target.checked)}
                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>Đặt làm tài khoản / quỹ mặc định khi lập chứng từ</span>
                            </label>

                            {/* Submit */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg transition"
                                >
                                    {editingAccount ? 'Lưu Thay Đổi' : 'Thêm Mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
    Landmark, Wallet, Plus, Edit2, Check, X, 
    CreditCard, Building2, CheckCircle2, RefreshCw, AlertCircle,
    ArrowRightLeft, History, Copy, CheckCheck, FileSpreadsheet,
    ArrowDownLeft, ArrowUpRight, Search, ShieldCheck, TrendingUp,
    SlidersHorizontal, Trash2
} from 'lucide-react';
import { 
    getFinanceAccounts, 
    createFinanceAccount, 
    updateFinanceAccount, 
    deleteFinanceAccount,
    transferInternalFunds,
    getAccountTransactions
} from '../actions';
import { numberToVietnameseWords } from '@/lib/vietnameseCurrency';

interface Props {
    initialAccounts: any[];
}

const POPULAR_BANKS = [
    { code: 'VCB', name: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)' },
    { code: 'TCB', name: 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)' },
    { code: 'MB', name: 'Ngân hàng TMCP Quân Đội (MBBank)' },
    { code: 'BIDV', name: 'Ngân hàng TMCP Đầu Tư và Phát Triển VN (BIDV)' },
    { code: 'CTG', name: 'Ngân hàng TMCP Công Thương Việt Nam (VietinBank)' },
    { code: 'ACB', name: 'Ngân hàng TMCP Á Châu (ACB)' },
    { code: 'VPB', name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng (VPBank)' },
    { code: 'TPB', name: 'Ngân hàng TMCP Tiên Phong (TPBank)' },
    { code: 'STB', name: 'Ngân hàng TMCP Sài Gòn Thương Tín (Sacombank)' },
    { code: 'AGR', name: 'Ngân hàng Nông Nghiệp và PTNT Việt Nam (Agribank)' },
    { code: 'HDB', name: 'Ngân hàng TMCP Phát Triển TP.HCM (HDBank)' },
    { code: 'VIB', name: 'Ngân hàng TMCP Quốc Tế Việt Nam (VIB)' },
    { code: 'MSB', name: 'Ngân hàng TMCP Hàng Hải Việt Nam (MSB)' },
    { code: 'SHB', name: 'Ngân hàng TMCP Sài Gòn - Hà Nội (SHB)' },
    { code: 'OCB', name: 'Ngân hàng TMCP Phương Đông (OCB)' },
    { code: 'OTHER', name: 'Ngân hàng khác...' }
];

export default function AccountsClient({ initialAccounts }: Props) {
    const [accounts, setAccounts] = useState<any[]>(initialAccounts);
    const [isPending, startTransition] = useTransition();
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Filter & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'ALL' | 'BANK' | 'CASH'>('ALL');

    // Modals
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any | null>(null);

    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferSourceId, setTransferSourceId] = useState<string>('');

    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyAccount, setHistoryAccount] = useState<any | null>(null);
    const [historyTransactions, setHistoryTransactions] = useState<any[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    // Form state (Create/Edit)
    const [code, setCode] = useState('');
    const [name, setName] = useState('');
    const [type, setType] = useState<'BANK' | 'CASH'>('BANK');
    const [accountNumber, setAccountNumber] = useState('');
    const [selectedBankKey, setSelectedBankKey] = useState('VCB');
    const [bankName, setBankName] = useState('Vietcombank');
    const [branch, setBranch] = useState('');
    const [initialBalance, setInitialBalance] = useState<number>(0);
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Transfer form state
    const [transferDestId, setTransferDestId] = useState('');
    const [transferAmount, setTransferAmount] = useState<number>(0);
    const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [transferFee, setTransferFee] = useState<number>(0);
    const [transferFeePaidBy, setTransferFeePaidBy] = useState<'SENDER' | 'RECEIVER'>('SENDER');
    const [transferReason, setTransferReason] = useState('');
    const [transferNotes, setTransferNotes] = useState('');
    const [transferError, setTransferError] = useState<string | null>(null);

    // Hotkey ESC to close modals
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setShowAccountModal(false);
                setShowTransferModal(false);
                setShowHistoryModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    // Calculate Summary Stats
    const summary = useMemo(() => {
        let totalCash = 0;
        let totalBank = 0;
        let activeCount = 0;

        accounts.forEach(acc => {
            if (acc.isActive !== false) {
                activeCount++;
                if (acc.type === 'CASH') {
                    totalCash += acc.currentBalance || 0;
                } else {
                    totalBank += acc.currentBalance || 0;
                }
            }
        });

        return {
            totalCash,
            totalBank,
            totalAll: totalCash + totalBank,
            activeCount,
            totalCount: accounts.length
        };
    }, [accounts]);

    // Filtered accounts
    const filteredAccounts = useMemo(() => {
        return accounts.filter(acc => {
            if (filterType !== 'ALL' && acc.type !== filterType) return false;
            if (searchQuery) {
                const s = searchQuery.toLowerCase();
                return (
                    acc.name.toLowerCase().includes(s) ||
                    acc.code.toLowerCase().includes(s) ||
                    (acc.accountNumber && acc.accountNumber.toLowerCase().includes(s)) ||
                    (acc.bankName && acc.bankName.toLowerCase().includes(s))
                );
            }
            return true;
        });
    }, [accounts, filterType, searchQuery]);

    // Handlers
    const handleRefresh = () => {
        startTransition(async () => {
            const refreshed = await getFinanceAccounts();
            setAccounts(refreshed);
        });
    };

    const handleOpenCreate = () => {
        setEditingAccount(null);
        setCode('');
        setName('');
        setType('BANK');
        setAccountNumber('');
        setSelectedBankKey('VCB');
        setBankName('Vietcombank');
        setBranch('');
        setInitialBalance(0);
        setDescription('');
        setIsDefault(false);
        setIsActive(true);
        setError(null);
        setShowAccountModal(true);
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
        setIsActive(acc.isActive !== false);
        setError(null);
        setShowAccountModal(true);
    };

    const handleSelectBankPreset = (bankKey: string) => {
        setSelectedBankKey(bankKey);
        const b = POPULAR_BANKS.find(item => item.code === bankKey);
        if (b && bankKey !== 'OTHER') {
            setBankName(b.name);
            if (!editingAccount) {
                setCode(`${b.code}-01`);
                setName(`${b.name.split('(')[1]?.replace(')', '') || b.code} Doanh Nghiệp`);
            }
        }
    };

    const handleAccountSubmit = async (e: React.FormEvent) => {
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
                    isDefault,
                    isActive
                });
            } else {
                if (!code.trim()) {
                    setError('Vui lòng nhập mã tài khoản (VD: VCB-01)');
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

            setShowAccountModal(false);
            const refreshed = await getFinanceAccounts();
            setAccounts(refreshed);
        } catch (err: any) {
            setError(err.message || 'Lỗi khi lưu tài khoản');
        }
    };

    const handleDeleteAccount = async (acc: any) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${acc.name}" (${acc.code}) không?`)) {
            return;
        }
        try {
            await deleteFinanceAccount(acc.id);
            const refreshed = await getFinanceAccounts();
            setAccounts(refreshed);
        } catch (err: any) {
            alert(err.message || 'Không thể xóa tài khoản');
        }
    };

    // Internal Transfer Handlers
    const handleOpenTransfer = (sourceAcc?: any) => {
        const srcId = sourceAcc?.id || (accounts[0]?.id || '');
        setTransferSourceId(srcId);
        
        // Pick default destination
        const dest = accounts.find(a => a.id !== srcId);
        setTransferDestId(dest?.id || '');
        
        setTransferAmount(0);
        setTransferDate(new Date().toISOString().split('T')[0]);
        setTransferFee(0);
        setTransferFeePaidBy('SENDER');
        setTransferReason('');
        setTransferNotes('');
        setTransferError(null);
        setShowTransferModal(true);
    };

    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setTransferError(null);

        if (!transferSourceId || !transferDestId) {
            setTransferError('Vui lòng chọn đầy đủ tài khoản nguồn và đích');
            return;
        }
        if (transferSourceId === transferDestId) {
            setTransferError('Tài khoản nguồn và tài khoản đích không được trùng nhau');
            return;
        }
        if (!transferAmount || transferAmount <= 0) {
            setTransferError('Số tiền điều chuyển phải lớn hơn 0');
            return;
        }

        const srcAcc = accounts.find(a => a.id === transferSourceId);
        if (srcAcc && (srcAcc.currentBalance || 0) < transferAmount) {
            if (!window.confirm(`Cảnh báo: Số dư tài khoản nguồn (${formatVND(srcAcc.currentBalance)}) nhỏ hơn số tiền chuyển (${formatVND(transferAmount)}). Bạn vẫn muốn tiếp tục?`)) {
                return;
            }
        }

        try {
            await transferInternalFunds({
                fromAccountId: transferSourceId,
                toAccountId: transferDestId,
                amount: transferAmount,
                transactionDate: transferDate,
                fee: transferFee,
                feePaidBy: transferFeePaidBy,
                reason: transferReason,
                notes: transferNotes
            });

            setShowTransferModal(false);
            const refreshed = await getFinanceAccounts();
            setAccounts(refreshed);
        } catch (err: any) {
            setTransferError(err.message || 'Lỗi khi thực hiện điều chuyển quỹ');
        }
    };

    // History Modal Handlers
    const handleOpenHistory = async (acc: any) => {
        setHistoryAccount(acc);
        setShowHistoryModal(true);
        setIsLoadingHistory(true);
        try {
            const txs = await getAccountTransactions(acc.id);
            setHistoryTransactions(txs);
        } catch (err) {
            console.error('Error fetching account transactions:', err);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleExportAccountHistory = () => {
        if (!historyAccount || historyTransactions.length === 0) return;
        const rows = historyTransactions.map((tx, idx) => ({
            'STT': idx + 1,
            'Mã phiếu': tx.code,
            'Ngày giao dịch': new Date(tx.transactionDate).toLocaleDateString('vi-VN'),
            'Loại giao dịch': tx.type === 'RECEIPT' ? 'THU TIỀN' : 'CHI TIỀN',
            'Danh mục': tx.category,
            'Số tiền': tx.amount,
            'Người nộp / nhận': tx.payerReceiver || '',
            'Lý do / Nội dung': tx.reason || '',
            'Phương thức': tx.paymentMethod,
            'Trạng thái': tx.status
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'So_Quy_Chi_Tiet');
        XLSX.writeFile(wb, `So_Quy_${historyAccount.code}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25">
                            <Landmark className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                Tài Khoản Ngân Hàng & Sổ Quỹ Tiền Mặt
                            </h1>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                                Quản lý danh mục tài khoản giao dịch, theo dõi số dư tức thời và hạch toán dòng tiền
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={handleRefresh}
                        disabled={isPending}
                        className="p-2.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition border border-slate-200 dark:border-slate-700 shadow-sm"
                        title="Làm mới dữ liệu"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin text-emerald-600' : ''}`} />
                    </button>

                    <button
                        onClick={() => handleOpenTransfer()}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <ArrowRightLeft className="w-4 h-4" />
                        Điều Chuyển Quỹ
                    </button>

                    <button
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                        <Plus className="w-4 h-4" />
                        Thêm Tài Khoản / Quỹ Mới
                    </button>
                </div>
            </div>

            {/* Total Balance Master Cards Banner (Ultra-High Contrast) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Tổng Số Dư Toàn Hệ Thống */}
                <div 
                    className="rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between"
                    style={{ 
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                >
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                            Tổng Số Dư Khả Dụng Toàn Bộ
                        </span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-300">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="my-3">
                        <div className="text-3xl sm:text-4xl font-black text-white tracking-tight drop-shadow-sm">
                            {formatVND(summary.totalAll)}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-300 pt-2 border-t border-white/10 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Tổng <strong>{summary.activeCount}</strong> tài khoản & quỹ đang hoạt động</span>
                    </div>
                </div>

                {/* 2. Tiền Gửi Ngân Hàng */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <Landmark className="w-4 h-4" />
                            Tiền Gửi Ngân Hàng
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-lg">
                            {accounts.filter(a => a.type === 'BANK').length} tài khoản
                        </span>
                    </div>
                    <div className="my-3">
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatVND(summary.totalBank)}
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
                        Chiếm {summary.totalAll > 0 ? Math.round((summary.totalBank / summary.totalAll) * 100) : 0}% tổng nguồn vốn khả dụng
                    </div>
                </div>

                {/* 3. Tiền Mặt Tại Quỹ */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <Wallet className="w-4 h-4" />
                            Tiền Mặt Tại Quỹ
                        </span>
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg">
                            {accounts.filter(a => a.type === 'CASH').length} sổ quỹ
                        </span>
                    </div>
                    <div className="my-3">
                        <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            {formatVND(summary.totalCash)}
                        </div>
                    </div>
                    <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800 font-medium">
                        Chiếm {summary.totalAll > 0 ? Math.round((summary.totalCash / summary.totalAll) * 100) : 0}% tổng nguồn vốn khả dụng
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Type Filter Buttons */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            onClick={() => setFilterType('ALL')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                                filterType === 'ALL'
                                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            Tất Cả ({accounts.length})
                        </button>
                        <button
                            onClick={() => setFilterType('BANK')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                                filterType === 'BANK'
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <Landmark className="w-3.5 h-3.5" />
                            Ngân Hàng
                        </button>
                        <button
                            onClick={() => setFilterType('CASH')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                                filterType === 'CASH'
                                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                            }`}
                        >
                            <Wallet className="w-3.5 h-3.5" />
                            Quỹ Tiền Mặt
                        </button>
                    </div>
                </div>

                {/* Search Box */}
                <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên, mã, số TK, ngân hàng..."
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Accounts Grid (Redesigned Rich Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredAccounts.map(acc => {
                    const isBank = acc.type === 'BANK';
                    return (
                        <div
                            key={acc.id}
                            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between overflow-hidden group"
                        >
                            <div>
                                {/* Card Header with Accent Bar */}
                                <div className={`p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 ${
                                    isBank ? 'bg-blue-50/50 dark:bg-blue-950/20' : 'bg-amber-50/50 dark:bg-amber-950/20'
                                }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                                            isBank 
                                                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20' 
                                                : 'bg-gradient-to-tr from-amber-500 to-orange-500 shadow-amber-500/20'
                                        }`}>
                                            {isBank ? <Landmark className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono font-black text-xs px-2 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-white shadow-xs">
                                                    {acc.code}
                                                </span>
                                                {acc.isDefault && (
                                                    <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold rounded-md border border-emerald-300 dark:border-emerald-800">
                                                        Mặc định
                                                    </span>
                                                )}
                                                {acc.isActive === false && (
                                                    <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[10px] font-bold rounded-md">
                                                        Tạm khóa
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-black text-slate-900 dark:text-white mt-1 leading-snug">
                                                {acc.name}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleOpenEdit(acc)}
                                            className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-white dark:hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-200"
                                            title="Chỉnh sửa tài khoản"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAccount(acc)}
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-200"
                                            title="Xóa tài khoản"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Body Info */}
                                <div className="p-4 space-y-3">
                                    {isBank ? (
                                        <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                            {/* Account Number with Copy Button */}
                                            {acc.accountNumber && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-500 text-[11px] font-semibold">Số tài khoản:</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono font-black text-xs text-slate-900 dark:text-white tracking-wider">
                                                            {acc.accountNumber}
                                                        </span>
                                                        <button
                                                            onClick={() => handleCopy(acc.accountNumber, acc.id)}
                                                            className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition"
                                                            title="Sao chép số tài khoản"
                                                        >
                                                            {copiedId === acc.id ? (
                                                                <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                                            ) : (
                                                                <Copy className="w-3.5 h-3.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Bank Name & Branch */}
                                            <div className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                                                <span className="text-slate-500 font-semibold">Ngân hàng: </span>
                                                <strong>{acc.bankName || 'Chưa cập nhật'}</strong>
                                                {acc.branch && <span className="text-slate-500"> ({acc.branch})</span>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                                            <span className="text-slate-500 font-semibold">Mô tả quỹ: </span>
                                            <div>{acc.description || 'Quỹ tiền mặt phục vụ chi tiêu nội bộ công ty'}</div>
                                        </div>
                                    )}

                                    {/* Balance Display */}
                                    <div className="pt-2">
                                        <div className="flex items-baseline justify-between">
                                            <span className="text-[10px] uppercase font-bold text-slate-400">
                                                Số dư khả dụng hiện tại
                                            </span>
                                            <span className="text-[11px] text-slate-500 font-medium">
                                                {acc._count?.transactions || 0} chứng từ
                                            </span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-950 dark:text-white mt-1">
                                            {formatVND(acc.currentBalance)}
                                        </div>
                                        {acc.initialBalance > 0 && (
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                Số dư ban đầu: {formatVND(acc.initialBalance)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer Action Buttons */}
                            <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => handleOpenTransfer(acc)}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-xs"
                                    title="Điều chuyển quỹ từ tài khoản này"
                                >
                                    <ArrowRightLeft className="w-3.5 h-3.5" />
                                    Chuyển Quỹ
                                </button>
                                <button
                                    onClick={() => handleOpenHistory(acc)}
                                    className="flex items-center justify-center gap-1.5 py-2 px-3 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition border border-slate-200 dark:border-slate-700 shadow-xs"
                                    title="Xem sổ phụ / lịch sử giao dịch"
                                >
                                    <History className="w-3.5 h-3.5" />
                                    Xem Sổ Phụ
                                </button>
                            </div>
                        </div>
                    );
                })}

                {filteredAccounts.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <Landmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Không tìm thấy tài khoản phù hợp</h4>
                        <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc thêm tài khoản / quỹ mới.</p>
                    </div>
                )}
            </div>

            {/* Modal: Create / Edit Account */}
            {showAccountModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowAccountModal(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shadow-xs">
                                    <Landmark size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        {editingAccount ? 'Chỉnh Sửa Tài Khoản / Quỹ' : 'Thêm Tài Khoản / Quỹ Mới'}
                                    </h2>
                                    <p className="text-xs text-slate-500">Khai báo thông tin tài khoản giao dịch cho doanh nghiệp</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowAccountModal(false)} 
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition"
                                title="Đóng (ESC)"
                            >
                                <X className="w-4 h-4" />
                                <span>Đóng</span>
                            </button>
                        </div>

                        <form onSubmit={handleAccountSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200">
                                    {error}
                                </div>
                            )}

                            {/* Type Switch */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Loại tài khoản giao dịch <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setType('BANK')}
                                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-2 ${
                                            type === 'BANK'
                                                ? 'bg-blue-50 dark:bg-blue-950 border-blue-500 text-blue-700 dark:text-blue-300 shadow-xs'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Landmark className="w-4 h-4" />
                                        Tài Khoản Ngân Hàng
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setType('CASH')}
                                        className={`py-2.5 px-3 text-xs font-bold rounded-xl border transition flex items-center justify-center gap-2 ${
                                            type === 'CASH'
                                                ? 'bg-amber-50 dark:bg-amber-950 border-amber-500 text-amber-700 dark:text-amber-300 shadow-xs'
                                                : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Wallet className="w-4 h-4" />
                                        Quỹ Tiền Mặt
                                    </button>
                                </div>
                            </div>

                            {/* Quick Bank Preset for Bank */}
                            {type === 'BANK' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Chọn Ngân Hàng Phổ Biến
                                    </label>
                                    <select
                                        value={selectedBankKey}
                                        onChange={(e) => handleSelectBankPreset(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                                    >
                                        {POPULAR_BANKS.map(b => (
                                            <option key={b.code} value={b.code}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Code & Name */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Mã viết tắt <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!editingAccount}
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        placeholder="VD: VCB-01, TM-01"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs uppercase font-mono font-bold text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Tên tài khoản / quỹ <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="VD: Vietcombank Doanh Nghiệp"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Bank Specific Fields */}
                            {type === 'BANK' && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Số tài khoản ngân hàng <span className="text-rose-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={accountNumber}
                                            onChange={(e) => setAccountNumber(e.target.value)}
                                            placeholder="001100xxxxxxx"
                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white tracking-wider"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Tên ngân hàng
                                            </label>
                                            <input
                                                type="text"
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                                placeholder="VD: Vietcombank"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Chi nhánh
                                            </label>
                                            <input
                                                type="text"
                                                value={branch}
                                                onChange={(e) => setBranch(e.target.value)}
                                                placeholder="VD: Sở Giao Dịch, CN Ba Đình"
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Initial Balance (only for new account) */}
                            {!editingAccount && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Số dư ban đầu (VNĐ)
                                    </label>
                                    <input
                                        type="number"
                                        value={initialBalance || ''}
                                        onChange={(e) => setInitialBalance(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white"
                                    />
                                    {initialBalance > 0 && (
                                        <div className="text-[11px] text-emerald-600 font-semibold mt-1">
                                            Bằng chữ: {numberToVietnameseWords(initialBalance)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Mô tả / Ghi chú
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ghi chú thêm về mục đích sử dụng..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                />
                            </div>

                            {/* Default & Active Checkboxes */}
                            <div className="pt-2 space-y-2 border-t border-slate-100 dark:border-slate-800">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isDefault}
                                        onChange={(e) => setIsDefault(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                    />
                                    <span>Đặt làm tài khoản / quỹ mặc định khi lập chứng từ Thu - Chi</span>
                                </label>

                                {editingAccount && (
                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isActive}
                                            onChange={(e) => setIsActive(e.target.checked)}
                                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                                        />
                                        <span>Đang hoạt động (Bỏ chọn nếu muốn Tạm Khóa tài khoản)</span>
                                    </label>
                                )}
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowAccountModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                                >
                                    {editingAccount ? 'Lưu Thay Đổi' : 'Tạo Tài Khoản Mới'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Internal Fund Transfer (Điều Chuyển Quỹ Nội Bộ) */}
            {showTransferModal && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowTransferModal(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold shadow-xs">
                                    <ArrowRightLeft size={20} />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        Điều Chuyển Quỹ & Tiền Tệ Nội Bộ
                                    </h2>
                                    <p className="text-xs text-slate-500">Chuyển tiền giữa các tài khoản ngân hàng và quỹ tiền mặt</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowTransferModal(false)} 
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition"
                            >
                                <X className="w-4 h-4" />
                                <span>Đóng</span>
                            </button>
                        </div>

                        <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
                            {transferError && (
                                <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200">
                                    {transferError}
                                </div>
                            )}

                            {/* Source & Destination Accounts */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Tài khoản trích tiền (Nguồn) <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={transferSourceId}
                                        onChange={(e) => setTransferSourceId(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                                    >
                                        {accounts.map(a => (
                                            <option key={a.id} value={a.id}>
                                                [{a.code}] {a.name} ({formatVND(a.currentBalance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Tài khoản thụ hưởng (Đích) <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={transferDestId}
                                        onChange={(e) => setTransferDestId(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-white"
                                    >
                                        {accounts.filter(a => a.id !== transferSourceId).map(a => (
                                            <option key={a.id} value={a.id}>
                                                [{a.code}] {a.name} ({formatVND(a.currentBalance)})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Amount & Date */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Số tiền điều chuyển (VNĐ) <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        value={transferAmount || ''}
                                        onChange={(e) => setTransferAmount(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-black text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Ngày giao dịch <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={transferDate}
                                        onChange={(e) => setTransferDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                                    />
                                </div>
                            </div>

                            {transferAmount > 0 && (
                                <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900 text-xs text-blue-900 dark:text-blue-200">
                                    <span className="font-bold">Bằng chữ: </span>
                                    <span className="italic font-medium">{numberToVietnameseWords(transferAmount)}</span>
                                </div>
                            )}

                            {/* Fee */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Phí chuyển tiền (nếu có)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={transferFee || ''}
                                        onChange={(e) => setTransferFee(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Bên chịu phí
                                    </label>
                                    <select
                                        value={transferFeePaidBy}
                                        onChange={(e) => setTransferFeePaidBy(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                    >
                                        <option value="SENDER">Tài khoản nguồn trả phí</option>
                                        <option value="RECEIVER">Trừ vào tài khoản nhận</option>
                                    </select>
                                </div>
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Lý do / Nội dung điều chuyển
                                </label>
                                <input
                                    type="text"
                                    value={transferReason}
                                    onChange={(e) => setTransferReason(e.target.value)}
                                    placeholder="VD: Rút tiền ngân hàng nộp quỹ tiền mặt, hoặc Chuyển quỹ nội bộ..."
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                />
                            </div>

                            {/* Submit */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setShowTransferModal(false)}
                                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md transition"
                                >
                                    Xác Nhận Chuyển Quỹ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Account History (Sổ Phụ Giao Dịch Chi Tiết) */}
            {showHistoryModal && historyAccount && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setShowHistoryModal(false);
                    }}
                >
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-800/90 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold shadow-xs">
                                    {historyAccount.type === 'BANK' ? <Landmark size={22} /> : <Wallet size={22} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base font-black text-slate-900 dark:text-white">
                                            Sổ Phụ Chi Tiết: {historyAccount.name}
                                        </h2>
                                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 dark:bg-slate-700 rounded text-slate-800 dark:text-slate-200">
                                            {historyAccount.code}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        Số dư hiện tại: <strong className="text-emerald-600 font-black">{formatVND(historyAccount.currentBalance)}</strong>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleExportAccountHistory}
                                    disabled={historyTransactions.length === 0}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    Xuất Excel
                                </button>
                                <button 
                                    onClick={() => setShowHistoryModal(false)} 
                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition"
                                >
                                    <X className="w-4 h-4" />
                                    <span>Đóng</span>
                                </button>
                            </div>
                        </div>

                        {/* Transaction Table Content */}
                        <div className="p-5 overflow-y-auto flex-1">
                            {isLoadingHistory ? (
                                <div className="py-12 text-center text-slate-400">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                                    <span>Đang tải lịch sử giao dịch...</span>
                                </div>
                            ) : (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200 dark:border-slate-800">
                                            <tr>
                                                <th className="py-3 px-3 w-10 text-center">STT</th>
                                                <th className="py-3 px-3">Mã Phiếu</th>
                                                <th className="py-3 px-3">Ngày</th>
                                                <th className="py-3 px-3">Đối Tác / Người GD</th>
                                                <th className="py-3 px-3">Lý Do / Nội Dung</th>
                                                <th className="py-3 px-3 text-right">Thu Tiền (+)</th>
                                                <th className="py-3 px-3 text-right">Chi Tiền (-)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {historyTransactions.map((tx, idx) => {
                                                const isReceipt = tx.type === 'RECEIPT';
                                                return (
                                                    <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                                                        <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                                                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                                                            {tx.code}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                                                            {new Date(tx.transactionDate).toLocaleDateString('vi-VN')}
                                                        </td>
                                                        <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                                                            {tx.payerReceiver || tx.customer?.name || tx.supplier?.name || '—'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                                                            {tx.reason || '—'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black text-emerald-600">
                                                            {isReceipt ? formatVND(tx.amount) : '—'}
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right font-black text-rose-600">
                                                            {!isReceipt ? formatVND(tx.amount) : '—'}
                                                        </td>
                                                    </tr>
                                                );
                                            })}

                                            {historyTransactions.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="py-10 text-center text-slate-400 text-xs">
                                                        Chưa có giao dịch phát sinh nào trên tài khoản này.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client'

import React, { useState, useTransition, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import * as XLSX from 'xlsx';
import { 
    Plus, Search, Filter, Printer, Download, Trash2, 
    ArrowUpRight, ArrowDownRight, Wallet, Calendar, Building2, User, 
    CheckCircle2, RefreshCw, FileSpreadsheet, Eye
} from 'lucide-react';
import { getCashTransactions, deleteCashTransaction } from '../actions';
import CreateTransactionModal from './CreateTransactionModal';
import PrintTransactionModal from './PrintTransactionModal';

interface Props {
    initialData: {
        transactions: any[];
        accounts: any[];
        customers: any[];
        suppliers: any[];
        projects: any[];
    };
}

export default function CashBookClient({ initialData }: Props) {
    const searchParams = useSearchParams();
    const actionParam = searchParams.get('action');
    const typeParam = searchParams.get('type') || 'ALL';

    const [data, setData] = useState(initialData);
    const [typeFilter, setTypeFilter] = useState<string>(typeParam);
    const [accountFilter, setAccountFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const [isPending, startTransition] = useTransition();

    // Modals
    const [showCreateModal, setShowCreateModal] = useState<boolean>(actionParam === 'receipt' || actionParam === 'payment');
    const [createType, setCreateType] = useState<'RECEIPT' | 'PAYMENT'>(actionParam === 'payment' ? 'PAYMENT' : 'RECEIPT');
    const [selectedPrintTx, setSelectedPrintTx] = useState<any | null>(null);

    const formatVND = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const loadData = () => {
        startTransition(async () => {
            const res = await getCashTransactions({
                type: typeFilter,
                financeAccountId: accountFilter,
                category: categoryFilter,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                search: searchQuery || undefined
            });
            setData(res);
        });
    };

    const handleDelete = async (id: string, code: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa chứng từ ${code}? Số dư tài khoản/quỹ sẽ được tự động hoàn lại tương ứng.`)) {
            return;
        }

        try {
            await deleteCashTransaction(id);
            loadData();
        } catch (err: any) {
            alert('Lỗi khi xóa chứng từ: ' + err.message);
        }
    };

    // Calculate Summary for filtered transactions
    const summary = useMemo(() => {
        let totalReceipt = 0;
        let totalPayment = 0;
        data.transactions.forEach(tx => {
            if (tx.type === 'RECEIPT') totalReceipt += tx.amount;
            if (tx.type === 'PAYMENT') totalPayment += tx.amount;
        });
        return {
            totalReceipt,
            totalPayment,
            netDifference: totalReceipt - totalPayment,
            count: data.transactions.length
        };
    }, [data.transactions]);

    // Export Excel
    const handleExportExcel = () => {
        const rows = data.transactions.map((tx, idx) => ({
            'STT': idx + 1,
            'Mã chứng từ': tx.code,
            'Loại chứng từ': tx.type === 'RECEIPT' ? 'Phiếu Thu' : 'Phiếu Chi',
            'Ngày lập': new Date(tx.transactionDate).toLocaleDateString('vi-VN'),
            'Người nộp / nhận': tx.payerReceiver,
            'Điện thoại': tx.phone || '',
            'Địa chỉ': tx.address || '',
            'Lý do / Nội dung': tx.reason || '',
            'Hình thức TT': tx.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
            'Tài khoản / Quỹ': tx.financeAccount?.name || 'Tiền mặt',
            'Đối tác liên quan': tx.customer?.name || tx.supplier?.name || '',
            'Dự án': tx.project?.name || '',
            'Thu (VNĐ)': tx.type === 'RECEIPT' ? tx.amount : 0,
            'Chi (VNĐ)': tx.type === 'PAYMENT' ? tx.amount : 0,
            'Người tạo': tx.createdBy?.name || '',
            'Ghi chú': tx.notes || ''
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'So_Quy_Thu_Chi');
        XLSX.writeFile(wb, `So_Quy_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Sổ Quỹ Thu - Chi Tiền Mặt & Ngân Hàng
                            </h1>
                            <p className="text-xs text-slate-500">
                                Quản lý Phiếu Thu, Phiếu Chi, in chứng từ chuẩn mẫu và đối soát dòng tiền
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <button
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition border border-slate-200 dark:border-slate-700"
                    >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        Xuất Excel
                    </button>

                    <button
                        onClick={() => {
                            setCreateType('RECEIPT');
                            setShowCreateModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        + Lập Phiếu Thu (PT)
                    </button>

                    <button
                        onClick={() => {
                            setCreateType('PAYMENT');
                            setShowCreateModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        - Lập Phiếu Chi (PC)
                    </button>
                </div>
            </div>

            {/* Filter Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng Thu Đợt Này</div>
                        <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                            +{formatVND(summary.totalReceipt)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                        <ArrowDownRight className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tổng Chi Đợt Này</div>
                        <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                            -{formatVND(summary.totalPayment)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center">
                        <ArrowUpRight className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Chênh Lệch Thu - Chi</div>
                        <div className={`text-xl font-black mt-1 ${summary.netDifference >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                            {summary.netDifference >= 0 ? '+' : ''}{formatVND(summary.netDifference)}
                        </div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadData()}
                            placeholder="Tìm mã, người nộp/nhận..."
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* Type Filter */}
                    <div>
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="ALL">-- Tất cả loại phiếu --</option>
                            <option value="RECEIPT">Phiếu Thu (PT)</option>
                            <option value="PAYMENT">Phiếu Chi (PC)</option>
                        </select>
                    </div>

                    {/* Account Filter */}
                    <div>
                        <select
                            value={accountFilter}
                            onChange={(e) => {
                                setAccountFilter(e.target.value);
                            }}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        >
                            <option value="ALL">-- Tất cả tài khoản / quỹ --</option>
                            {data.accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                    </div>

                    {/* End Date & Filter Action */}
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                            onClick={loadData}
                            disabled={isPending}
                            className="px-4 py-2 bg-slate-900 dark:bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:opacity-90 transition flex items-center justify-center shrink-0"
                        >
                            <Filter className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="py-3 px-4">Mã Phiếu</th>
                                <th className="py-3 px-3">Ngày Lập</th>
                                <th className="py-3 px-3">Loại Phiếu</th>
                                <th className="py-3 px-3">Người Nộp / Nhận</th>
                                <th className="py-3 px-3">Lý Do / Nội Dung</th>
                                <th className="py-3 px-3">Tài Khoản / Quỹ</th>
                                <th className="py-3 px-3">Dự Án / Đối Tác</th>
                                <th className="py-3 px-4 text-right">Số Tiền (VNĐ)</th>
                                <th className="py-3 px-4 text-center">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {data.transactions.map((tx: any) => (
                                <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group">
                                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                        {tx.code}
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300">
                                        {new Date(tx.transactionDate).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td className="py-3.5 px-3">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                            tx.type === 'RECEIPT' 
                                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' 
                                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                                        }`}>
                                            {tx.type === 'RECEIPT' ? 'Phiếu Thu' : 'Phiếu Chi'}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                        <div>{tx.payerReceiver}</div>
                                        {tx.phone && <div className="text-[10px] text-slate-400">{tx.phone}</div>}
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                                        {tx.reason || '—'}
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-600 dark:text-slate-400">
                                        {tx.financeAccount?.name || 'Tiền mặt'}
                                    </td>
                                    <td className="py-3.5 px-3 text-slate-500 text-[11px]">
                                        {tx.customer?.name || tx.supplier?.name || tx.project?.name || '—'}
                                    </td>
                                    <td className={`py-3.5 px-4 text-right font-black text-sm ${
                                        tx.type === 'RECEIPT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                                    }`}>
                                        {tx.type === 'RECEIPT' ? '+' : '-'}{formatVND(tx.amount)}
                                    </td>
                                    <td className="py-3.5 px-4 text-center">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => setSelectedPrintTx(tx)}
                                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 rounded-lg transition"
                                                title="In phiếu A4/A5"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tx.id, tx.code)}
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                                                title="Xóa chứng từ"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {data.transactions.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                                        Không tìm thấy chứng từ thu / chi nào phù hợp với bộ lọc.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Transaction Modal */}
            {showCreateModal && (
                <CreateTransactionModal
                    initialType={createType}
                    accounts={data.accounts}
                    customers={data.customers}
                    suppliers={data.suppliers}
                    projects={data.projects}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadData();
                    }}
                />
            )}

            {/* Print Voucher Modal */}
            {selectedPrintTx && (
                <PrintTransactionModal
                    transaction={selectedPrintTx}
                    onClose={() => setSelectedPrintTx(null)}
                />
            )}
        </div>
    );
}

'use client'

import React, { useState, useEffect } from 'react';
import { 
    BookOpen, 
    Plus, 
    RefreshCw, 
    Scale, 
    CheckCircle2, 
    AlertCircle, 
    FileSpreadsheet, 
    Layers, 
    Trash2,
    X,
    TrendingUp,
    TrendingDown
} from 'lucide-react';
import { fetchGeneralLedgerData, createManualJournalEntry } from './actions';

export default function GeneralLedgerClient() {
    const [entries, setEntries] = useState<any[]>([]);
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'journal' | 'coa'>('journal');

    // Create Entry Modal
    const [showModal, setShowModal] = useState(false);
    const [description, setDescription] = useState('');
    const [lines, setLines] = useState<Array<{ accountCode: string; debitAmount: number; creditAmount: number; description?: string }>>([
        { accountCode: '111', debitAmount: 0, creditAmount: 0, description: '' },
        { accountCode: '511', debitAmount: 0, creditAmount: 0, description: '' }
    ]);
    const [saving, setSaving] = useState(false);

    const loadData = async () => {
        setLoading(true);
        const res = await fetchGeneralLedgerData();
        if (res.success) {
            setEntries(res.entries || []);
            setAccounts(res.accounts || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val || 0);
    };

    const addLineRow = () => {
        setLines([...lines, { accountCode: '111', debitAmount: 0, creditAmount: 0, description: '' }]);
    };

    const removeLineRow = (index: number) => {
        if (lines.length <= 2) {
            alert('Bút toán kép cần tối thiểu 2 dòng (Nợ / Có)');
            return;
        }
        setLines(lines.filter((_, i) => i !== index));
    };

    const handleLineChange = (index: number, field: string, val: any) => {
        const updated = [...lines];
        (updated[index] as any)[field] = val;
        setLines(updated);
    };

    const totalDebit = lines.reduce((s, l) => s + (Number(l.debitAmount) || 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (Number(l.creditAmount) || 0), 0);
    const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

    const handleCreateEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim()) {
            alert('Vui lòng nhập diễn giải bút toán');
            return;
        }
        if (!isBalanced) {
            alert(`Bút toán chưa cân đối! Tổng Nợ (${formatCurrency(totalDebit)}) phải bằng Tổng Có (${formatCurrency(totalCredit)})`);
            return;
        }

        setSaving(true);
        const res = await createManualJournalEntry({
            description,
            lines: lines.map(l => ({
                accountCode: l.accountCode,
                debitAmount: Number(l.debitAmount) || 0,
                creditAmount: Number(l.creditAmount) || 0,
                description: l.description || description
            }))
        });
        setSaving(false);

        if (res.success) {
            setShowModal(false);
            setDescription('');
            setLines([
                { accountCode: '111', debitAmount: 0, creditAmount: 0, description: '' },
                { accountCode: '511', debitAmount: 0, creditAmount: 0, description: '' }
            ]);
            loadData();
        } else {
            alert(res.error || 'Lỗi khi tạo bút toán');
        }
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                        <Scale className="w-5 h-5" /> Chuẩn Mực Kế Toán VAS TT200 / TT133
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">Sổ Nhật Ký Chung & Sổ Cái Kế Toán Kép</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Hạch toán bút toán kép Nợ/Có (Double-Entry Bookkeeping) đảm bảo nguyên tắc bất biến Tổng Nợ = Tổng Có
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
                    >
                        <Plus className="w-4 h-4" /> Tạo Bút Toán Mới
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                <button
                    onClick={() => setActiveTab('journal')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'journal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <BookOpen className="w-4 h-4" /> Sổ Nhật Ký Chung ({entries.length} Bút toán)
                </button>
                <button
                    onClick={() => setActiveTab('coa')}
                    className={`flex items-center gap-2 pb-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === 'coa' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                >
                    <Layers className="w-4 h-4" /> Hệ Thống Tài Khoản Kế Toán (Chart of Accounts)
                </button>
            </div>

            {/* Tab 1: Journal Entries */}
            {activeTab === 'journal' && (
                <div className="space-y-4">
                    {entries.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
                            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p className="font-semibold text-base">Chưa có bút toán nhật ký nào</p>
                            <p className="text-sm mt-1">Bấm "Tạo Bút Toán Mới" để hạch toán nghiệp vụ phát sinh theo chuẩn kế toán.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {entries.map((entry) => (
                                <div key={entry.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-3">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-lg text-sm">
                                                {entry.entryNumber}
                                            </span>
                                            <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                                {entry.description}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <span>{new Date(entry.date).toLocaleDateString('vi-VN')}</span>
                                            <span className="px-2.5 py-0.5 rounded-full font-semibold bg-emerald-100 text-emerald-700">
                                                {entry.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Lines Table */}
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="text-xs text-slate-400 uppercase font-medium">
                                                    <th className="py-2 px-3">Tài Khoản</th>
                                                    <th className="py-2 px-3">Diễn Giải Dòng</th>
                                                    <th className="py-2 px-3 text-right">Nợ (Debit)</th>
                                                    <th className="py-2 px-3 text-right">Có (Credit)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {entry.lines.map((line: any) => (
                                                    <tr key={line.id} className="border-t border-slate-50 dark:border-slate-800/60">
                                                        <td className="py-2 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                            TK {line.accountCode}
                                                        </td>
                                                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                                                            {line.description || '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-semibold text-emerald-600">
                                                            {line.debitAmount > 0 ? formatCurrency(line.debitAmount) : '-'}
                                                        </td>
                                                        <td className="py-2 px-3 text-right font-semibold text-blue-600">
                                                            {line.creditAmount > 0 ? formatCurrency(line.creditAmount) : '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="border-t-2 border-slate-200 dark:border-slate-700 font-bold bg-slate-50/50 dark:bg-slate-800/30">
                                                    <td colSpan={2} className="py-2 px-3 text-slate-700 dark:text-slate-300">Tổng Cộng Bút Toán (Cân Đối)</td>
                                                    <td className="py-2 px-3 text-right text-emerald-600">{formatCurrency(entry.totalDebit)}</td>
                                                    <td className="py-2 px-3 text-right text-blue-600">{formatCurrency(entry.totalCredit)}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Tab 2: Chart of Accounts */}
            {activeTab === 'coa' && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500 font-semibold">
                                    <th className="py-3 px-4">Số Hiệu TK</th>
                                    <th className="py-3 px-4">Tên Tài Khoản</th>
                                    <th className="py-3 px-4">Loại Tài Khoản</th>
                                    <th className="py-3 px-4 text-right">Số Dư Hiện Tại</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((acc) => (
                                    <tr key={acc.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                                            {acc.code}
                                        </td>
                                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                                            {acc.name}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                                {acc.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-bold text-slate-900 dark:text-white">
                                            {formatCurrency(acc.balance)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create Journal Entry Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" /> Tạo Bút Toán Kép Mới (VAS)
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEntry} className="space-y-4 text-sm">
                            <div>
                                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Diễn giải nghiệp vụ phát sinh <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="VD: Rút tiền gửi ngân hàng nhập quỹ tiền mặt..."
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                                />
                            </div>

                            {/* Lines */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="font-semibold text-slate-700 dark:text-slate-300">Các Dòng Hạch Toán (Nợ / Có)</label>
                                    <button
                                        type="button"
                                        onClick={addLineRow}
                                        className="text-xs text-blue-600 hover:underline font-semibold flex items-center gap-1"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Thêm dòng
                                    </button>
                                </div>

                                {lines.map((line, idx) => (
                                    <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                                        <div className="sm:col-span-4">
                                            <select
                                                value={line.accountCode}
                                                onChange={(e) => handleLineChange(idx, 'accountCode', e.target.value)}
                                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                                            >
                                                {accounts.map(acc => (
                                                    <option key={acc.code} value={acc.code}>{acc.code} - {acc.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="sm:col-span-3">
                                            <input
                                                type="number"
                                                placeholder="Nợ (Debit)"
                                                value={line.debitAmount || ''}
                                                onChange={(e) => handleLineChange(idx, 'debitAmount', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-emerald-600"
                                            />
                                        </div>

                                        <div className="sm:col-span-3">
                                            <input
                                                type="number"
                                                placeholder="Có (Credit)"
                                                value={line.creditAmount || ''}
                                                onChange={(e) => handleLineChange(idx, 'creditAmount', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-blue-600"
                                            />
                                        </div>

                                        <div className="sm:col-span-2 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => removeLineRow(idx)}
                                                className="text-rose-500 p-1 hover:bg-rose-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Balance Indicator */}
                            <div className={`p-4 rounded-xl border flex items-center justify-between ${
                                isBalanced 
                                    ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
                                    : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                            }`}>
                                <div className="flex items-center gap-2 text-xs font-semibold">
                                    {isBalanced ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
                                    <span>{isBalanced ? 'Bút toán đã cân đối hoàn hảo' : 'Bút toán chưa cân đối!'}</span>
                                </div>
                                <div className="text-right text-xs">
                                    <div>Tổng Nợ: <span className="font-bold">{formatCurrency(totalDebit)}</span></div>
                                    <div>Tổng Có: <span className="font-bold">{formatCurrency(totalCredit)}</span></div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl font-medium"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !isBalanced}
                                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-sm disabled:opacity-50"
                                >
                                    {saving ? 'Đang hạch toán...' : 'Ghi Sổ Nhật Ký'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

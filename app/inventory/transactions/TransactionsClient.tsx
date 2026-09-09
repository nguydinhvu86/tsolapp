'use client'

import React, { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { Plus, Search, Eye, Trash2, FileSpreadsheet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { deleteTransaction } from '../transaction-actions';
import * as XLSX from 'xlsx';
import { useTranslation } from '@/app/i18n/LanguageContext';

export default function TransactionsClient({ initialTransactions }: { initialTransactions: any[] }) {
    const router = useRouter();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const filtered = initialTransactions.filter(t => {
        const matchSearch = t.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchType = typeFilter ? t.type === typeFilter : true;
        const matchStatus = statusFilter ? t.status === statusFilter : true;
        return matchSearch && matchType && matchStatus;
    });

    const { paginatedItems, paginationProps } = usePagination(filtered, 25);

    const formatDate = (d: string | Date) => {
        return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(d));
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'IN': return { bg: '#dcfce7', text: '#16a34a', label: t('transactions.typeIn') };
            case 'OUT': return { bg: '#fee2e2', text: '#ef4444', label: t('transactions.typeOut') };
            case 'TRANSFER': return { bg: '#fef3c7', text: '#d97706', label: t('transactions.typeTransfer') };
            default: return { bg: '#f3f4f6', text: '#4b5563', label: type };
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return { bg: '#dcfce7', text: '#16a34a', label: t('transactions.statusCompleted') };
            case 'DRAFT': return { bg: '#f3f4f6', text: '#4b5563', label: t('transactions.statusDraft') };
            case 'CANCELLED': return { bg: '#fee2e2', text: '#ef4444', label: t('transactions.statusCancelled') };
            default: return { bg: '#f3f4f6', text: '#4b5563', label: status };
        }
    };

    const handleDelete = async (id: string, code: string) => {
        if (confirm(t('transactions.deletePrompt').replace('{{code}}', code))) {
            try {
                await deleteTransaction(id);
                router.refresh();
            } catch (error: any) {
                alert(error.message || t('transactions.genericError'));
            }
        }
    };

    const handleExportExcel = () => {
        if (filtered.length === 0) {
            alert(t('transactions.exportNoData'));
            return;
        }
        const wb = XLSX.utils.book_new();
        const wsData = filtered.map((tItem: any) => ({
            [t('transactions.exportColCode')]: tItem.code,
            [t('transactions.exportColType')]: getTypeColor(tItem.type).label,
            [t('transactions.exportColStatus')]: getStatusColor(tItem.status).label,
            [t('transactions.exportColFromWarehouse')]: tItem.fromWarehouse?.name || '-',
            [t('transactions.exportColToWarehouse')]: tItem.toWarehouse?.name || '-',
            [t('transactions.exportColDate')]: formatDate(tItem.date),
            [t('transactions.exportColCreator')]: tItem.creator?.name || '-',
            [t('transactions.exportColNotes')]: tItem.notes || ''
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, t('transactions.exportSheetName'));
        XLSX.writeFile(wb, `Danh_Sach_Phieu.xlsx`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-indigo-50"></span>
                        Lịch Sử Lệnh Kho
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                        Theo dõi và quản lý các phiếu nhập, xuất và điều chuyển kho nội bộ ({filtered.length} phiếu)
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button 
                        variant="secondary" 
                        onClick={handleExportExcel} 
                        className="px-3.5 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 border-slate-200 text-slate-700 hover:bg-slate-50 shadow-none transition-all"
                    >
                        <FileSpreadsheet size={15} className="text-emerald-600" /> {t('transactions.btnExport')}
                    </Button>
                    <Button 
                        onClick={() => router.push('/inventory/transactions/new')} 
                        className="px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs shadow-indigo-200 transition-all"
                    >
                        <Plus size={15} /> {t('transactions.btnCreate')}
                    </Button>
                </div>
            </div>

            {/* Table & Filters Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                    <div className="relative flex-1 min-w-[240px] max-w-sm">
                        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={t('transactions.searchPlaceholder')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
                        />
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium"
                        >
                            <option value="">{t('transactions.filterTypeAll')}</option>
                            <option value="IN">{t('transactions.filterTypeIn')}</option>
                            <option value="OUT">{t('transactions.filterTypeOut')}</option>
                            <option value="TRANSFER">{t('transactions.filterTypeTransfer')}</option>
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 font-medium"
                        >
                            <option value="">{t('transactions.filterStatusAll')}</option>
                            <option value="DRAFT">{t('transactions.filterStatusDraft')}</option>
                            <option value="COMPLETED">{t('transactions.filterStatusCompleted')}</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colCode')}</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colType')}</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colStatus')}</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colFromWarehouse')}</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colToWarehouse')}</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colDate')}</th>
                                <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-600 uppercase tracking-wider">{t('transactions.colCreator')}</th>
                                <th className="px-4 py-3 text-right text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[100px]">{t('transactions.colActions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedItems.length > 0 ? paginatedItems.map((tx) => {
                                const typeObj = getTypeColor(tx.type);
                                const statusObj = getStatusColor(tx.status);

                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="px-4 py-3 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer" onClick={() => router.push(`/inventory/transactions/${tx.id}`)}>
                                            {tx.code}
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: typeObj.bg, color: typeObj.text }}>
                                                {typeObj.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold" style={{ backgroundColor: statusObj.bg, color: statusObj.text }}>
                                                {statusObj.label}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-medium text-slate-700">{tx.fromWarehouse?.name || '-'}</td>
                                        <td className="px-4 py-3 text-xs font-medium text-slate-700">{tx.toWarehouse?.name || '-'}</td>
                                        <td className="px-4 py-3 text-xs text-slate-500 font-medium">{formatDate(tx.date)}</td>
                                        <td className="px-4 py-3 text-xs font-medium text-slate-700">{tx.creator?.name || '-'}</td>
                                        <td className="px-4 py-3 text-xs text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button 
                                                    onClick={() => router.push(`/inventory/transactions/${tx.id}`)} 
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                                                    title={t('transactions.tooltipView')}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(tx.id, tx.code)} 
                                                    disabled={tx.status === 'COMPLETED'} 
                                                    className={`p-1.5 rounded-lg transition-colors ${tx.status === 'COMPLETED' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                                                    title={t('transactions.tooltipDelete')}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={8} className="text-center py-12 text-xs font-medium text-slate-400">
                                        {t('transactions.noTransactions')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </div>
                <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                    <Pagination {...paginationProps} />
                </div>
            </div>
        </div>
    );
}

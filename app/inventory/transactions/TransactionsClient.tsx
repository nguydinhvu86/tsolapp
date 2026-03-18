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
        <Card style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ position: 'relative', width: '300px' }}>
                    <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                        type="text"
                        placeholder={t('transactions.searchPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '0.625rem 1rem 0.625rem 2.5rem',
                            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                            outline: 'none', transition: 'border-color 0.2s', fontSize: '0.875rem'
                        }}
                    />
                </div>

                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{
                        padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                        outline: 'none', fontSize: '0.875rem', backgroundColor: 'white'
                    }}
                >
                    <option value="">{t('transactions.filterTypeAll')}</option>
                    <option value="IN">{t('transactions.filterTypeIn')}</option>
                    <option value="OUT">{t('transactions.filterTypeOut')}</option>
                    <option value="TRANSFER">{t('transactions.filterTypeTransfer')}</option>
                </select>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{
                        padding: '0.625rem 1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                        outline: 'none', fontSize: '0.875rem', backgroundColor: 'white'
                    }}
                >
                    <option value="">{t('transactions.filterStatusAll')}</option>
                    <option value="DRAFT">{t('transactions.filterStatusDraft')}</option>
                    <option value="COMPLETED">{t('transactions.filterStatusCompleted')}</option>
                </select>


                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
                    <Button variant="secondary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FileSpreadsheet size={16} /> {t('transactions.btnExport')}
                    </Button>
                    <Button onClick={() => router.push('/inventory/transactions/new')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Plus size={16} /> {t('transactions.btnCreate')}
                    </Button>
                </div>
            </div>

            <div style={{ padding: '0' }}>
                <Table>
                    <thead>
                        <tr>
                            <th>{t('transactions.colCode')}</th>
                            <th>{t('transactions.colType')}</th>
                            <th>{t('transactions.colStatus')}</th>
                            <th>{t('transactions.colFromWarehouse')}</th>
                            <th>{t('transactions.colToWarehouse')}</th>
                            <th>{t('transactions.colDate')}</th>
                            <th>{t('transactions.colCreator')}</th>
                            <th style={{ width: '100px', textAlign: 'right' }}>{t('transactions.colActions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedItems.length > 0 ? paginatedItems.map((t) => {
                            const typeObj = getTypeColor(t.type);
                            const statusObj = getStatusColor(t.status);

                            return (
                                <tr key={t.id}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.code}</td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                            backgroundColor: typeObj.bg, color: typeObj.text
                                        }}>
                                            {typeObj.label}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{
                                            padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                                            backgroundColor: statusObj.bg, color: statusObj.text
                                        }}>
                                            {statusObj.label}
                                        </span>
                                    </td>
                                    <td>{t.fromWarehouse?.name || '-'}</td>
                                    <td>{t.toWarehouse?.name || '-'}</td>
                                    <td>{formatDate(t.date)}</td>
                                    <td>{t.creator?.name || '-'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button onClick={() => router.push(`/inventory/transactions/${t.id}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)' }} title={t('transactions.tooltipView')}>
                                                <Eye size={18} />
                                            </button>
                                            <button onClick={() => handleDelete(t.id, t.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', opacity: t.status === 'COMPLETED' ? 0.3 : 1 }} disabled={t.status === 'COMPLETED'} title={t('transactions.tooltipDelete')}>
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={8} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                                    {t('transactions.noTransactions')}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
                <Pagination {...paginationProps} />
            </div>
        </Card >
    );
}

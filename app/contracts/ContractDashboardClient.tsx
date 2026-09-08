'use client'
import { formatDate } from '@/lib/utils/formatters';

import React, { useState, useMemo } from 'react';
import { Contract, Customer, ContractTemplate } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { RichTextEditor } from '@/app/components/ui/RichTextEditor';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { StatusBadge } from '@/app/components/ui/StatusBadge';
import { deleteContract, updateContractStatus, updateContract } from './actions';
import { Plus, Trash2, Search, Edit2, Eye, ChevronUp, ChevronDown, ArrowUpDown, X, Copy, FileText, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslation } from '@/app/i18n/LanguageContext';

type ContractWithRelations = Contract & { customer: Customer, template: ContractTemplate };

export function ContractDashboardClient({ initialData }: { initialData: ContractWithRelations[] }) {
    const { t } = useTranslation();
    const router = useRouter();
    const { data: session } = useSession();
    const permissions = session?.user?.permissions || [];
    const isAdmin = session?.user?.role === 'ADMIN';

    const canCreate = true;
    const canEdit = isAdmin || permissions.includes('CONTRACTS_EDIT');
    const canDelete = isAdmin || permissions.includes('CONTRACTS_DELETE');

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingContract, setEditingContract] = useState<ContractWithRelations | null>(null);
    const [editContent, setEditContent] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const stats = useMemo(() => {
        let total = initialData.length;
        let draft = 0;
        let sent = 0;
        let signed = 0;
        initialData.forEach(c => {
            if (c.status === 'DRAFT') draft++;
            if (c.status === 'SENT') sent++;
            if (c.status === 'SIGNED') signed++;
        });
        return { total, draft, sent, signed };
    }, [initialData]);

    const filteredData = useMemo(() => {
        return initialData.filter(c => {
            const matchSearch = c.title.toLowerCase().includes(searchTerm.toLowerCase()) || c.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchStatus = statusFilter ? c.status === statusFilter : true;
            return matchSearch && matchStatus;
        });
    }, [initialData, searchTerm, statusFilter]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const sortedData = useMemo(() => {
        return [...filteredData].sort((a: any, b: any) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (sortField === 'customerName') {
                aVal = a.customer?.name || '';
                bVal = b.customer?.name || '';
            } else if (sortField === 'templateName') {
                aVal = a.template?.name || '';
                bVal = b.template?.name || '';
            }

            if (typeof aVal === 'string' && typeof bVal === 'string') {
                return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }
            if (aVal instanceof Date || bVal instanceof Date || sortField === 'createdAt') {
                const dateA = new Date(aVal).getTime() || 0;
                const dateB = new Date(bVal).getTime() || 0;
                return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
            }
            return 0;
        });
    }, [filteredData, sortField, sortOrder]);

    const { paginatedItems, paginationProps } = usePagination(sortedData, 20);

    const handleDelete = async (id: string) => {
        if (confirm(t('contractDashboard.confirmDelete'))) {
            await deleteContract(id);
            router.refresh();
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        await updateContractStatus(id, newStatus);
        router.refresh();
    }

    const handleEditClick = (contract: ContractWithRelations) => {
        setEditingContract(contract);
        setEditContent(contract.content);
    };

    const handleSaveContract = async () => {
        if (!editingContract) return;
        setIsSaving(true);
        try {
            await updateContract(editingContract.id, editContent);
            setEditingContract(null);
            router.refresh();
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('contractDashboard.title')}</h1>
                    <p className="text-sm text-slate-500 mt-1">Quản lý các hợp đồng mẫu, hợp đồng khách hàng và trạng thái ký kết</p>
                </div>
                {canCreate && (
                    <Link href="/contracts/new">
                        <Button className="gap-2 shadow-sm">
                            <Plus size={18} /> {t('contractDashboard.createContract')}
                        </Button>
                    </Link>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div
                    onClick={() => setStatusFilter('')}
                    className={`stat-card stat-card-purple cursor-pointer transition-all ${statusFilter === '' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Tất cả hợp đồng</div>
                    <div className="stat-value text-2xl font-black text-slate-900">{stats.total}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Tổng số hợp đồng</div>
                </div>

                <div
                    onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? '' : 'DRAFT')}
                    className={`stat-card stat-card-amber cursor-pointer transition-all ${statusFilter === 'DRAFT' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('contractDashboard.statusDraft')}</div>
                    <div className="stat-value text-2xl font-black text-amber-600">{stats.draft}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Bản thảo chưa gửi</div>
                </div>

                <div
                    onClick={() => setStatusFilter(statusFilter === 'SENT' ? '' : 'SENT')}
                    className={`stat-card stat-card-blue cursor-pointer transition-all ${statusFilter === 'SENT' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('contractDashboard.statusSent')}</div>
                    <div className="stat-value text-2xl font-black text-blue-600">{stats.sent}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Chờ khách hàng ký</div>
                </div>

                <div
                    onClick={() => setStatusFilter(statusFilter === 'SIGNED' ? '' : 'SIGNED')}
                    className={`stat-card stat-card-green cursor-pointer transition-all ${statusFilter === 'SIGNED' ? 'ring-2 ring-primary ring-offset-2 scale-[1.02] shadow-md' : 'hover:-translate-y-0.5'}`}
                >
                    <div className="stat-title text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">{t('contractDashboard.statusSigned')}</div>
                    <div className="stat-value text-2xl font-black text-emerald-600">{stats.signed}</div>
                    <div className="text-xs text-slate-400 mt-1 font-medium">Đã hoàn tất ký</div>
                </div>
            </div>

            {/* Filter Ribbon */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm flex gap-3 items-center flex-wrap">
                <div className="flex-1 min-w-[240px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('contractDashboard.searchPlaceholder')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full h-9 pl-9 pr-8 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder:text-slate-400 transition-all font-medium"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200/60"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                <select
                    className="h-9 px-3 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium cursor-pointer"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                >
                    <option value="">{t('contractDashboard.statusAll')}</option>
                    <option value="DRAFT">{t('contractDashboard.statusDraft')}</option>
                    <option value="SENT">{t('contractDashboard.statusSent')}</option>
                    <option value="SIGNED">{t('contractDashboard.statusSigned')}</option>
                    <option value="CANCELLED">{t('contractDashboard.statusCancelled')}</option>
                </select>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('title')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center gap-1">{t('contractDashboard.title')} {sortField === 'title' ? (sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ArrowUpDown size={13} className="text-slate-400" />}</div>
                            </th>
                            <th onClick={() => handleSort('templateName')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center gap-1">{t('contractDashboard.templateName')} {sortField === 'templateName' ? (sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ArrowUpDown size={13} className="text-slate-400" />}</div>
                            </th>
                            <th onClick={() => handleSort('customerName')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center gap-1">{t('contractDashboard.customerName')} {sortField === 'customerName' ? (sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ArrowUpDown size={13} className="text-slate-400" />}</div>
                            </th>
                            <th onClick={() => handleSort('status')} className="cursor-pointer hover:bg-slate-100/80 text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center justify-center gap-1">{t('contractDashboard.status')} {sortField === 'status' ? (sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ArrowUpDown size={13} className="text-slate-400" />}</div>
                            </th>
                            <th onClick={() => handleSort('createdAt')} className="cursor-pointer hover:bg-slate-100/80 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                                <div className="flex items-center gap-1">{t('contractDashboard.createdAt')} {sortField === 'createdAt' ? (sortOrder === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />) : <ArrowUpDown size={13} className="text-slate-400" />}</div>
                            </th>
                            <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 w-[150px]">{t('contractDashboard.actions')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {paginatedItems.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="p-8 text-center text-slate-500 font-medium text-[13px]">
                                    {t('contractDashboard.noContracts')}
                                </td>
                            </tr>
                        ) : paginatedItems.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="p-3 text-[13px]">
                                    <Link href={`/contracts/${c.id}`} className="font-semibold text-slate-900 hover:text-emerald-600 transition-colors">
                                        {c.title}
                                    </Link>
                                </td>
                                <td className="p-3 text-[13px] text-slate-600 dark:text-slate-300">{c.template.name}</td>
                                <td className="p-3 text-[13px]">
                                    <Link href={`/customers/${c.customer.id}`} className="font-medium text-slate-700 hover:text-emerald-600 transition-colors">
                                        {c.customer.name}
                                    </Link>
                                </td>
                                <td className="p-3 text-center">
                                    <select
                                        className="text-[11px] font-semibold rounded-full px-2.5 py-0.5 border cursor-pointer focus:outline-none transition-colors"
                                        style={{
                                            background: c.status === 'SIGNED' ? '#ecfdf5' : c.status === 'CANCELLED' ? '#fef2f2' : c.status === 'SENT' ? '#eff6ff' : '#f8fafc',
                                            color: c.status === 'SIGNED' ? '#047857' : c.status === 'CANCELLED' ? '#b91c1c' : c.status === 'SENT' ? '#1d4ed8' : '#475569',
                                            borderColor: c.status === 'SIGNED' ? '#a7f3d0' : c.status === 'CANCELLED' ? '#fecaca' : c.status === 'SENT' ? '#bfdbfe' : '#e2e8f0',
                                            opacity: canEdit ? 1 : 0.7,
                                        }}
                                        value={c.status}
                                        onChange={(e) => handleStatusChange(c.id, e.target.value)}
                                        disabled={!canEdit}
                                    >
                                        <option value="DRAFT">{t('contractDashboard.statusDraft')}</option>
                                        <option value="SENT">{t('contractDashboard.statusSent')}</option>
                                        <option value="SIGNED">{t('contractDashboard.statusSigned')}</option>
                                        <option value="CANCELLED">{t('contractDashboard.statusCancelled')}</option>
                                    </select>
                                </td>
                                <td className="p-3 text-slate-500 text-xs" suppressHydrationWarning>{formatDate(new Date(c.createdAt))}</td>
                                <td className="p-3">
                                    <div className="flex items-center justify-center gap-1">
                                        {canEdit && (
                                            <button
                                                onClick={() => handleEditClick(c)}
                                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                title={t('contractDashboard.editContent')}
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                        )}
                                        <Link href={`/contracts/${c.id}`}>
                                            <button
                                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title={t('contractDashboard.viewContract')}
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </Link>
                                        {/* Copy Public Link Button */}
                                        <button
                                            onClick={() => {
                                                const url = `${window.location.origin}/public/contracts/${c.id}`;
                                                navigator.clipboard.writeText(url);
                                                alert('Đã copy link public: ' + url);
                                            }}
                                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="Copy Link xem trước cho Khách hàng"
                                        >
                                            <Copy size={16} />
                                        </button>
                                        {canDelete && (
                                            <button
                                                onClick={() => handleDelete(c.id)}
                                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                title={t('contractDashboard.delete')}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Pagination {...paginationProps} />
            </div>

            <Modal
                isOpen={!!editingContract}
                onClose={() => setEditingContract(null)}
                title={`${t('contractDashboard.editTitle')}: ${editingContract?.title}`}
                maxWidth="1000px"
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm text-slate-500">
                        {t('contractDashboard.customerLabel')}: <strong className="text-slate-800">{editingContract?.customer.name}</strong>
                    </p>
                    <RichTextEditor
                        value={editContent}
                        onChange={setEditContent}
                        placeholder={t('contractDashboard.editPlaceholder')}
                    />
                    <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                        <Button variant="secondary" onClick={() => setEditingContract(null)}>{t('contractDashboard.cancel')}</Button>
                        <Button onClick={handleSaveContract} disabled={isSaving}>
                            {isSaving ? t('contractDashboard.saving') : t('contractDashboard.saveChanges')}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

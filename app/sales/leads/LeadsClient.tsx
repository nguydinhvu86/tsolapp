'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, LayoutGrid, List, Calendar, Phone, FileText, CheckCircle, Trash2, ChevronUp, ChevronDown, Edit2, Eye, X, ArrowUpDown } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { updateLeadStatus } from './actions';
import { Card } from '@/app/components/ui/Card';
import { Table } from '@/app/components/ui/Table';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { useTranslation } from '@/app/i18n/LanguageContext';

export function LeadsClient({ leads, customers, users, isAdminOrManager }: { leads: any[], customers: any[], users: any[], isAdminOrManager?: boolean }) {
    const { t } = useTranslation();
    const router = useRouter();

    const STATUSES = useMemo(() => [
        { id: 'NEW', label: t('leads.statusNew'), color: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', colBg: '#f8fafc' }, badgeClass: 'badge-purple' },
        { id: 'CONTACTED', label: t('leads.statusContacted'), color: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd', colBg: '#f0f9ff' }, badgeClass: 'badge-info' },
        { id: 'QUALIFIED', label: t('leads.statusQualified'), color: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', colBg: '#fffbeb' }, badgeClass: 'badge-warning' },
        { id: 'PROPOSAL', label: t('leads.statusProposal'), color: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', colBg: '#faf5ff' }, badgeClass: 'badge-purple' },
        { id: 'WON', label: t('leads.statusWon'), color: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', colBg: '#f0fdf4' }, badgeClass: 'badge-success' },
        { id: 'LOST', label: t('leads.statusLost'), color: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', colBg: '#fef2f2' }, badgeClass: 'badge-danger' }
    ], [t]);
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');

    const [localLeads, setLocalLeads] = useState(leads);
    const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);

    // Sync localLeads if leads prop changes
    React.useEffect(() => {
        setLocalLeads(leads);
    }, [leads]);

    const handleSort = (key: string) => {
        if (sortBy === `${key}_desc`) {
            setSortBy(`${key}_asc`);
        } else {
            setSortBy(`${key}_desc`);
        }
    };

    const filteredLeads = useMemo(() => {
        let filtered = localLeads;
        if (statusFilter === 'ACTIVE') {
            filtered = filtered.filter(l => !['WON', 'LOST'].includes(l.status));
        } else if (statusFilter !== 'ALL') {
            filtered = filtered.filter(l => l.status === statusFilter);
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(l =>
                l.name?.toLowerCase().includes(term) ||
                l.company?.toLowerCase().includes(term) ||
                l.contactName?.toLowerCase().includes(term) ||
                l.customer?.name?.toLowerCase().includes(term) ||
                l.code?.toLowerCase().includes(term)
            );
        }

        if (dateFrom) filtered = filtered.filter(l => l.createdAt >= new Date(dateFrom));
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(l => l.createdAt <= toDate);
        }

        filtered.sort((a, b) => {
            if (sortBy === 'date_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            if (sortBy === 'date_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            if (sortBy === 'amount_desc') return (b.estimatedValue || 0) - (a.estimatedValue || 0);
            if (sortBy === 'amount_asc') return (a.estimatedValue || 0) - (b.estimatedValue || 0);
            if (sortBy === 'code_asc') return (a.code || '').localeCompare(b.code || '');
            if (sortBy === 'code_desc') return (b.code || '').localeCompare(a.code || '');
            return 0;
        });

        return filtered;
    }, [localLeads, searchTerm, statusFilter, dateFrom, dateTo, sortBy]);

    const leadsByStatus = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        STATUSES.forEach(s => grouped[s.id] = []);
        filteredLeads.forEach(l => {
            if (grouped[l.status]) grouped[l.status].push(l);
            else grouped['NEW'].push(l); // fallback
        });
        return grouped;
    }, [filteredLeads, STATUSES]);

    const { paginatedItems: tableLeads, paginationProps } = usePagination(filteredLeads, 25);

    const stats = useMemo(() => {
        const counts = { ALL: 0, ACTIVE: 0, NEW: 0, CONTACTED: 0, QUALIFIED: 0, PROPOSAL: 0, WON: 0, LOST: 0 };
        const amounts = { ALL: 0, ACTIVE: 0, NEW: 0, CONTACTED: 0, QUALIFIED: 0, PROPOSAL: 0, WON: 0, LOST: 0 };

        localLeads.forEach(l => {
            counts.ALL++;
            amounts.ALL += (l.estimatedValue || 0);

            if (!['WON', 'LOST'].includes(l.status)) {
                counts.ACTIVE++;
                amounts.ACTIVE += (l.estimatedValue || 0);
            }

            if (counts[l.status as keyof typeof counts] !== undefined) {
                counts[l.status as keyof typeof counts]++;
                amounts[l.status as keyof typeof amounts] += (l.estimatedValue || 0);
            }
        });

        return { counts, amounts };
    }, [localLeads]);

    const statsCards = useMemo(() => [
        { id: 'ACTIVE', label: t('leads.statusActive'), count: stats.counts.ACTIVE, amount: stats.amounts.ACTIVE, colorClass: 'stat-card-purple', icon: List },
        { id: 'NEW', label: t('leads.statusNew'), count: stats.counts.NEW, amount: stats.amounts.NEW, colorClass: 'stat-card-emerald', icon: Calendar },
        { id: 'CONTACTED', label: t('leads.statusContacted'), count: stats.counts.CONTACTED, amount: stats.amounts.CONTACTED, colorClass: 'stat-card-blue', icon: Phone },
        { id: 'QUALIFIED', label: t('leads.statusQualified'), count: stats.counts.QUALIFIED, amount: stats.amounts.QUALIFIED, colorClass: 'stat-card-amber', icon: Search },
        { id: 'PROPOSAL', label: t('leads.statusProposal'), count: stats.counts.PROPOSAL, amount: stats.amounts.PROPOSAL, colorClass: 'stat-card-indigo', icon: FileText },
        { id: 'WON', label: t('leads.statusWon'), count: stats.counts.WON, amount: stats.amounts.WON, colorClass: 'stat-card-green', icon: CheckCircle },
        { id: 'LOST', label: t('leads.statusLost'), count: stats.counts.LOST, amount: stats.amounts.LOST, colorClass: 'stat-card-red', icon: Trash2 },
    ], [stats, t]);

    const premiumCSS = `
        .status-badge {
            display: inline-flex;
            align-items: center;
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.75rem;
            font-weight: 600;
            letter-spacing: 0.025em;
        }
        .badge-success { background: #d1fae5; color: #047857; border: 1px solid #a7f3d0; }
        .badge-warning { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
        .badge-neutral { background: #f3f4f6; color: #374151; border: 1px solid #e5e7eb; }
        .badge-info { background: #dbeafe; color: #1d4ed8; border: 1px solid #bfdbfe; }
        .badge-danger { background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-purple { background: #e0e7ff; color: #4338ca; border: 1px solid #c7d2fe; }
        
        .status-select {
            appearance: none;
            cursor: pointer;
            outline: none;
            text-align: center;
            padding-right: 28px !important;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 4px center;
            background-repeat: no-slash;
            background-size: 1.2em 1.2em;
        }
        .status-select:hover { filter: brightness(0.95); }
    `;

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedLeadId(id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = () => {
        setDraggedLeadId(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const leadId = e.dataTransfer.getData('text/plain');

        if (!leadId) return;

        const leadToUpdate = localLeads.find(l => l.id === leadId);
        if (!leadToUpdate || leadToUpdate.status === newStatus) {
            setDraggedLeadId(null);
            return;
        }

        const previousStatus = leadToUpdate.status;

        // Optimistic UI Update
        setLocalLeads(prev => prev.map(l =>
            l.id === leadId ? { ...l, status: newStatus } : l
        ));
        setDraggedLeadId(null);

        try {
            const res = await updateLeadStatus(leadId, newStatus);
            if (!res) {
                // Revert
                setLocalLeads(prev => prev.map(l =>
                    l.id === leadId ? { ...l, status: previousStatus } : l
                ));
                alert(t('leads.errorUpdateStatus'));
            } else {
                router.refresh();
            }
        } catch (error) {
            console.error('Failed to change status:', error);
            // Revert on error
            setLocalLeads(prev => prev.map(l =>
                l.id === leadId ? { ...l, status: previousStatus } : l
            ));
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        const leadToUpdate = localLeads.find(l => l.id === id);
        if (!leadToUpdate || leadToUpdate.status === newStatus) return;

        const previousStatus = leadToUpdate.status;
        setLocalLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));

        try {
            const res = await updateLeadStatus(id, newStatus);
            if (!res) {
                setLocalLeads(prev => prev.map(l => l.id === id ? { ...l, status: previousStatus } : l));
                alert(t('leads.errorUpdateStatus'));
            } else {
                router.refresh();
            }
        } catch (error) {
            setLocalLeads(prev => prev.map(l => l.id === id ? { ...l, status: previousStatus } : l));
        }
    };

    return (
        <Card className="p-6">
            <style dangerouslySetInnerHTML={{ __html: premiumCSS }} />

            {/* Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
                <div className="flex-1">
                    <h2 className="text-xl font-semibold text-slate-800">{t('leads.title')}</h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {t('leads.description')}
                    </p>
                </div>

                {/* View Toggle and Actions */}
                <div id="leads-action-container" className="flex items-center gap-2 shrink-0 flex-wrap w-full md:w-auto mt-2 md:mt-0">
                    <button
                        onClick={() => setViewMode('table')}
                        className={`btn flex-1 md:flex-none justify-center ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'} !py-1 !px-3 font-semibold text-[13px] h-[36px]`}
                        title={t('leads.viewTable')}
                    >
                        <List size={16} className="mr-2 shrink-0" />
                        <span>{t('leads.viewTable')}</span>
                    </button>
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`btn flex-1 md:flex-none justify-center ${viewMode === 'kanban' ? 'btn-primary' : 'btn-secondary'} !py-1 !px-3 font-semibold text-[13px] h-[36px]`}
                        title={t('leads.viewKanban')}
                    >
                        <LayoutGrid size={16} className="mr-2 shrink-0" />
                        <span>{t('leads.viewKanban')}</span>
                    </button>
                    <div className="w-[1px] h-6 bg-slate-300 mx-1 sm:mx-2 hidden md:block"></div>
                    <Link href="/sales/leads/new" className="btn btn-primary w-full md:w-auto !py-1 !px-3 font-semibold text-[13px] h-[36px] shadow-sm flex items-center justify-center mt-2 md:mt-0">
                        <Plus size={16} className="mr-2 shrink-0" />
                        <span>{t('leads.createNew')}</span>
                    </Link>
                </div>
            </div>

            {/* Filter Cards */}
            <div className="flex flex-wrap gap-4 mb-6">
                {statsCards.map(stat => (
                    <div
                        key={stat.id}
                        onClick={() => setStatusFilter(statusFilter === stat.id ? 'ALL' : stat.id)}
                        className={`stat-card ${stat.colorClass} cursor-pointer flex-1 min-w-[140px] ${statusFilter === stat.id ? 'ring-2 ring-primary ring-offset-2 scale-105 shadow-md' : 'hover:-translate-y-1'}`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className="stat-title text-[11px] font-bold uppercase tracking-wide">{stat.label}</span>
                            <div className="stat-icon p-2 rounded-full flex items-center justify-center">
                                <stat.icon size={16} />
                            </div>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value text-2xl font-bold">{stat.count}</span>
                        </div>
                        {stat.amount > 0 && (
                            <div className="mt-1 text-xs font-semibold opacity-80 break-words whitespace-nowrap overflow-hidden text-ellipsis">
                                {formatMoney(stat.amount)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Filter Ribbon */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 mb-6 shadow-sm flex gap-3 items-center flex-wrap">
                {/* Search */}
                <div className="flex-1 min-w-[220px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder={t('leads.searchPlaceholder')}
                        className="w-full h-9 pl-9 pr-8 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 text-slate-800 placeholder:text-slate-400 transition-all font-medium"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
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

                {/* Date Filter */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <input
                        type="date"
                        className="h-9 px-2.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        title={t('leads.fromDate')}
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <input
                        type="date"
                        className="h-9 px-2.5 text-[12px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        title={t('leads.toDate')}
                    />
                </div>

                {/* Employee Filter */}
                {isAdminOrManager && users && users.length > 0 && (
                    <div className="shrink-0 w-full sm:w-auto sm:min-w-[180px]">
                        <select
                            className="h-9 w-full px-3 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium cursor-pointer"
                            defaultValue={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('employeeId') || '' : ''}
                            onChange={(e) => {
                                const newEmployeeId = e.target.value;
                                const params = new URLSearchParams(window.location.search);
                                if (newEmployeeId) {
                                    params.set('employeeId', newEmployeeId);
                                } else {
                                    params.delete('employeeId');
                                }
                                window.location.href = `/sales/leads?${params.toString()}`;
                            }}
                        >
                            <option value="">{t('leads.filterAllEmployees')}</option>
                            {users.map((u: any) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Status Filter */}
                <div className="shrink-0 min-w-[150px]">
                    <select
                        className="h-9 w-full px-3 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium cursor-pointer"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="ACTIVE">{t('leads.filterActive')}</option>
                        <option value="ALL">{t('leads.filterAllStatuses')}</option>
                        <optgroup label={t('leads.filterSpecificGroup')}>
                            {STATUSES.map(s => (
                                <option key={s.id} value={s.id}>{s.label}</option>
                            ))}
                        </optgroup>
                    </select>
                </div>

                {/* Sort By Dropdown */}
                <div className="shrink-0 min-w-[160px]">
                    <select
                        className="h-9 w-full px-3 text-[13px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white focus:border-emerald-500 text-slate-700 font-medium cursor-pointer"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value)}
                    >
                        <option value="date_desc">{t('leads.sortDateDesc')}</option>
                        <option value="date_asc">{t('leads.sortDateAsc')}</option>
                        <option value="amount_desc">{t('leads.sortAmountDesc')}</option>
                        <option value="amount_asc">{t('leads.sortAmountAsc')}</option>
                        <option value="code_asc">{t('leads.sortCodeAsc')}</option>
                        <option value="code_desc">{t('leads.sortCodeDesc')}</option>
                    </select>
                </div>
            </div>

            {/* KANBAN VIEW */}
            {viewMode === 'kanban' && (
                <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm" style={{ minHeight: '600px' }}>
                    <div className="flex h-full min-h-[600px]" style={{ minWidth: '100%' }}>
                        {STATUSES.filter(s => {
                            if (statusFilter === 'ACTIVE') return !['WON', 'LOST'].includes(s.id);
                            if (statusFilter !== 'ALL') return s.id === statusFilter;
                            return true;
                        }).map((status, index, arr) => (
                            <div
                                key={status.id}
                                className={`flex flex-col flex-1 min-w-[250px] shrink-0 transition-colors duration-200 ${index < arr.length - 1 ? 'border-r border-slate-200' : ''}`}
                                style={{ backgroundColor: status.color.colBg }}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, status.id)}
                            >
                                <div className="p-3.5 text-center border-b border-slate-200/60" style={{ backgroundColor: status.color.bg }}>
                                    <h3
                                        className="font-bold uppercase tracking-wider"
                                        style={{
                                            color: status.color.text,
                                            fontSize: '12px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                        title={status.label}
                                    >
                                        {status.label}
                                    </h3>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto space-y-3">
                                    {leadsByStatus[status.id].map(lead => (
                                        <div
                                            key={lead.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, lead.id)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => router.push(`/sales/leads/${lead.id}`)}
                                            className={`bg-white p-3.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-slate-200/80 cursor-move transition-all group hover:shadow-md hover:border-emerald-300 relative ${draggedLeadId === lead.id ? 'opacity-40 scale-95 border-dashed border-emerald-400' : ''}`}
                                        >
                                            <div className="absolute top-3.5 right-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <LayoutGrid size={14} />
                                            </div>
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">{lead.code}</span>
                                            </div>
                                            <h3 className="font-semibold text-[13px] text-slate-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-2">
                                                {lead.name}
                                            </h3>
                                            <p className="text-xs text-slate-500 mb-3 truncate">
                                                {lead.customer?.name || lead.company || lead.contactName || t('leads.unknownCustomer')}
                                            </p>

                                            <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                                                <div className="font-bold text-slate-900">
                                                    {formatMoney(lead.estimatedValue || 0)}
                                                </div>
                                                <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                                                    <Calendar size={11} />
                                                    {formatDate(lead.createdAt || new Date())}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {leadsByStatus[status.id].length === 0 && (
                                        <div className="text-center py-8 text-slate-400 text-xs italic border border-dashed border-slate-200 bg-white/50 rounded-lg">
                                            {t('leads.emptyKanban')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-600 cursor-pointer hover:bg-slate-100/80 transition-colors select-none" onClick={() => handleSort('code')}>
                                    <div className="flex items-center gap-1">
                                        {t('leads.code')} {sortBy === 'code_asc' ? <ChevronUp size={13} className="text-slate-400" /> : sortBy === 'code_desc' ? <ChevronDown size={13} className="text-slate-400" /> : <ArrowUpDown size={13} className="text-slate-300" />}
                                    </div>
                                </th>
                                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-600 cursor-pointer hover:bg-slate-100/80 transition-colors select-none" onClick={() => handleSort('date')}>
                                    <div className="flex items-center gap-1">
                                        {t('leads.createdAt')} {sortBy === 'date_asc' ? <ChevronUp size={13} className="text-slate-400" /> : sortBy === 'date_desc' ? <ChevronDown size={13} className="text-slate-400" /> : <ArrowUpDown size={13} className="text-slate-300" />}
                                    </div>
                                </th>
                                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('leads.name')}</th>
                                <th className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('leads.customer')}</th>
                                <th className="text-right text-[11px] font-bold uppercase tracking-wider text-slate-600 cursor-pointer hover:bg-slate-100/80 transition-colors select-none" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-end gap-1">
                                        {t('leads.estimatedValue')} {sortBy === 'amount_asc' ? <ChevronUp size={13} className="text-slate-400" /> : sortBy === 'amount_desc' ? <ChevronDown size={13} className="text-slate-400" /> : <ArrowUpDown size={13} className="text-slate-300" />}
                                    </div>
                                </th>
                                <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('leads.status')}</th>
                                <th className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('leads.action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {tableLeads.map(lead => {
                                const statusObj = STATUSES.find(s => s.id === lead.status) || STATUSES[0];
                                return (
                                    <tr
                                        key={lead.id}
                                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                                    >
                                        <td className="p-3 text-[13px]">
                                            <Link href={`/sales/leads/${lead.id}`} className="font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 hover:bg-emerald-100 hover:text-emerald-800 transition-colors inline-block">
                                                {lead.code}
                                            </Link>
                                        </td>
                                        <td className="p-3 text-xs text-slate-500">
                                            {formatDate(lead.createdAt || new Date())}
                                        </td>
                                        <td className="p-3">
                                            <Link href={`/sales/leads/${lead.id}`} className="font-semibold text-[13px] text-slate-900 hover:text-emerald-600 transition-colors line-clamp-1 block">
                                                {lead.name}
                                            </Link>
                                        </td>
                                        <td className="p-3">
                                            <div className="text-[13px] font-medium text-slate-900">{lead.customer?.name || lead.company || '—'}</div>
                                            <div className="text-xs text-slate-400 mt-0.5">{lead.customer?.phone || lead.phone || lead.customer?.email || lead.email || '—'}</div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="font-bold text-[13px] text-slate-900">{formatMoney(lead.estimatedValue || 0)}</div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <select
                                                className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 border cursor-pointer focus:outline-none transition-colors ${statusObj.badgeClass}`}
                                                value={lead.status}
                                                onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                                title={t('leads.clickToChange')}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="NEW" className="bg-white text-gray-900">{t('leads.statusNew')}</option>
                                                <option value="CONTACTED" className="bg-white text-gray-900">{t('leads.statusContacted')}</option>
                                                <option value="QUALIFIED" className="bg-white text-gray-900">{t('leads.statusQualified')}</option>
                                                <option value="PROPOSAL" className="bg-white text-gray-900">{t('leads.statusProposal')}</option>
                                                <option value="WON" className="bg-white text-gray-900">{t('leads.statusWon')}</option>
                                                <option value="LOST" className="bg-white text-gray-900">{t('leads.statusLost')}</option>
                                            </select>
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-center gap-1">
                                                <Link href={`/sales/leads/${lead.id}`} title={t('leads.viewDetails')} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Eye size={16} />
                                                </Link>
                                                <Link href={`/sales/leads/${lead.id}`} title={t('leads.edit')} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredLeads.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium text-[13px]">
                                        {t('leads.emptyTable')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                    <Pagination {...paginationProps} />
                </div>
            )}
        </Card>
    );
}

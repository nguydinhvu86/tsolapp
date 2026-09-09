'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
    Plus, Search, LayoutGrid, List, Calendar, Phone, FileText, CheckCircle2, 
    Trash2, ChevronUp, ChevronDown, Edit2, Eye, X, ArrowUpDown, Target, 
    User, DollarSign, Clock, Sparkles, AlertCircle, Filter, ArrowRight,
    Building2, Mail, Users
} from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils/formatters';
import { updateLeadStatus } from './actions';
import { Pagination, usePagination } from '@/app/components/ui/Pagination';
import { useTranslation } from '@/app/i18n/LanguageContext';
import { ClickToCallButton } from '@/app/components/ClickToCallButton';

function getInitials(name: string) {
    if (!name) return 'U';
    const clean = name.trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function LeadsClient({ 
    leads, 
    customers, 
    users, 
    isAdminOrManager 
}: { 
    leads: any[], 
    customers: any[], 
    users: any[], 
    isAdminOrManager?: boolean 
}) {
    const { t } = useTranslation();
    const router = useRouter();

    const STATUSES = useMemo(() => [
        { 
            id: 'NEW', 
            label: t('leads.statusNew'), 
            badgeClass: 'bg-blue-50 text-blue-700 border-blue-200', 
            headerBg: 'bg-blue-50/80 border-b-blue-200 text-blue-800',
            dotColor: 'bg-blue-500',
            accentColor: '#3b82f6',
            colBg: 'bg-slate-50/50'
        },
        { 
            id: 'CONTACTED', 
            label: t('leads.statusContacted'), 
            badgeClass: 'bg-sky-50 text-sky-700 border-sky-200', 
            headerBg: 'bg-sky-50/80 border-b-sky-200 text-sky-800',
            dotColor: 'bg-sky-500',
            accentColor: '#0ea5e9',
            colBg: 'bg-slate-50/50'
        },
        { 
            id: 'QUALIFIED', 
            label: t('leads.statusQualified'), 
            badgeClass: 'bg-amber-50 text-amber-700 border-amber-200', 
            headerBg: 'bg-amber-50/80 border-b-amber-200 text-amber-800',
            dotColor: 'bg-amber-500',
            accentColor: '#f59e0b',
            colBg: 'bg-slate-50/50'
        },
        { 
            id: 'PROPOSAL', 
            label: t('leads.statusProposal'), 
            badgeClass: 'bg-purple-50 text-purple-700 border-purple-200', 
            headerBg: 'bg-purple-50/80 border-b-purple-200 text-purple-800',
            dotColor: 'bg-purple-500',
            accentColor: '#a855f7',
            colBg: 'bg-slate-50/50'
        },
        { 
            id: 'WON', 
            label: t('leads.statusWon'), 
            badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', 
            headerBg: 'bg-emerald-50/80 border-b-emerald-200 text-emerald-800',
            dotColor: 'bg-emerald-500',
            accentColor: '#10b981',
            colBg: 'bg-emerald-50/20'
        },
        { 
            id: 'LOST', 
            label: t('leads.statusLost'), 
            badgeClass: 'bg-rose-50 text-rose-700 border-rose-200', 
            headerBg: 'bg-rose-50/80 border-b-rose-200 text-rose-800',
            dotColor: 'bg-rose-500',
            accentColor: '#f43f5e',
            colBg: 'bg-rose-50/20'
        }
    ], [t]);

    const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ACTIVE');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [sortBy, setSortBy] = useState('date_desc');
    const [selectedEmployee, setSelectedEmployee] = useState<string>('');

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
                l.code?.toLowerCase().includes(term) ||
                l.phone?.includes(term) ||
                l.email?.toLowerCase().includes(term)
            );
        }

        if (dateFrom) filtered = filtered.filter(l => new Date(l.createdAt) >= new Date(dateFrom));
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(l => new Date(l.createdAt) <= toDate);
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
        { 
            id: 'ACTIVE', 
            label: t('leads.statusActive'), 
            count: stats.counts.ACTIVE, 
            amount: stats.amounts.ACTIVE, 
            colorClass: 'bg-indigo-50 border-indigo-200 text-indigo-700', 
            iconBg: 'bg-indigo-600 text-white', 
            icon: Target 
        },
        { 
            id: 'NEW', 
            label: t('leads.statusNew'), 
            count: stats.counts.NEW, 
            amount: stats.amounts.NEW, 
            colorClass: 'bg-blue-50 border-blue-200 text-blue-700', 
            iconBg: 'bg-blue-600 text-white', 
            icon: Calendar 
        },
        { 
            id: 'CONTACTED', 
            label: t('leads.statusContacted'), 
            count: stats.counts.CONTACTED, 
            amount: stats.amounts.CONTACTED, 
            colorClass: 'bg-sky-50 border-sky-200 text-sky-700', 
            iconBg: 'bg-sky-600 text-white', 
            icon: Phone 
        },
        { 
            id: 'QUALIFIED', 
            label: t('leads.statusQualified'), 
            count: stats.counts.QUALIFIED, 
            amount: stats.amounts.QUALIFIED, 
            colorClass: 'bg-amber-50 border-amber-200 text-amber-700', 
            iconBg: 'bg-amber-600 text-white', 
            icon: Search 
        },
        { 
            id: 'PROPOSAL', 
            label: t('leads.statusProposal'), 
            count: stats.counts.PROPOSAL, 
            amount: stats.amounts.PROPOSAL, 
            colorClass: 'bg-purple-50 border-purple-200 text-purple-700', 
            iconBg: 'bg-purple-600 text-white', 
            icon: FileText 
        },
        { 
            id: 'WON', 
            label: t('leads.statusWon'), 
            count: stats.counts.WON, 
            amount: stats.amounts.WON, 
            colorClass: 'bg-emerald-50 border-emerald-200 text-emerald-700', 
            iconBg: 'bg-emerald-600 text-white', 
            icon: CheckCircle2 
        },
        { 
            id: 'LOST', 
            label: t('leads.statusLost'), 
            count: stats.counts.LOST, 
            amount: stats.amounts.LOST, 
            colorClass: 'bg-rose-50 border-rose-200 text-rose-700', 
            iconBg: 'bg-rose-600 text-white', 
            icon: Trash2 
        },
    ], [stats, t]);

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

    const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ACTIVE' || dateFrom !== '' || dateTo !== '' || sortBy !== 'date_desc';

    return (
        <div className="w-full max-w-full space-y-4 p-4 md:p-6 lg:p-8">
            {/* Header / Top Ribbon */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-white p-4 md:p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div 
                        className="w-10 h-10 rounded-xl text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0"
                        style={{ background: 'linear-gradient(135deg, #059669, #0d9488)' }}
                    >
                        <Target size={20} className="stroke-[2.5]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">{t('leads.title')}</h1>
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
                                {localLeads.length}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                            {t('leads.description')}
                        </p>
                    </div>
                </div>

                {/* View Switcher & Action Buttons */}
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    {/* View Switcher Segmented Control */}
                    <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'table'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title={t('leads.viewTable')}
                        >
                            <List size={14} className="stroke-[2.2]" />
                            <span>{t('leads.viewTable')}</span>
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                viewMode === 'kanban'
                                    ? 'bg-white text-slate-900 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                            title={t('leads.viewKanban')}
                        >
                            <LayoutGrid size={14} className="stroke-[2.2]" />
                            <span>{t('leads.viewKanban')}</span>
                        </button>
                    </div>

                    <Link
                        href="/sales/leads/new"
                        className="inline-flex items-center justify-center gap-1.5 h-[34px] px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-emerald-600/20 active:scale-98 cursor-pointer"
                    >
                        <Plus size={15} className="stroke-[2.5]" />
                        <span>{t('leads.createNew')}</span>
                    </Link>
                </div>
            </div>

            {/* Quick KPI Metric Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
                {statsCards.map(stat => {
                    const isActive = statusFilter === stat.id;
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.id}
                            onClick={() => setStatusFilter(statusFilter === stat.id ? 'ALL' : stat.id)}
                            className={`cursor-pointer transition-all duration-200 rounded-xl p-3.5 bg-white border shadow-xs hover:-translate-y-0.5 hover:shadow-sm relative overflow-hidden flex flex-col justify-between ${
                                isActive
                                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10'
                                    : 'border-slate-200/90 hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 truncate" title={stat.label}>
                                    {stat.label}
                                </span>
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.iconBg} shadow-2xs shrink-0`}>
                                    <Icon size={14} className="stroke-[2.2]" />
                                </div>
                            </div>
                            <div className="flex items-baseline justify-between gap-1">
                                <span className="text-2xl font-black font-mono tracking-tight text-slate-900">
                                    {stat.count}
                                </span>
                            </div>
                            <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                                <span className="text-slate-400">Giá trị:</span>
                                <span className="font-mono font-bold text-slate-800 truncate" title={formatMoney(stat.amount)}>
                                    {formatMoney(stat.amount)}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Data Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                {/* Filter & Search Toolbar */}
                <div className="p-3.5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col lg:flex-row justify-between lg:items-center gap-3">
                    <div className="flex flex-wrap items-center gap-2.5 flex-1">
                        {/* Search Input */}
                        <div className="relative w-full sm:w-[260px]">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder={t('leads.searchPlaceholder')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full h-[34px] pl-9 pr-8 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all shadow-2xs"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Date Range Picker */}
                        <div className="flex items-center gap-1.5 bg-white border border-slate-300 px-2 py-1 rounded-lg shadow-2xs">
                            <Calendar size={13} className="text-slate-400 shrink-0" />
                            <input
                                type="date"
                                className="h-[24px] text-xs bg-transparent border-0 text-slate-700 font-medium focus:outline-none cursor-pointer"
                                value={dateFrom}
                                onChange={e => setDateFrom(e.target.value)}
                                title={t('leads.fromDate')}
                            />
                            <span className="text-slate-300 text-xs">-</span>
                            <input
                                type="date"
                                className="h-[24px] text-xs bg-transparent border-0 text-slate-700 font-medium focus:outline-none cursor-pointer"
                                value={dateTo}
                                onChange={e => setDateTo(e.target.value)}
                                title={t('leads.toDate')}
                            />
                        </div>

                        {/* Employee Filter */}
                        {isAdminOrManager && users && users.length > 0 && (
                            <div className="relative min-w-[160px]">
                                <select
                                    className="h-[34px] w-full pl-3 pr-7 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
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

                        {/* Status Filter Dropdown */}
                        <div className="relative min-w-[140px]">
                            <select
                                className="h-[34px] w-full pl-3 pr-7 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
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
                        <div className="relative min-w-[150px]">
                            <select
                                className="h-[34px] w-full pl-3 pr-7 text-xs bg-white border border-slate-300 rounded-lg text-slate-700 font-medium focus:outline-none focus:border-emerald-500 cursor-pointer shadow-2xs"
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

                        {/* Reset Filter Button */}
                        {hasActiveFilters && (
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setStatusFilter('ACTIVE');
                                    setDateFrom('');
                                    setDateTo('');
                                    setSortBy('date_desc');
                                }}
                                className="h-[34px] px-2.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                title="Xóa bộ lọc"
                            >
                                <X size={13} />
                                <span>Đặt lại</span>
                            </button>
                        )}
                    </div>

                    <div className="text-xs font-medium text-slate-500 self-end lg:self-center shrink-0">
                        Hiển thị <span className="font-bold text-slate-900">{filteredLeads.length}</span> cơ hội
                    </div>
                </div>

                {/* TABLE VIEW */}
                {viewMode === 'table' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/90 bg-slate-100/70">
                                    <th onClick={() => handleSort('code')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[120px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            {t('leads.code')}
                                            {sortBy === 'code_asc' ? <ChevronUp size={12} className="text-emerald-600" /> : sortBy === 'code_desc' ? <ChevronDown size={12} className="text-emerald-600" /> : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th onClick={() => handleSort('date')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[110px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center gap-1.5">
                                            {t('leads.createdAt')}
                                            {sortBy === 'date_asc' ? <ChevronUp size={12} className="text-emerald-600" /> : sortBy === 'date_desc' ? <ChevronDown size={12} className="text-emerald-600" /> : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                                        {t('leads.name')}
                                    </th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[220px]">
                                        {t('leads.customer')} / LIÊN HỆ
                                    </th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider w-[140px]">
                                        NGƯỜI PHỤ TRÁCH
                                    </th>
                                    <th onClick={() => handleSort('amount')} className="cursor-pointer select-none py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right w-[140px] hover:bg-slate-200/50 transition-colors">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {t('leads.estimatedValue')}
                                            {sortBy === 'amount_asc' ? <ChevronUp size={12} className="text-emerald-600" /> : sortBy === 'amount_desc' ? <ChevronDown size={12} className="text-emerald-600" /> : <ArrowUpDown size={11} className="opacity-30" />}
                                        </div>
                                    </th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-center w-[140px]">
                                        {t('leads.status')}
                                    </th>
                                    <th className="py-2.5 px-3.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider text-right w-[95px]">
                                        {t('leads.action')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableLeads.map(lead => {
                                    const statusObj = STATUSES.find(s => s.id === lead.status) || STATUSES[0];
                                    const primaryAssignee = lead.assignees?.[0]?.user || lead.assignedTo;

                                    return (
                                        <tr
                                            key={lead.id}
                                            className="hover:bg-slate-50/80 transition-colors group"
                                        >
                                            {/* Code */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <Link
                                                    href={`/sales/leads/${lead.id}`}
                                                    className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 hover:bg-emerald-100 hover:text-emerald-800 transition-colors inline-block shadow-2xs"
                                                >
                                                    {lead.code}
                                                </Link>
                                            </td>

                                            {/* Date */}
                                            <td className="py-2.5 px-3.5 align-middle text-xs font-mono text-slate-500">
                                                {formatDate(lead.createdAt || new Date())}
                                            </td>

                                            {/* Name */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <div className="flex flex-col gap-0.5 max-w-[280px] sm:max-w-[340px]">
                                                    <Link
                                                        href={`/sales/leads/${lead.id}`}
                                                        className="font-semibold text-xs text-slate-900 hover:text-emerald-600 transition-colors truncate block"
                                                        title={lead.name}
                                                    >
                                                        {lead.name}
                                                    </Link>
                                                    {lead.source && (
                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                                                            Nguồn: <span className="text-slate-600 font-medium">{lead.source}</span>
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Customer / Contact */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                <div className="flex flex-col gap-0.5 max-w-[200px]">
                                                    <div className="text-xs font-medium text-slate-900 truncate" title={lead.customer?.name || lead.company || '—'}>
                                                        {lead.customer?.name || lead.company || '—'}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                                                        <span>{lead.customer?.phone || lead.phone || lead.customer?.email || lead.email || '—'}</span>
                                                        {(lead.customer?.phone || lead.phone) && (
                                                            <ClickToCallButton phoneNumber={lead.customer?.phone || lead.phone} className="scale-75 origin-left" />
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Assignee */}
                                            <td className="py-2.5 px-3.5 align-middle">
                                                {primaryAssignee ? (
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium max-w-[130px] truncate shadow-2xs" title={primaryAssignee.name || primaryAssignee.email}>
                                                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-bold inline-flex items-center justify-center shrink-0">
                                                            {getInitials(primaryAssignee.name || primaryAssignee.email)}
                                                        </span>
                                                        <span className="truncate">{primaryAssignee.name || primaryAssignee.email}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs italic">Chưa giao</span>
                                                )}
                                            </td>

                                            {/* Estimated Value */}
                                            <td className="py-2.5 px-3.5 align-middle text-right">
                                                <span className="font-mono font-bold text-xs text-slate-900">
                                                    {formatMoney(lead.estimatedValue || 0)}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="py-2.5 px-3.5 align-middle text-center">
                                                <select
                                                    className={`text-[11px] font-bold rounded-full px-2.5 py-0.5 border cursor-pointer focus:outline-none transition-all ${statusObj.badgeClass} shadow-2xs`}
                                                    value={lead.status}
                                                    onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                                                    title={t('leads.clickToChange')}
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <option value="NEW" className="bg-white text-slate-900">{t('leads.statusNew')}</option>
                                                    <option value="CONTACTED" className="bg-white text-slate-900">{t('leads.statusContacted')}</option>
                                                    <option value="QUALIFIED" className="bg-white text-slate-900">{t('leads.statusQualified')}</option>
                                                    <option value="PROPOSAL" className="bg-white text-slate-900">{t('leads.statusProposal')}</option>
                                                    <option value="WON" className="bg-white text-slate-900">{t('leads.statusWon')}</option>
                                                    <option value="LOST" className="bg-white text-slate-900">{t('leads.statusLost')}</option>
                                                </select>
                                            </td>

                                            {/* Actions */}
                                            <td className="py-2.5 px-3.5 align-middle text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Link
                                                        href={`/sales/leads/${lead.id}`}
                                                        title={t('leads.viewDetails')}
                                                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <Eye size={15} />
                                                    </Link>
                                                    <Link
                                                        href={`/sales/leads/${lead.id}/edit`}
                                                        title={t('leads.edit')}
                                                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <Edit2 size={15} />
                                                    </Link>
                                                    <Link
                                                        href={`/sales/estimates?action=new&leadId=${lead.id}&customerId=${lead.customerId || ''}`}
                                                        title="Tạo Báo Giá"
                                                        className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
                                                    >
                                                        <FileText size={15} />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {filteredLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <Target size={24} />
                                                </div>
                                                <span className="font-semibold text-slate-700">{t('leads.emptyTable')}</span>
                                                <Link
                                                    href="/sales/leads/new"
                                                    className="mt-1 text-xs text-emerald-600 hover:underline font-bold"
                                                >
                                                    + Tạo cơ hội bán hàng mới ngay
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                        <Pagination {...paginationProps} />
                    </div>
                )}

                {/* KANBAN VIEW */}
                {viewMode === 'kanban' && (
                    <div className="w-full overflow-x-auto p-4 bg-slate-100/60 custom-scrollbar" style={{ minHeight: '680px' }}>
                        <div className="flex gap-4 min-w-max pb-2">
                            {STATUSES.filter(s => {
                                if (statusFilter === 'ACTIVE') return !['WON', 'LOST'].includes(s.id);
                                if (statusFilter !== 'ALL') return s.id === statusFilter;
                                return true;
                            }).map((status) => {
                                const columnLeads = leadsByStatus[status.id] || [];
                                const totalColumnAmount = columnLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

                                return (
                                    <div
                                        key={status.id}
                                        className={`flex flex-col w-[300px] shrink-0 rounded-2xl border border-slate-200/90 bg-slate-50/80 shadow-xs overflow-hidden`}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, status.id)}
                                    >
                                        {/* Column Header */}
                                        <div className={`p-3.5 border-b ${status.headerBg} flex items-center justify-between`}>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2.5 h-2.5 rounded-full ${status.dotColor}`} />
                                                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-800 truncate" title={status.label}>
                                                    {status.label}
                                                </h3>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white/90 text-slate-700 shadow-2xs border border-slate-200/60">
                                                {columnLeads.length}
                                            </span>
                                        </div>

                                        {/* Total column amount metric */}
                                        <div className="px-3.5 py-2 bg-white/60 border-b border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                                            <span>Tổng giá trị:</span>
                                            <span className="font-mono font-bold text-slate-800">
                                                {formatMoney(totalColumnAmount)}
                                            </span>
                                        </div>

                                        {/* Lead Cards List */}
                                        <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar" style={{ maxHeight: 'calc(100vh - 360px)', minHeight: '300px' }}>
                                            {columnLeads.map(lead => {
                                                const primaryAssignee = lead.assignees?.[0]?.user || lead.assignedTo;

                                                return (
                                                    <div
                                                        key={lead.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, lead.id)}
                                                        onDragEnd={handleDragEnd}
                                                        onClick={() => router.push(`/sales/leads/${lead.id}`)}
                                                        className={`bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs cursor-grab active:cursor-grabbing transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300 relative group ${
                                                            draggedLeadId === lead.id ? 'opacity-40 scale-95 border-dashed border-emerald-400' : ''
                                                        }`}
                                                    >
                                                        {/* Top Row: Code & Customer */}
                                                        <div className="flex items-center justify-between gap-1 mb-2">
                                                            <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80">
                                                                {lead.code}
                                                            </span>
                                                            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {formatDate(lead.createdAt || new Date())}
                                                            </div>
                                                        </div>

                                                        {/* Title */}
                                                        <h4 className="font-bold text-xs text-slate-900 group-hover:text-emerald-600 transition-colors line-clamp-2 mb-1.5 leading-snug">
                                                            {lead.name}
                                                        </h4>

                                                        {/* Customer Name */}
                                                        <div className="text-[11px] text-slate-500 mb-3 flex items-center gap-1 truncate">
                                                            <Building2 size={11} className="text-slate-400 shrink-0" />
                                                            <span className="truncate">{lead.customer?.name || lead.company || lead.contactName || t('leads.unknownCustomer')}</span>
                                                        </div>

                                                        {/* Card Footer: Amount & Assignee */}
                                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                                            <div className="font-mono font-bold text-xs text-slate-900">
                                                                {formatMoney(lead.estimatedValue || 0)}
                                                            </div>

                                                            {primaryAssignee && (
                                                                <div 
                                                                    className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shadow-2xs" 
                                                                    title={primaryAssignee.name || primaryAssignee.email}
                                                                >
                                                                    {getInitials(primaryAssignee.name || primaryAssignee.email)}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {columnLeads.length === 0 && (
                                                <div className="py-12 text-center text-slate-400 text-xs italic border-2 border-dashed border-slate-200 bg-white/40 rounded-xl">
                                                    {t('leads.emptyKanban')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

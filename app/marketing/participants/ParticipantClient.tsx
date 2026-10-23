'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useMemo } from 'react';
import { MarketingParticipant } from '@prisma/client';
import {
    checkInParticipant,
    cancelCheckInParticipant,
    deleteParticipant,
    updateParticipantStatus
} from './actions';
import {
    Trash2,
    Search,
    CheckCircle,
    Clock,
    UserCheck,
    Download,
    ChevronUp,
    ChevronDown,
    ArrowUpDown,
    Users,
    Bell,
    CheckCircle2,
    RotateCcw,
    X,
    FileText
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';
import Link from 'next/link';

export type ParticipantListType = MarketingParticipant & {
    campaign: { id: string; name: string; code: string };
    form: { id: string; title: string } | null;
};

export default function ParticipantClient({
    initialData,
    campaigns,
    isAdmin,
    permissions,
}: {
    initialData: ParticipantListType[];
    campaigns: { id: string; name: string }[];
    isAdmin: boolean;
    permissions: string[];
}) {
    const [participants, setParticipants] = useState<ParticipantListType[]>(initialData);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCampaignId, setFilterCampaignId] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
        key: 'createdAt',
        direction: 'desc'
    });

    const canEdit = isAdmin || permissions.includes('MARKETING_EDIT');
    const canDelete = isAdmin || permissions.includes('MARKETING_DELETE');

    const stats = useMemo(() => {
        const total = participants.length;
        const attended = participants.filter(p => p.status === 'ATTENDED').length;
        const reminded = participants.filter(p => p.status === 'REMINDED_1' || p.status === 'REMINDED_2').length;
        const rate = total > 0 ? Math.round((attended / total) * 100) : 0;
        return { total, attended, reminded, rate };
    }, [participants]);

    const handleCheckIn = async (id: string) => {
        try {
            const res = await checkInParticipant(id);
            if (res.success) {
                setParticipants(participants.map(p => p.id === id ? { ...p, status: 'ATTENDED', updatedAt: new Date() } : p));
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi điểm danh');
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        try {
            const res = await updateParticipantStatus(id, status);
            if (res.success) {
                setParticipants(participants.map(p => {
                    if (p.id === id) {
                        let customDataObj: any = {};
                        try {
                            if (p.customData) customDataObj = JSON.parse(p.customData);
                        } catch (e) {}

                        if (status === 'REMINDED_1') {
                            customDataObj['_remind1At'] = new Date().toISOString();
                        } else if (status === 'REMINDED_2') {
                            customDataObj['_remind2At'] = new Date().toISOString();
                        }

                        return { ...p, status: status, customData: JSON.stringify(customDataObj) };
                    }
                    return p;
                }));
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi cập nhật trạng thái');
        }
    };

    const handleCancelCheckIn = async (id: string) => {
        try {
            const res = await cancelCheckInParticipant(id);
            if (res.success) {
                setParticipants(participants.map(p => p.id === id ? { ...p, status: 'REGISTERED' } : p));
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi hủy điểm danh');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa dữ liệu người tham gia này?')) return;

        try {
            const res = await deleteParticipant(id);
            if (res.success) {
                setParticipants(participants.filter(p => p.id !== id));
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            console.error(error);
            toast.error('Lỗi xóa dữ liệu');
        }
    };

    const filteredData = participants.filter(p => {
        const searchStr = `${p.name} ${p.phone || ''} ${p.email || ''} ${p.campaign?.name || ''}`.toLowerCase();

        const matchSearch = searchStr.includes(searchTerm.toLowerCase());
        const matchCampaign = filterCampaignId === 'ALL' || p.campaignId === filterCampaignId;
        const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;

        return matchSearch && matchCampaign && matchStatus;
    });

    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig) return 0;

        let valA: any, valB: any;
        if (sortConfig.key === 'info') {
            valA = (a.name || '').toLowerCase();
            valB = (b.name || '').toLowerCase();
        } else if (sortConfig.key === 'campaign') {
            valA = (a.campaign?.name || '').toLowerCase();
            valB = (b.campaign?.name || '').toLowerCase();
        } else if (sortConfig.key === 'createdAt') {
            valA = new Date(a.createdAt).getTime();
            valB = new Date(b.createdAt).getTime();
        } else if (sortConfig.key === 'status') {
            valA = a.status;
            valB = b.status;
        }

        if (valA === undefined || valB === undefined) return 0;

        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig?.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-indigo-600" />
            : <ChevronDown className="w-3.5 h-3.5 ml-1 text-indigo-600" />;
    };

    const exportToCSV = () => {
        const headers = ['Họ và tên', 'Số điện thoại', 'Email', 'Chiến dịch', 'Form đăng ký', 'Trạng thái', 'Thời gian đăng ký', 'Thời gian Check-in'];
        const csvRows = [headers.join(',')];

        sortedData.forEach(p => {
            csvRows.push([
                `"${p.name || ''}"`,
                `"${p.phone || ''}"`,
                `"${p.email || ''}"`,
                `"${p.campaign?.name || ''}"`,
                `"${p.form?.title || ''}"`,
                `"${p.status}"`,
                `"${formatDate(p.createdAt)}"`,
                `"${p.updatedAt ? formatDate(p.updatedAt) : ''}"`
            ].join(','));
        });

        const blob = new Blob(["\uFEFF" + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `danh_sach_tham_gia_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const hasActiveFilters = searchTerm !== '' || filterCampaignId !== 'ALL' || filterStatus !== 'ALL';

    return (
        <div className="w-full space-y-5 font-sans text-slate-800 pb-8">
            {/* 1. Standard ERP Header */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0 mt-0.5">
                            <Users size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                                    Tiếp Thị & Sự Kiện
                                </span>
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    {stats.attended} khách đã check-in ({stats.rate}%)
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5 mt-1">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight m-0">
                                    Danh Sách Người Tham Gia Sự Kiện
                                </h1>
                                <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full tabular-nums">
                                    {participants.length} khách
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5 m-0">
                                Theo dõi danh sách đăng ký sự kiện, điểm danh check-in trực tiếp và gửi nhắc hẹn khách tham dự
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Link
                            href="/marketing/forms"
                            className="inline-flex items-center gap-1.5 h-[36px] bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 px-3 rounded-lg text-xs font-semibold transition-all no-underline"
                        >
                            <FileText size={14} className="text-indigo-600" />
                            <span>Biểu Mẫu Đăng Ký</span>
                        </Link>
                        <button
                            type="button"
                            onClick={exportToCSV}
                            className="inline-flex items-center gap-1.5 h-[36px] bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer border-none"
                        >
                            <Download size={14} />
                            <span>Xuất File CSV / Excel</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div
                    onClick={() => setFilterStatus('ALL')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        filterStatus === 'ALL'
                            ? 'bg-indigo-50/40 border-indigo-400 ring-2 ring-indigo-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Tổng Đăng Ký
                        </p>
                        <h3 className="text-2xl font-bold text-slate-900 tabular-nums mt-1 m-0">
                            {stats.total}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Toàn bộ khách hàng đăng ký
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200/70 shrink-0">
                        <Users size={19} />
                    </div>
                </div>

                <div
                    onClick={() => setFilterStatus(filterStatus === 'ATTENDED' ? 'ALL' : 'ATTENDED')}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        filterStatus === 'ATTENDED'
                            ? 'bg-emerald-50/50 border-emerald-400 ring-2 ring-emerald-500/15 shadow-sm'
                            : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                    }`}
                >
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Đã Check-in
                        </p>
                        <h3 className="text-2xl font-bold text-emerald-600 tabular-nums mt-1 m-0">
                            {stats.attended}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Khách đã có mặt tại sự kiện
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200/60 shrink-0">
                        <UserCheck size={19} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                            Đã Gửi Nhắc Hẹn
                        </p>
                        <h3 className="text-2xl font-bold text-indigo-600 tabular-nums mt-1 m-0">
                            {stats.reminded}
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-1 m-0">
                            Khách đã được liên hệ nhắc lịch
                        </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0">
                        <Bell size={19} />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 m-0">
                                Tỷ Lệ Tham Dự
                            </p>
                            <h3 className="text-2xl font-bold text-purple-600 tabular-nums mt-1 m-0">
                                {stats.rate}%
                            </h3>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shrink-0">
                            <CheckCircle2 size={19} />
                        </div>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5 overflow-hidden">
                        <div
                            className="bg-purple-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(stats.rate, 100)}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* 3. Filter Toolbar */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex-1 flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-3 focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/15 transition-all">
                    <Search size={15} className="text-slate-400 shrink-0 mr-2" />
                    <input
                        type="text"
                        placeholder="Tìm theo họ tên khách hàng, số điện thoại, email, chiến dịch..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                        className="w-full h-full text-xs font-medium text-slate-800 placeholder-slate-400 bg-transparent border-none outline-none p-0"
                    />
                    {searchTerm && (
                        <button
                            type="button"
                            onClick={() => setSearchTerm('')}
                            className="text-slate-400 hover:text-slate-600 ml-1.5 bg-transparent border-none cursor-pointer p-0.5 flex items-center"
                        >
                            <X size={13} />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                        <select
                            value={filterCampaignId}
                            onChange={(e) => setFilterCampaignId(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="appearance-none pr-5 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer h-full"
                        >
                            <option value="ALL">Tất cả chiến dịch</option>
                            {campaigns.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                    </div>

                    <div className="relative flex items-center h-[36px] bg-slate-50/80 border border-slate-200 rounded-lg px-2.5 focus-within:bg-white focus-within:border-indigo-500 transition-all">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                            className="appearance-none pr-5 text-xs font-semibold text-slate-700 bg-transparent border-none outline-none cursor-pointer h-full"
                        >
                            <option value="ALL">Tất cả trạng thái</option>
                            <option value="REGISTERED">Đã đăng ký (Chưa tới)</option>
                            <option value="ATTENDED">Đã check-in (Tham gia)</option>
                            <option value="CANCELLED">Hủy tham gia</option>
                        </select>
                        <ChevronDown size={13} className="text-slate-400 pointer-events-none absolute right-2" />
                    </div>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setFilterCampaignId('ALL');
                                setFilterStatus('ALL');
                            }}
                            className="inline-flex items-center gap-1 h-[36px] px-2.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/70 transition cursor-pointer"
                        >
                            <RotateCcw size={12} />
                            <span>Đặt lại</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 4. Data Table */}
            <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500">
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] cursor-pointer group" onClick={() => handleSort('info')}>
                                    <div className="flex items-center">
                                        Khách Hàng <SortIcon columnKey="info" />
                                    </div>
                                </th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] cursor-pointer group" onClick={() => handleSort('campaign')}>
                                    <div className="flex items-center">
                                        Chiến Dịch / Form <SortIcon columnKey="campaign" />
                                    </div>
                                </th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] cursor-pointer group" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center">
                                        Thời Gian Đăng Ký <SortIcon columnKey="createdAt" />
                                    </div>
                                </th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] cursor-pointer group" onClick={() => handleSort('status')}>
                                    <div className="flex items-center">
                                        Trạng Thái & Tiến Độ <SortIcon columnKey="status" />
                                    </div>
                                </th>
                                <th className="py-3 px-3.5 font-bold uppercase tracking-wider text-[11px] text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-14 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-400">
                                                <Users size={20} />
                                            </div>
                                            <p className="text-xs font-semibold text-slate-600 m-0">Chưa có người tham gia phù hợp</p>
                                            <p className="text-[11px] text-slate-400 m-0">Thử thay đổi bộ lọc tìm kiếm hoặc chiến dịch</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                sortedData.map((p) => {
                                    let parsed: any = {};
                                    try {
                                        if (p.customData) parsed = JSON.parse(p.customData);
                                    } catch (e) {}

                                    return (
                                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-3.5 align-middle">
                                                <div className="font-bold text-slate-900">{p.name || '[Chưa nhập tên]'}</div>
                                                <div className="text-[11px] font-medium text-slate-600 tabular-nums mt-0.5">{p.phone || '---'}</div>
                                                {p.email && <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{p.email}</div>}
                                            </td>
                                            <td className="py-3 px-3.5 text-slate-600 align-middle">
                                                <div className="font-semibold text-slate-800 truncate max-w-[220px]" title={p.campaign?.name}>
                                                    {p.campaign?.name}
                                                </div>
                                                <div className="text-[11px] text-slate-400">{p.form?.title}</div>
                                            </td>
                                            <td className="py-3 px-3.5 text-slate-600 tabular-nums align-middle">
                                                <div className="font-medium text-slate-700">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-[11px] text-slate-400 mt-0.5">{new Date(p.createdAt).toLocaleTimeString('vi-VN')}</div>
                                            </td>
                                            <td className="py-3 px-3.5 align-middle">
                                                <div className="flex flex-col gap-1">
                                                    {p.status === 'CANCELLED' ? (
                                                        <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                            Hủy tham gia
                                                        </span>
                                                    ) : p.status === 'ATTENDED' ? (
                                                        <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                                                            <UserCheck size={12} /> Đã Check-in ({p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString('vi-VN') : ''})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/70">
                                                            Đăng ký chờ tới
                                                        </span>
                                                    )}

                                                    {parsed._remind1At && (
                                                        <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 rounded-md text-[10px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200/60 tabular-nums">
                                                            <Clock size={10} /> Đã nhắc L1: {new Date(parsed._remind1At).toLocaleTimeString('vi-VN')}
                                                        </span>
                                                    )}
                                                    {parsed._remind2At && (
                                                        <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60 tabular-nums">
                                                            <Clock size={10} /> Đã nhắc L2: {new Date(parsed._remind2At).toLocaleTimeString('vi-VN')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 px-3.5 text-right align-middle">
                                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                    {canEdit && (p.status === 'REGISTERED' || p.status === 'REMINDED_1' || p.status === 'REMINDED_2') && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCheckIn(p.id)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors border-none cursor-pointer"
                                                        >
                                                            <CheckCircle size={12} /> Check-in
                                                        </button>
                                                    )}
                                                    {canEdit && p.status === 'REGISTERED' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateStatus(p.id, 'REMINDED_1')}
                                                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition-colors cursor-pointer"
                                                        >
                                                            Nhắc L1
                                                        </button>
                                                    )}
                                                    {canEdit && p.status === 'REMINDED_1' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateStatus(p.id, 'REMINDED_2')}
                                                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors cursor-pointer"
                                                        >
                                                            Nhắc L2
                                                        </button>
                                                    )}
                                                    {canEdit && p.status === 'ATTENDED' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleCancelCheckIn(p.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                                                        >
                                                            <RotateCcw size={11} /> Hoàn tác
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(p.id)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors bg-transparent border-none cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingParticipant } from '@prisma/client';
import { Button } from '@/app/components/ui/Button';
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
    MapPin, 
    UserCheck, 
    Download, 
    ChevronUp, 
    ChevronDown, 
    ArrowUpDown,
    Users,
    Bell,
    CheckCircle2,
    RotateCcw
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export type ParticipantListType = MarketingParticipant & {
    campaign: { id: string, name: string, code: string };
    form: { id: string, title: string } | null;
};

export default function ParticipantClient({
    initialData,
    campaigns,
    isAdmin,
    permissions,
}: {
    initialData: ParticipantListType[];
    campaigns: { id: string, name: string }[];
    isAdmin: boolean;
    permissions: string[];
}) {
    const router = useRouter();
    const [participants, setParticipants] = useState<ParticipantListType[]>(initialData);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCampaignId, setFilterCampaignId] = useState('ALL');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

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
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi điểm danh');
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
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi cập nhật trạng thái');
        }
    };

    const handleCancelCheckIn = async (id: string) => {
        try {
            const res = await cancelCheckInParticipant(id);
            if (res.success) {
                setParticipants(participants.map(p => p.id === id ? { ...p, status: 'REGISTERED' } : p));
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi hủy điểm danh');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa dữ liệu người tham gia này?')) return;
        
        try {
            const res = await deleteParticipant(id);
            if (res.success) {
                setParticipants(participants.filter(p => p.id !== id));
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi xóa dữ liệu');
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
            ? <ChevronUp className="w-3.5 h-3.5 ml-1 text-emerald-600" />
            : <ChevronDown className="w-3.5 h-3.5 ml-1 text-emerald-600" />;
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

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
                <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold text-slate-900">Quản Lý Người Tham Gia</h1>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                {participants.length} Khách
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 mt-0.5">Theo dõi danh sách đăng ký sự kiện, điểm danh check-in và gửi nhắc nhở</p>
                    </div>
                </div>

                <Button onClick={exportToCSV} variant="secondary" className="gap-2 border-slate-200 shadow-xs">
                    <Download className="w-4 h-4 text-emerald-600" /> Xuất File CSV / Excel
                </Button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tổng đăng ký</div>
                        <div className="text-2xl font-mono font-bold text-slate-900 mt-1">{stats.total}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đã check-in</div>
                        <div className="text-2xl font-mono font-bold text-emerald-600 mt-1">{stats.attended}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <UserCheck className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Đã gửi nhắc hẹn</div>
                        <div className="text-2xl font-mono font-bold text-indigo-600 mt-1">{stats.reminded}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Bell className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                    <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Tỷ lệ tham dự</div>
                        <div className="text-2xl font-mono font-bold text-purple-600 mt-1">{stats.rate}%</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm theo tên, SĐT, Email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    />
                </div>

                <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <select
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 font-medium"
                        value={filterCampaignId}
                        onChange={(e) => setFilterCampaignId(e.target.value)}
                    >
                        <option value="ALL">Tất cả chiến dịch</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <select
                        className="px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-700 font-medium"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="REGISTERED">Đã đăng ký (Chưa tới)</option>
                        <option value="ATTENDED">Đã check-in (Tham gia)</option>
                        <option value="CANCELLED">Hủy tham gia</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                <th className="py-3.5 px-4 font-semibold cursor-pointer group" onClick={() => handleSort('info')}>
                                    <div className="flex items-center">
                                        Khách Hàng <SortIcon columnKey="info" />
                                    </div>
                                </th>
                                <th className="py-3.5 px-4 font-semibold cursor-pointer group" onClick={() => handleSort('campaign')}>
                                    <div className="flex items-center">
                                        Chiến Dịch / Form <SortIcon columnKey="campaign" />
                                    </div>
                                </th>
                                <th className="py-3.5 px-4 font-semibold cursor-pointer group" onClick={() => handleSort('createdAt')}>
                                    <div className="flex items-center">
                                        Thời Gian Đăng Ký <SortIcon columnKey="createdAt" />
                                    </div>
                                </th>
                                <th className="py-3.5 px-4 font-semibold cursor-pointer group" onClick={() => handleSort('status')}>
                                    <div className="flex items-center">
                                        Trạng Thái & Tiến Độ <SortIcon columnKey="status" />
                                    </div>
                                </th>
                                <th className="py-3.5 px-4 font-semibold text-right">Thao Tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                <Users className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">Chưa có người tham gia phù hợp</p>
                                            <p className="text-xs text-slate-400">Thử thay đổi bộ lọc tìm kiếm hoặc chiến dịch</p>
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
                                        <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900">{p.name || '[Chưa nhập tên]'}</div>
                                                <div className="text-xs font-mono text-slate-600 mt-0.5">{p.phone || '---'}</div>
                                                <div className="text-xs text-slate-400 truncate max-w-[180px]">{p.email || ''}</div>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600">
                                                <div className="font-medium text-slate-800 truncate max-w-[200px]" title={p.campaign?.name}>
                                                    {p.campaign?.name}
                                                </div>
                                                <div className="text-[11px] text-slate-400">{p.form?.title}</div>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-600 text-xs">
                                                <div>{new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                                                <div className="text-slate-400 font-mono mt-0.5">{new Date(p.createdAt).toLocaleTimeString('vi-VN')}</div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <div className="flex flex-col gap-1">
                                                    {p.status === 'CANCELLED' ? (
                                                        <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                            Hủy tham gia
                                                        </span>
                                                    ) : p.status === 'ATTENDED' ? (
                                                        <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                            <UserCheck className="w-3.5 h-3.5" /> Đã Check-in ({p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString('vi-VN') : ''})
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 w-max px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/60">
                                                            Đăng ký chờ tới
                                                        </span>
                                                    )}

                                                    {parsed._remind1At && (
                                                        <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200/60">
                                                            <Clock className="w-3 h-3" /> Đã nhắc L1: {new Date(parsed._remind1At).toLocaleTimeString('vi-VN')}
                                                        </span>
                                                    )}
                                                    {parsed._remind2At && (
                                                        <span className="inline-flex items-center gap-1 w-max px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                                                            <Clock className="w-3 h-3" /> Đã nhắc L2: {new Date(parsed._remind2At).toLocaleTimeString('vi-VN')}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                    {canEdit && (p.status === 'REGISTERED' || p.status === 'REMINDED_1' || p.status === 'REMINDED_2') && (
                                                        <button 
                                                            onClick={() => handleCheckIn(p.id)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" /> Check-in
                                                        </button>
                                                    )}
                                                    {canEdit && p.status === 'REGISTERED' && (
                                                        <button 
                                                            onClick={() => handleUpdateStatus(p.id, 'REMINDED_1')}
                                                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200 transition-colors"
                                                        >
                                                            Nhắc L1
                                                        </button>
                                                    )}
                                                    {canEdit && p.status === 'REMINDED_1' && (
                                                        <button 
                                                            onClick={() => handleUpdateStatus(p.id, 'REMINDED_2')}
                                                            className="px-2 py-1 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                                                        >
                                                            Nhắc L2
                                                        </button>
                                                    )}
                                                    {canEdit && p.status === 'ATTENDED' && (
                                                        <button 
                                                            onClick={() => handleCancelCheckIn(p.id)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                                                        >
                                                            <RotateCcw className="w-3 h-3" /> Hoàn tác
                                                        </button>
                                                    )}
                                                    {canDelete && (
                                                        <button 
                                                            onClick={() => handleDelete(p.id)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
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

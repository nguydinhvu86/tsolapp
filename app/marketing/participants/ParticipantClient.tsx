'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingParticipant } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { checkInParticipant, cancelCheckInParticipant, deleteParticipant, updateParticipantStatus } from './actions';
import { Trash2, Search, CheckCircle, Clock, MapPin, UserCheck, Download, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatters';

export type ParticipantListType = MarketingParticipant & {
    campaign: { id: string, name: string, code: string };
    form: { id: string, title: string };
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

    const handleCheckIn = async (id: string) => {
        try {
            const res = await checkInParticipant(id);
            if (res.success) {
                setParticipants(participants.map(p => p.id === id ? { ...p, status: 'ATTENDED', updatedAt: new Date() } : p));
                alert("Check-in thành công");
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
        if (sortConfig?.key !== columnKey) return <ArrowUpDown size={14} className="ml-1 opacity-20 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' 
            ? <ChevronUp size={14} className="ml-1 text-blue-500" />
            : <ChevronDown size={14} className="ml-1 text-blue-500" />;
    };

    const exportToCSV = () => {
        // Simple CSV export
        const headers = ['Chiến dịch', 'Form đăng ký', 'Trạng thái', 'Thời gian đăng ký', 'Thời gian Check-in', 'Dữ liệu thô (JSON)'];
        const csvRows = [headers.join(',')];

        sortedData.forEach(p => {
            csvRows.push([
                `"${p.campaign?.name || ''}"`,
                `"${p.form?.title || ''}"`,
                `"${p.status}"`,
                `"${formatDate(p.createdAt)}"`,
                `"${p.updatedAt ? formatDate(p.updatedAt) : ''}"`,
                `"${(p.customData || '').replace(/"/g, '""')}"`
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
        <Card className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-6 gap-4">
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1">
                    <div className="relative w-full md:w-80">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-slate-800 dark:border-slate-700 dark:placeholder-gray-400 dark:text-white"
                            placeholder="Tìm tên, SĐT, Email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        value={filterCampaignId}
                        onChange={(e) => setFilterCampaignId(e.target.value)}
                    >
                        <option value="ALL">Tất cả chiến dịch</option>
                        {campaigns.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <select
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="REGISTERED">Đã đăng ký (Chưa tới)</option>
                        <option value="ATTENDED">Đã check-in (Tham gia)</option>
                        <option value="CANCELLED">Hủy tham gia</option>
                    </select>
                </div>
                <Button onClick={exportToCSV} variant="secondary" className="flex items-center gap-2 whitespace-nowrap">
                    <Download size={16} /> Xuất CSV
                </Button>
            </div>

            <div className="overflow-x-auto">
                <Table>
                    <thead>
                        <tr>
                            <th className="w-64 cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('info')}>
                                <div className="flex items-center">Thông tin (Trích xuất) <SortIcon columnKey="info" /></div>
                            </th>
                            <th className="cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('campaign')}>
                                <div className="flex items-center">Chiến dịch / Form <SortIcon columnKey="campaign" /></div>
                            </th>
                            <th className="cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('createdAt')}>
                                <div className="flex items-center">Thời gian ĐK <SortIcon columnKey="createdAt" /></div>
                            </th>
                            <th className="cursor-pointer group hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors" onClick={() => handleSort('status')}>
                                <div className="flex items-center">Trạng thái <SortIcon columnKey="status" /></div>
                            </th>
                            <th className="text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedData.length > 0 ? sortedData.map((p) => {
                            return (
                                <tr key={p.id}>
                                    <td>
                                        <div className="font-semibold text-slate-800 dark:text-slate-200">{p.name || '[Không tên]'}</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400">{p.phone}</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400 truncate w-48">{p.email}</div>
                                    </td>
                                    <td>
                                        <span className="font-medium inline-block max-w-[200px] truncate" title={p.campaign.name}>{p.campaign.name}</span>
                                        <div className="text-xs text-slate-500">{p.form.title}</div>
                                    </td>
                                    <td>
                                        <div className="text-sm">{new Date(p.createdAt).toLocaleDateString('vi-VN')}</div>
                                        <div className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleTimeString('vi-VN')}</div>
                                    </td>
                                    <td>
                                        <div className="flex flex-col gap-1.5">
                                            {p.status === 'CANCELLED' ? (
                                                <span className="inline-flex items-center gap-1 w-max px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                                                    Hủy
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 w-max px-2.5 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                                                    Đăng ký chờ tham gia
                                                </span>
                                            )}

                                            {(() => {
                                                if (p.status === 'CANCELLED') return null;
                                                try {
                                                    const parsed = p.customData ? JSON.parse(p.customData) : {};
                                                    return (
                                                        <>
                                                            {parsed._remind1At && (
                                                                <span className="inline-flex items-center gap-1 w-max px-2.5 py-1 text-xs font-medium rounded bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-400">
                                                                    <Clock size={14} /> Nhắc L1: {new Date(parsed._remind1At).toLocaleTimeString('vi-VN')} {new Date(parsed._remind1At).toLocaleDateString('vi-VN')}
                                                                </span>
                                                            )}
                                                            {parsed._remind2At && (
                                                                <span className="inline-flex items-center gap-1 w-max px-2.5 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-400">
                                                                    <Clock size={14} /> Nhắc L2: {new Date(parsed._remind2At).toLocaleTimeString('vi-VN')} {new Date(parsed._remind2At).toLocaleDateString('vi-VN')}
                                                                </span>
                                                            )}
                                                        </>
                                                    );
                                                } catch (e) { return null; }
                                            })()}

                                            {p.status === 'ATTENDED' && (
                                                <span className="inline-flex items-center gap-1 w-max px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400">
                                                    <UserCheck size={14} /> Điểm danh lúc: {p.updatedAt ? new Date(p.updatedAt).toLocaleTimeString('vi-VN') : ''}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="text-right space-x-2 whitespace-nowrap">
                                        {canEdit && (p.status === 'REGISTERED' || p.status === 'REMINDED_1' || p.status === 'REMINDED_2') && (
                                            <Button onClick={() => handleCheckIn(p.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 px-2 py-1 text-sm h-8">
                                                <CheckCircle size={14} className="mr-1" /> Check-in
                                            </Button>
                                        )}
                                        {canEdit && p.status === 'REGISTERED' && (
                                            <Button variant="secondary" onClick={() => handleUpdateStatus(p.id, 'REMINDED_1')} className="px-2 py-1 text-sm h-8 border-cyan-200 text-cyan-700 hover:bg-cyan-50">
                                                Nhắc L1
                                            </Button>
                                        )}
                                        {canEdit && p.status === 'REMINDED_1' && (
                                            <Button variant="secondary" onClick={() => handleUpdateStatus(p.id, 'REMINDED_2')} className="px-2 py-1 text-sm h-8 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                                                Nhắc L2
                                            </Button>
                                        )}
                                        {canEdit && p.status === 'ATTENDED' && (
                                            <Button variant="secondary" onClick={() => handleCancelCheckIn(p.id)} className="px-2 py-1 text-sm h-8">
                                                Hoàn tác
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button variant="danger" onClick={() => handleDelete(p.id)} className="px-2 py-1 text-sm h-8">
                                                <Trash2 size={14} /> Xóa
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        }) : (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-500">
                                    Không có người tham gia nào.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>
        </Card>
    );
}

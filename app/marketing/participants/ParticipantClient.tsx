'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MarketingParticipant } from '@prisma/client';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Table } from '@/app/components/ui/Table';
import { checkInParticipant, deleteParticipant } from './actions';
import { Trash2, Search, CheckCircle, Clock, MapPin, UserCheck, Download } from 'lucide-react';
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

    const canEdit = isAdmin || permissions.includes('MARKETING_EDIT');
    const canDelete = isAdmin || permissions.includes('MARKETING_DELETE');

    const handleCheckIn = async (id: string) => {
        try {
            const res = await checkInParticipant(id);
            if (res.success && res.data) {
                setParticipants(participants.map(p => p.id === id ? { ...p, status: 'ATTENDED', checkInTime: res.data.checkInTime } : p));
            } else {
                alert(res.error);
            }
        } catch (error) {
            console.error(error);
            alert('Lỗi điểm danh');
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

    const extractMainInfo = (dataObj: any) => {
        // Attempt to find Name, Phone, Email from dynamic JSON
        let name = '', phone = '', email = '';
        if (typeof dataObj === 'object' && dataObj !== null) {
            for (const [key, value] of Object.entries(dataObj)) {
                const k = key.toLowerCase();
                const v = typeof value === 'string' ? value : String(value);
                if (k.includes('tên') || k.includes('name')) name = v;
                if (k.includes('điện thoại') || k.includes('phone')) phone = v;
                if (k.includes('email') || k.includes('mail')) email = v;
            }
        }
        return { name, phone, email };
    };

    const filteredData = participants.filter(p => {
        const { name, phone, email } = extractMainInfo(p.data);
        const searchStr = `${name} ${phone} ${email} ${p.campaign.name}`.toLowerCase();
        
        const matchSearch = searchStr.includes(searchTerm.toLowerCase());
        const matchCampaign = filterCampaignId === 'ALL' || p.campaignId === filterCampaignId;
        const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;

        return matchSearch && matchCampaign && matchStatus;
    });

    const exportToCSV = () => {
        // Simple CSV export
        const headers = ['Chiến dịch', 'Form đăng ký', 'Trạng thái', 'Thời gian đăng ký', 'Thời gian Check-in', 'Dữ liệu thô (JSON)'];
        const csvRows = [headers.join(',')];

        filteredData.forEach(p => {
            csvRows.push([
                `"${p.campaign.name}"`,
                `"${p.form.title}"`,
                `"${p.status}"`,
                `"${formatDate(p.createdAt)}"`,
                `"${p.checkInTime ? formatDate(p.checkInTime) : ''}"`,
                `"${JSON.stringify(p.data).replace(/"/g, '""')}"`
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
                            <th className="w-64">Thông tin (Trích xuất)</th>
                            <th>Chiến dịch / Form</th>
                            <th>Thời gian ĐK</th>
                            <th>Trạng thái</th>
                            <th>Dữ liệu chi tiết</th>
                            <th className="text-right">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? filteredData.map((p) => {
                            const { name, phone, email } = extractMainInfo(p.data);
                            return (
                                <tr key={p.id}>
                                    <td>
                                        <div className="font-semibold text-slate-800 dark:text-slate-200">{name || '[Không tên]'}</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400">{phone}</div>
                                        <div className="text-sm text-slate-600 dark:text-slate-400 truncate w-48">{email}</div>
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
                                        {p.status === 'ATTENDED' ? (
                                            <div>
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-400">
                                                    <UserCheck size={14} /> Điểm danh lúc
                                                </span>
                                                <div className="text-xs text-emerald-600 dark:text-emerald-500 font-bold mt-1 ml-1 font-mono">
                                                    {p.checkInTime ? new Date(p.checkInTime).toLocaleTimeString('vi-VN') : ''}
                                                </div>
                                            </div>
                                        ) : p.status === 'REGISTERED' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-400">
                                                <Clock size={14} /> Chờ tham gia
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded bg-gray-100 text-gray-800">
                                                Hủy
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="text-xs font-mono bg-slate-100 dark:bg-slate-800 p-2 rounded max-h-20 overflow-y-auto max-w-[250px] whitespace-pre-wrap">
                                            {JSON.stringify(p.data, null, 2)}
                                        </div>
                                    </td>
                                    <td className="text-right space-x-2 whitespace-nowrap">
                                        {canEdit && p.status === 'REGISTERED' && (
                                            <Button onClick={() => handleCheckIn(p.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white border-0 px-2 py-1 text-sm h-8">
                                                <CheckCircle size={14} className="mr-1" /> Check-in
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

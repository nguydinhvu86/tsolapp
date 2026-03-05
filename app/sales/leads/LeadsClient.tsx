'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Filter, LayoutGrid, List, MoreVertical, Calendar, Phone, FileText, CheckCircle, Trash2 } from 'lucide-react';
import { formatMoney, formatDate } from '@/lib/utils/formatters';

const STATUSES = [
    { id: 'NEW', label: 'Tiếp nhận mới', color: { bg: '#e0e7ff', text: '#3730a3', border: '#c7d2fe', colBg: '#f8fafc' } },
    { id: 'CONTACTED', label: 'Đã liên hệ', color: { bg: '#e0f2fe', text: '#075985', border: '#bae6fd', colBg: '#f0f9ff' } },
    { id: 'QUALIFIED', label: 'Đánh giá / Khảo sát', color: { bg: '#fef3c7', text: '#92400e', border: '#fde68a', colBg: '#fffbeb' } },
    { id: 'PROPOSAL', label: 'Gửi báo giá', color: { bg: '#f3e8ff', text: '#6b21a8', border: '#e9d5ff', colBg: '#faf5ff' } },
    { id: 'WON', label: 'Chốt thành công', color: { bg: '#dcfce7', text: '#166534', border: '#bbf7d0', colBg: '#f0fdf4' } },
    { id: 'LOST', label: 'Thất bại', color: { bg: '#fee2e2', text: '#991b1b', border: '#fecaca', colBg: '#fef2f2' } }
];

export function LeadsClient({ leads, customers, users }: { leads: any[], customers: any[], users: any[] }) {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const filteredLeads = useMemo(() => {
        let filtered = leads;
        if (statusFilter !== 'ALL') {
            filtered = filtered.filter(l => l.status === statusFilter);
        }

        return filtered.filter(l =>
            l.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            l.code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [leads, searchTerm, statusFilter]);

    const leadsByStatus = useMemo(() => {
        const grouped: Record<string, any[]> = {};
        STATUSES.forEach(s => grouped[s.id] = []);
        filteredLeads.forEach(l => {
            if (grouped[l.status]) grouped[l.status].push(l);
            else grouped['NEW'].push(l); // fallback
        });
        return grouped;
    }, [filteredLeads]);

    const stats = useMemo(() => {
        const counts = { ALL: 0, NEW: 0, CONTACTED: 0, QUALIFIED: 0, PROPOSAL: 0, WON: 0, LOST: 0 };
        const amounts = { ALL: 0, NEW: 0, CONTACTED: 0, QUALIFIED: 0, PROPOSAL: 0, WON: 0, LOST: 0 };

        leads.forEach(l => {
            counts.ALL++;
            amounts.ALL += (l.estimatedValue || 0);

            if (counts[l.status as keyof typeof counts] !== undefined) {
                counts[l.status as keyof typeof counts]++;
                amounts[l.status as keyof typeof amounts] += (l.estimatedValue || 0);
            }
        });

        return { counts, amounts };
    }, [leads]);

    const statsCards = [
        { id: 'ALL', label: 'Tất Cả', count: stats.counts.ALL, amount: stats.amounts.ALL, colorClass: 'stat-card-purple', icon: List },
        { id: 'NEW', label: 'Tiếp Nhận Mới', count: stats.counts.NEW, amount: stats.amounts.NEW, colorClass: 'stat-card-emerald', icon: Calendar },
        { id: 'CONTACTED', label: 'Đã Liên Hệ', count: stats.counts.CONTACTED, amount: stats.amounts.CONTACTED, colorClass: 'stat-card-blue', icon: Phone },
        { id: 'QUALIFIED', label: 'Đánh Giá', count: stats.counts.QUALIFIED, amount: stats.amounts.QUALIFIED, colorClass: 'stat-card-amber', icon: Search },
        { id: 'PROPOSAL', label: 'Gửi Báo Giá', count: stats.counts.PROPOSAL, amount: stats.amounts.PROPOSAL, colorClass: 'stat-card-indigo', icon: FileText },
        { id: 'WON', label: 'Chốt Thành Công', count: stats.counts.WON, amount: stats.amounts.WON, colorClass: 'stat-card-green', icon: CheckCircle },
        { id: 'LOST', label: 'Thất Bại', count: stats.counts.LOST, amount: stats.amounts.LOST, colorClass: 'stat-card-red', icon: Trash2 },
    ];

    const premiumCSS = `
        .stat-card {
            background: white;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            border: 1px solid #f1f5f9;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }
        .stat-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 12px 25px rgba(0,0,0,0.06);
        }
        .stat-icon {
            border-radius: 12px;
            width: 42px;
            height: 42px;
            display: flex;
            align-items: center;
            justify-center: center;
        }
        
        .stat-card-purple { border-left: 4px solid #8b5cf6; }
        .stat-card-purple .stat-icon { background: #ede9fe; color: #8b5cf6; }
        .stat-card-purple .stat-title { color: #8b5cf6; }
        
        .stat-card-blue { border-left: 4px solid #3b82f6; }
        .stat-card-blue .stat-icon { background: #eff6ff; color: #3b82f6; }
        .stat-card-blue .stat-title { color: #3b82f6; }
        
        .stat-card-emerald { border-left: 4px solid #10b981; }
        .stat-card-emerald .stat-icon { background: #ecfdf5; color: #10b981; }
        .stat-card-emerald .stat-title { color: #10b981; }
        
        .stat-card-amber { border-left: 4px solid #f59e0b; }
        .stat-card-amber .stat-icon { background: #fffbeb; color: #f59e0b; }
        .stat-card-amber .stat-title { color: #f59e0b; }
        
        .stat-card-indigo { border-left: 4px solid #6366f1; }
        .stat-card-indigo .stat-icon { background: #e0e7ff; color: #6366f1; }
        .stat-card-indigo .stat-title { color: #6366f1; }
        
        .stat-card-green { border-left: 4px solid #22c55e; }
        .stat-card-green .stat-icon { background: #dcfce7; color: #22c55e; }
        .stat-card-green .stat-title { color: #22c55e; }

        .stat-card-red { border-left: 4px solid #ef4444; }
        .stat-card-red .stat-icon { background: #fee2e2; color: #ef4444; }
        .stat-card-red .stat-title { color: #ef4444; }
    `;

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {/* Heder */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Quản lý Cơ Hội Bán Hàng</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Theo dõi và chuyển đổi khách hàng tiềm năng thành hợp đồng.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode('kanban')}
                        className={`p-2 rounded-md ${viewMode === 'kanban' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:bg-gray-100'}`}
                    >
                        <List size={20} />
                    </button>
                    <Link href="/sales/leads/new" className="ml-2 btn-primary flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                        <Plus size={18} />
                        <span>Thêm Cơ Hội</span>
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <style dangerouslySetInnerHTML={{ __html: premiumCSS }} />

            <div className="flex flex-wrap gap-4 mb-6">
                {statsCards.map(stat => (
                    <div
                        key={stat.id}
                        onClick={() => {
                            if (statusFilter === stat.id) setStatusFilter('ALL');
                            else setStatusFilter(stat.id);
                        }}
                        className={`stat-card ${stat.colorClass} cursor-pointer min-w-[160px] flex-1 ${statusFilter === stat.id ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                    >
                        <div className="flex justify-between items-start gap-2 mb-2">
                            <span
                                className="stat-title text-sm font-semibold uppercase tracking-wide"
                                style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1
                                }}
                                title={stat.label}
                            >
                                {stat.label}
                            </span>
                            <div className="stat-icon p-2 rounded-full flex justify-center items-center shrink-0">
                                <stat.icon size={18} />
                            </div>
                        </div>
                        <div className="stat-info">
                            <span className="stat-value text-3xl font-bold">{stat.count}</span>
                        </div>
                        {stat.amount > 0 && (
                            <div className="mt-2 text-xs font-semibold opacity-80">
                                {formatMoney(stat.amount)}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl mb-6 flex gap-4 items-center">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm cơ hội, công ty, mã KH..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                    />
                </div>
            </div>

            {/* KANBAN VIEW */}
            {viewMode === 'kanban' && (
                <div className="flex overflow-x-auto pb-4 gap-4 snap-x" style={{ minHeight: '600px' }}>
                    {STATUSES.map(status => (
                        <div key={status.id} className="min-w-[300px] w-[300px] rounded-xl flex flex-col snap-start shrink-0 border border-gray-200" style={{ backgroundColor: status.color.colBg }}>
                            <div className="p-3 flex justify-between items-center gap-2 rounded-t-xl" style={{ backgroundColor: status.color.bg, borderBottom: `2px solid ${status.color.border}` }}>
                                <div className="flex items-center gap-2.5" style={{ minWidth: 0 }}>
                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: status.color.text }} />
                                    <h3
                                        className="font-bold"
                                        style={{
                                            color: status.color.text,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.02em',
                                            fontSize: '13px',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis'
                                        }}
                                        title={status.label}
                                    >
                                        {status.label}
                                    </h3>
                                </div>
                            </div>
                            <div className="p-3 flex-1 overflow-y-auto space-y-3 mt-1">
                                {leadsByStatus[status.id].map(lead => (
                                    <div
                                        key={lead.id}
                                        onClick={() => router.push(`/sales/leads/${lead.id}`)}
                                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-medium text-gray-500">{lead.code}</span>
                                        </div>
                                        <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors line-clamp-2">
                                            {lead.name}
                                        </h3>
                                        <p className="text-sm text-gray-600 mb-3 truncate">
                                            {lead.customer?.name || lead.company || lead.contactName || 'Chưa rõ khách hàng'}
                                        </p>

                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <div className="font-semibold text-gray-900">
                                                {formatMoney(lead.estimatedValue || 0)}
                                            </div>
                                            {lead.expectedCloseDate && (
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDate(lead.expectedCloseDate)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {leadsByStatus[status.id].length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm italic border-2 border-dashed border-gray-200 rounded-lg">
                                        Không có cơ hội nào
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TABLE VIEW */}
            {viewMode === 'table' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Mã CH</th>
                                    <th className="px-6 py-4 font-medium">Tên Cơ Hội</th>
                                    <th className="px-6 py-4 font-medium">Khách Hàng</th>
                                    <th className="px-6 py-4 font-medium">Trạng Thái</th>
                                    <th className="px-6 py-4 font-medium text-right">Giá Trị (Dự kiến)</th>
                                    <th className="px-6 py-4 font-medium">Ngày Dự Kiến</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredLeads.map(lead => {
                                    const statusObj = STATUSES.find(s => s.id === lead.status) || STATUSES[0];
                                    return (
                                        <tr
                                            key={lead.id}
                                            onClick={() => router.push(`/sales/leads/${lead.id}`)}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                                {lead.code}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 line-clamp-1">{lead.name}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-900">{lead.customer?.name || lead.company || '—'}</div>
                                                <div className="text-xs text-gray-500">{lead.customer?.email || lead.email || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap`} style={{ backgroundColor: statusObj.color.bg, color: statusObj.color.text, border: `1px solid ${statusObj.color.border}` }}>
                                                    {statusObj.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-gray-900">
                                                {formatMoney(lead.estimatedValue || 0)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500">
                                                {lead.expectedCloseDate ? formatDate(lead.expectedCloseDate) : '—'}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredLeads.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                            Không tìm thấy cơ hội bán hàng nào phù hợp.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

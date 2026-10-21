'use client';

import React from 'react';
import Link from 'next/link';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Target, Users, ArrowRight, DollarSign } from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface LeadDistributionProps {
    leads?: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; text: string; border: string }> = {
    'NEW': { label: 'Mới tạo', color: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    'CONTACTED': { label: 'Đã liên hệ', color: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    'QUALIFIED': { label: 'Tiềm năng cao', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    'PROPOSAL': { label: 'Đang báo giá', color: '#ec4899', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    'WON': { label: 'Thành công (Won)', color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    'LOST': { label: 'Thất bại (Lost)', color: '#ef4444', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

export function LeadDistributionWidget({ leads = [] }: LeadDistributionProps) {
    const activeLeads = leads.filter(l => l.status !== 'WON' && l.status !== 'LOST');

    // Aggregate status counts
    const statusCounts: Record<string, number> = {};
    leads.forEach(l => {
        statusCounts[l.status] = (statusCounts[l.status] || 0) + 1;
    });

    const chartData = Object.entries(statusCounts).map(([status, count]) => {
        const conf = STATUS_CONFIG[status] || { label: status, color: '#94a3b8' };
        return {
            name: conf.label,
            statusKey: status,
            value: count,
            color: conf.color,
            percentage: leads.length > 0 ? ((count / leads.length) * 100).toFixed(0) : 0,
        };
    }).sort((a, b) => b.value - a.value);

    return (
        <div className="flex flex-col xl:flex-row gap-4 w-full mb-2 items-stretch">
            {/* Left: Active Leads Table */}
            <div className="w-full xl:w-[65%] flex flex-col">
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center ring-1 ring-blue-500/20 shrink-0">
                                <Users size={16} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                    Cơ Hội Bán Hàng Cần Chăm Sóc ({activeLeads.length})
                                </h3>
                            </div>
                        </div>

                        <Link
                            href="/sales/leads"
                            className="text-xs text-primary hover:text-emerald-700 font-semibold flex items-center gap-1 group/link transition-colors py-1 px-2 rounded-lg hover:bg-emerald-50/60"
                        >
                            <span>Xem tất cả Leads</span>
                            <ArrowRight size={13} className="transition-transform group-hover/link:translate-x-0.5" />
                        </Link>
                    </div>

                    {activeLeads.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-10 text-slate-400 text-xs">
                            <Users size={24} className="mb-2 text-slate-300" />
                            <span>Không có cơ hội bán hàng nào đang mở.</span>
                        </div>
                    ) : (
                        <div className="table-wrapper custom-scrollbar" style={{ flex: 1, maxHeight: '280px', overflowY: 'auto' }}>
                            <table style={{ minWidth: '100%' }}>
                                <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="text-left py-2 px-3 border-b border-slate-100">Mã Lead</th>
                                        <th className="text-left py-2 px-3 border-b border-slate-100">Tên cơ hội / Khách hàng</th>
                                        <th className="text-right py-2 px-3 border-b border-slate-100">Giá trị dự kiến</th>
                                        <th className="text-center py-2 px-3 border-b border-slate-100">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeLeads.slice(0, 30).map(lead => {
                                        const conf = STATUS_CONFIG[lead.status] || STATUS_CONFIG['NEW'];
                                        return (
                                            <tr key={lead.id} className="hover:bg-slate-50/70 transition-colors group">
                                                <td className="py-2.5 px-3 border-b border-slate-100">
                                                    <Link href={`/sales/leads/${lead.id}`} className="text-xs font-mono font-bold text-blue-600 group-hover:underline">
                                                        {lead.code}
                                                    </Link>
                                                </td>
                                                <td className="py-2.5 px-3 border-b border-slate-100">
                                                    <div className="text-xs font-semibold text-slate-800 line-clamp-1" title={lead.name}>
                                                        {lead.name}
                                                    </div>
                                                    {lead.company && (
                                                        <div className="text-[11px] text-slate-400 truncate">
                                                            {lead.company}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2.5 px-3 border-b border-slate-100 text-right">
                                                    <span className="text-xs font-mono font-bold text-slate-900">
                                                        {formatMoney(lead.estimatedValue || 0)}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 border-b border-slate-100 text-center">
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${conf.bg} ${conf.text} ${conf.border}`}>
                                                        {conf.label}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Right: Donut Chart with HTML side-by-side Legend (Zero overlap) */}
            <div className="w-full xl:w-[35%] flex flex-col">
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full min-h-[300px]">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center ring-1 ring-purple-500/20 shrink-0">
                                <Target size={16} />
                            </div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                Phân Bổ Giai Đoạn Lead
                            </h3>
                        </div>
                        <span className="text-xs font-bold text-slate-600 font-mono">
                            {leads.length} Tổng
                        </span>
                    </div>

                    {leads.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-xs text-slate-400">
                            Chưa có dữ liệu cơ hội bán hàng.
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            {/* Donut Chart */}
                            <div className="relative w-full" style={{ height: '180px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={chartData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={75}
                                            paddingAngle={3}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: any) => [`${value} Leads`, 'Số lượng']}
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                fontSize: '11px'
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng Leads</span>
                                    <span className="text-xl font-black text-slate-800 font-mono">{leads.length}</span>
                                </div>
                            </div>

                            {/* HTML Side-by-side Legend (Zero overlap) */}
                            <div className="w-full grid grid-cols-2 gap-x-2 gap-y-1.5 mt-3 pt-3 border-t border-slate-100">
                                {chartData.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px] p-1 rounded-lg hover:bg-slate-50">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                            <span className="truncate text-slate-600 font-medium">{item.name}</span>
                                        </div>
                                        <span className="font-mono font-bold text-slate-800 shrink-0">
                                            {item.value} <span className="text-slate-400 font-normal">({item.percentage}%)</span>
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

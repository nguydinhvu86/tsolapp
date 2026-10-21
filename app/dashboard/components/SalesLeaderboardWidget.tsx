'use client';

import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Cell,
    CartesianGrid
} from 'recharts';
import { Trophy, Award, TrendingUp, Users, DollarSign } from 'lucide-react';
import { formatMoney } from '@/lib/utils/formatters';

interface SalesLeaderboardProps {
    invoices?: any[];
    quotes?: any[];
    leads?: any[];
    users?: any[];
}

export function SalesLeaderboardWidget({
    invoices = [],
    quotes = [],
    leads = [],
    users = [],
}: SalesLeaderboardProps) {
    const leaderboard = useMemo(() => {
        const repMap = new Map<string, {
            id: string;
            name: string;
            avatar?: string | null;
            revenue: number;
            wonQuotes: number;
            totalLeads: number;
        }>();

        // Initialize users if available
        users.forEach(u => {
            if (u && u.id) {
                repMap.set(u.id, {
                    id: u.id,
                    name: u.name || 'Nhân viên',
                    avatar: u.avatar,
                    revenue: 0,
                    wonQuotes: 0,
                    totalLeads: 0,
                });
            }
        });

        // Tally invoices
        let totalSalesRevenue = 0;
        invoices.forEach(inv => {
            if (inv.status !== 'DRAFT' && inv.status !== 'CANCELLED') {
                const rep = inv.salesperson || inv.creator;
                const repId = rep?.id || inv.salespersonId || inv.creatorId;
                const repName = rep?.name || 'Nhân viên';

                if (repId) {
                    if (!repMap.has(repId)) {
                        repMap.set(repId, {
                            id: repId,
                            name: repName,
                            avatar: rep?.avatar,
                            revenue: 0,
                            wonQuotes: 0,
                            totalLeads: 0,
                        });
                    }
                    const entry = repMap.get(repId)!;
                    entry.revenue += (inv.totalAmount || 0);
                    totalSalesRevenue += (inv.totalAmount || 0);
                }
            }
        });

        // Tally won quotes
        quotes.forEach(q => {
            if (q.status === 'ACCEPTED') {
                const rep = q.salesperson || q.creator;
                const repId = rep?.id || q.salespersonId || q.creatorId;
                if (repId && repMap.has(repId)) {
                    repMap.get(repId)!.wonQuotes += 1;
                }
            }
        });

        // Tally leads
        leads.forEach(l => {
            const repId = l.assignedToId || l.creatorId;
            if (repId && repMap.has(repId)) {
                repMap.get(repId)!.totalLeads += 1;
            }
        });

        // Sort by revenue descending
        const sorted = Array.from(repMap.values())
            .filter(r => r.revenue > 0 || r.wonQuotes > 0 || r.totalLeads > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        return {
            ranks: sorted,
            totalRevenue: totalSalesRevenue,
        };
    }, [invoices, quotes, leads, users]);

    // Palettes for Sales Reps
    const REP_COLORS = [
        { start: '#f59e0b', end: '#d97706' }, // #1 Gold
        { start: '#64748b', end: '#475569' }, // #2 Silver
        { start: '#d97706', end: '#b45309' }, // #3 Bronze
        { start: '#3b82f6', end: '#1d4ed8' }, // #4
        { start: '#8b5cf6', end: '#6d28d9' }, // #5
    ];

    const chartItems = leaderboard.ranks.map((rep, idx) => {
        const share = leaderboard.totalRevenue > 0 ? (rep.revenue / leaderboard.totalRevenue) * 100 : 0;
        const color = REP_COLORS[idx] || REP_COLORS[0];
        return {
            ...rep,
            shortName: rep.name.length > 15 ? rep.name.substring(0, 14) + '...' : rep.name,
            share: share.toFixed(1),
            colorStart: color.start,
            colorEnd: color.end,
            gradientId: `repGrad_${idx}`,
        };
    });

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-md transition-shadow flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <Trophy size={20} strokeWidth={2.2} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                                Bảng Xếp Hạng Hiệu Suất Bán Hàng (Leaderboard)
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Thi đua Kinh doanh
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-none mt-1">
                            Xếp hạng nhân viên kinh doanh dẫn đầu về doanh số hóa đơn và báo giá thành công
                        </p>
                    </div>
                </div>

                <div className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 text-xs font-bold flex items-center gap-1.5">
                    <span>🏆 Tổng Doanh số:</span>
                    <span className="font-mono">{formatMoney(leaderboard.totalRevenue)}</span>
                </div>
            </div>

            {/* Split View: Recharts BarChart (Left) + Detailed Medal Cards (Right) */}
            {leaderboard.ranks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs flex-1">
                    <Award size={32} className="mb-2 text-slate-300" />
                    <span>Chưa có dữ liệu ghi nhận doanh số theo nhân viên.</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch flex-1">
                    {/* Left: Recharts BarChart (7 Cols) */}
                    <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-amber-600" />
                                Biểu Đồ Doanh Số Theo Nhân Viên
                            </span>
                            <span className="text-[11px] font-medium text-slate-400">Đơn vị: VNĐ</span>
                        </div>

                        <div className="w-full flex-1" style={{ minHeight: '260px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={chartItems}
                                    margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                                >
                                    <defs>
                                        {chartItems.map((item) => (
                                            <linearGradient key={item.gradientId} id={item.gradientId} x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor={item.colorStart} stopOpacity={0.85} />
                                                <stop offset="100%" stopColor={item.colorEnd} stopOpacity={1} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                    <XAxis
                                        type="number"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#64748b', fontSize: 11 }}
                                        tickFormatter={(val) => {
                                            if (val >= 1000000000) return `${(val / 1000000000).toFixed(1)} Tỷ`;
                                            if (val >= 1000000) return `${(val / 1000000).toFixed(0)} Tr`;
                                            return val;
                                        }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="shortName"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 600 }}
                                        width={100}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                                        contentStyle={{
                                            backgroundColor: '#ffffff',
                                            borderRadius: '12px',
                                            border: '1px solid #cbd5e1',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            fontSize: '12px',
                                            padding: '10px 14px'
                                        }}
                                        formatter={(val: any, _name: any, item: any) => {
                                            return [
                                                `${formatMoney(Number(val) || 0)} (${item.payload.share}% toàn đội)`,
                                                item.payload.name
                                            ];
                                        }}
                                    />
                                    <Bar
                                        dataKey="revenue"
                                        radius={[0, 8, 8, 0]}
                                        maxBarSize={28}
                                    >
                                        {chartItems.map((entry) => (
                                            <Cell key={`cell-${entry.id}`} fill={`url(#${entry.gradientId})`} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right: Detailed Rep Cards (5 Cols) */}
                    <div className="lg:col-span-5 flex flex-col justify-between gap-2">
                        {chartItems.map((rep, idx) => {
                            const isTop1 = idx === 0;
                            const isTop2 = idx === 1;
                            const isTop3 = idx === 2;

                            return (
                                <div
                                    key={rep.id}
                                    className={`p-2.5 sm:p-3 rounded-xl border transition-all duration-150 hover:shadow-xs hover:scale-[1.01] ${
                                        isTop1
                                            ? 'bg-gradient-to-r from-amber-50/90 via-yellow-50/40 to-white border-amber-300 ring-1 ring-amber-300/40'
                                            : isTop2
                                            ? 'bg-slate-50/70 border-slate-200'
                                            : 'bg-white border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {/* Rank Medal */}
                                            <div className={`w-7 h-7 rounded-lg font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs ${
                                                isTop1
                                                    ? 'bg-amber-400 text-amber-950 font-black'
                                                    : isTop2
                                                    ? 'bg-slate-300 text-slate-800'
                                                    : isTop3
                                                    ? 'bg-amber-100 text-amber-800'
                                                    : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {isTop1 ? '🥇' : isTop2 ? '🥈' : isTop3 ? '🥉' : `#${idx + 1}`}
                                            </div>

                                            {/* Name & Stats */}
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-bold text-slate-900 truncate">
                                                    {rep.name}
                                                </h4>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                    <span>{rep.wonQuotes} báo giá chốt</span>
                                                    <span>•</span>
                                                    <span>{rep.totalLeads} cơ hội</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Amount & Share */}
                                        <div className="text-right shrink-0">
                                            <span className="text-xs font-mono font-black text-emerald-700 block">
                                                {formatMoney(rep.revenue)}
                                            </span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800">
                                                {rep.share}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

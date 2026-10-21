'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    PieChart,
    Pie,
    Cell,
    Line,
    ComposedChart
} from 'recharts';
import {
    Target,
    TrendingUp,
    CheckCircle2,
    Clock,
    XCircle,
    ChevronDown,
    ChevronUp,
    Sparkles,
    BarChart3,
    PieChart as PieChartIcon,
    Award,
    Flame,
    Share2,
    Users
} from 'lucide-react';

interface Props {
    leads: any[];
}

const STAGE_CONFIG: Record<string, { label: string; color: string; order: number }> = {
    NEW: { label: 'Mới', color: '#3b82f6', order: 1 },
    CONTACTED: { label: 'Đã liên hệ', color: '#0ea5e9', order: 2 },
    QUALIFIED: { label: 'Tiềm năng', color: '#f59e0b', order: 3 },
    PROPOSAL: { label: 'Đang đề xuất', color: '#a855f7', order: 4 },
    WON: { label: 'Thành công', color: '#10b981', order: 5 },
    LOST: { label: 'Thất bại', color: '#f43f5e', order: 6 }
};

const SOURCE_COLORS = [
    '#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#64748b'
];

export function LeadAnalyticsBar({ leads = [] }: Props) {
    const [isMounted, setIsMounted] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [donutMode, setDonutMode] = useState<'SOURCE' | 'SCORE'>('SCORE');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatVND = (num: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(num || 0);
    };

    const formatShortVND = (num: number) => {
        const abs = Math.abs(num);
        if (abs >= 1_000_000_000) {
            return `${(num / 1_000_000_000).toFixed(1)} Tỷ`;
        }
        if (abs >= 1_000_000) {
            return `${(num / 1_000_000).toFixed(1)} Tr`;
        }
        if (abs >= 1_000) {
            return `${(num / 1_000).toFixed(0)}k`;
        }
        return `${num}`;
    };

    // Calculate Pipeline Funnel & Analytics
    const stats = useMemo(() => {
        let totalLeads = leads.length;
        let activePipelineValue = 0;
        let wonValue = 0;
        let lostValue = 0;
        let totalWonCount = 0;
        let totalLostCount = 0;
        let totalScore = 0;
        let scoredCount = 0;

        const stageMap: Record<string, { stage: string; label: string; count: number; value: number; color: string; order: number }> = {
            NEW: { stage: 'NEW', label: 'Mới', count: 0, value: 0, color: STAGE_CONFIG.NEW.color, order: 1 },
            CONTACTED: { stage: 'CONTACTED', label: 'Đã liên hệ', count: 0, value: 0, color: STAGE_CONFIG.CONTACTED.color, order: 2 },
            QUALIFIED: { stage: 'QUALIFIED', label: 'Tiềm năng', count: 0, value: 0, color: STAGE_CONFIG.QUALIFIED.color, order: 3 },
            PROPOSAL: { stage: 'PROPOSAL', label: 'Đang đề xuất', count: 0, value: 0, color: STAGE_CONFIG.PROPOSAL.color, order: 4 },
            WON: { stage: 'WON', label: 'Thành công', count: 0, value: 0, color: STAGE_CONFIG.WON.color, order: 5 },
            LOST: { stage: 'LOST', label: 'Thất bại', count: 0, value: 0, color: STAGE_CONFIG.LOST.color, order: 6 }
        };

        const sourceMap: Record<string, { name: string; count: number; value: number }> = {};

        let hotScoreCount = 0;  // > 80
        let warmScoreCount = 0; // 50 - 80
        let coldScoreCount = 0; // < 50

        leads.forEach(l => {
            const val = Number(l.estimatedValue) || 0;
            const st = l.status || 'NEW';
            const score = Number(l.score) || 0;

            if (score > 0) {
                totalScore += score;
                scoredCount++;
            }

            if (score >= 80) hotScoreCount++;
            else if (score >= 50) warmScoreCount++;
            else coldScoreCount++;

            if (stageMap[st]) {
                stageMap[st].count++;
                stageMap[st].value += val;
            }

            if (['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL'].includes(st)) {
                activePipelineValue += val;
            } else if (st === 'WON') {
                wonValue += val;
                totalWonCount++;
            } else if (st === 'LOST') {
                lostValue += val;
                totalLostCount++;
            }

            // Source mapping
            const src = l.source || 'Trực tiếp / Chưa gán';
            if (!sourceMap[src]) {
                sourceMap[src] = { name: src, count: 0, value: 0 };
            }
            sourceMap[src].count++;
            sourceMap[src].value += val;
        });

        // Stage Funnel List
        const funnelData = Object.values(stageMap).sort((a, b) => a.order - b.order);

        // Source Donut Data
        const sourceData = Object.values(sourceMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map((s, idx) => ({
                ...s,
                color: SOURCE_COLORS[idx % SOURCE_COLORS.length]
            }));

        // Score Tier Donut Data
        const scoreTierData = [
            { name: 'Cơ hội Vàng (Score > 80)', count: hotScoreCount, color: '#10b981' },
            { name: 'Tiềm năng (Score 50 - 80)', count: warmScoreCount, color: '#f59e0b' },
            { name: 'Cần nuôi dưỡng (Score < 50)', count: coldScoreCount, color: '#64748b' }
        ].filter(item => item.count > 0);

        const closedDeals = totalWonCount + totalLostCount;
        const winRate = closedDeals > 0 ? Math.round((totalWonCount / closedDeals) * 100) : 0;
        const avgScore = scoredCount > 0 ? Math.round(totalScore / scoredCount) : 0;

        return {
            totalLeads,
            activePipelineValue,
            wonValue,
            totalWonCount,
            totalLostCount,
            winRate,
            avgScore,
            funnelData,
            sourceData,
            scoreTierData
        };
    }, [leads]);

    if (!isMounted) return null;

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs overflow-hidden transition-all duration-300">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-2xs">
                        <Target className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Phân Tích Phễu Cơ Hội &amp; Tỷ Lệ Chốt Hợp Đồng (Sales Pipeline)</span>
                            <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                                {stats.totalLeads} cơ hội
                            </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 hidden sm:block">
                            Theo dõi giá trị luân chuyển qua từng giai đoạn và tỷ lệ chuyển đổi chốt deal thực tế
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* View Switcher */}
                    {!isCollapsed && (
                        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-[11px] font-bold">
                            <button
                                type="button"
                                onClick={() => setDonutMode('SCORE')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    donutMode === 'SCORE'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Điểm Tiềm Năng
                            </button>
                            <button
                                type="button"
                                onClick={() => setDonutMode('SOURCE')}
                                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                    donutMode === 'SOURCE'
                                        ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                Nguồn Dẫn
                            </button>
                        </div>
                    )}

                    {/* Collapse Button */}
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                        title={isCollapsed ? 'Mở rộng biểu đồ' : 'Thu gọn biểu đồ'}
                    >
                        {isCollapsed ? (
                            <>
                                <span>Xem Biểu Đồ</span>
                                <ChevronDown className="w-3.5 h-3.5" />
                            </>
                        ) : (
                            <>
                                <span>Thu Gọn</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible Chart Body */}
            {!isCollapsed && (
                <div className="p-4 sm:p-5 space-y-4">
                    {/* KPI Quick Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40">
                            <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                                <Target className="w-3 h-3" />
                                Pipeline Đang Mở
                            </span>
                            <div className="text-base sm:text-lg font-black font-mono text-indigo-900 dark:text-indigo-200 mt-0.5">
                                {formatVND(stats.activePipelineValue)}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <Award className="w-3 h-3" />
                                Doanh Thu Đã Chốt
                            </span>
                            <div className="text-base sm:text-lg font-black font-mono text-emerald-900 dark:text-emerald-200 mt-0.5">
                                {formatVND(stats.wonValue)}
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                            <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                Tỷ Lệ Thắng (Win Rate)
                            </span>
                            <div className="text-base sm:text-lg font-black font-mono text-amber-900 dark:text-amber-200 mt-0.5 flex items-baseline gap-1.5">
                                <span>{stats.winRate}%</span>
                                <span className="text-[10px] font-normal text-slate-500">
                                    ({stats.totalWonCount} Thắng / {stats.totalLostCount} Thua)
                                </span>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-500" />
                                Điểm Tiềm Năng TB
                            </span>
                            <div className="text-base sm:text-lg font-black font-mono text-slate-800 dark:text-slate-100 mt-0.5 flex items-baseline gap-1.5">
                                <span>{stats.avgScore}</span>
                                <span className="text-[10px] font-normal text-slate-400">/ 100 điểm AI</span>
                            </div>
                        </div>
                    </div>

                    {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* CHART 1 (7 Cols): Phễu Cơ Hội & Giá Trị Từng Giai Đoạn */}
                        <div className="lg:col-span-7 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-emerald-600" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        Phân Bổ Cơ Hội Theo Giai Đoạn (Pipeline Funnel)
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Số lượng (cột)
                                    </span>
                                    <span className="flex items-center gap-1 text-indigo-600">
                                        <span className="w-2.5 h-1 rounded-sm bg-indigo-500 inline-block" /> Giá trị (đường)
                                    </span>
                                </div>
                            </div>

                            <div className="h-56 sm:h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={stats.funnelData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.6} />
                                        <XAxis 
                                            dataKey="label" 
                                            tick={{ fontSize: 10, fill: '#64748b' }} 
                                            axisLine={{ stroke: '#cbd5e1' }}
                                            tickLine={false}
                                        />
                                        <YAxis 
                                            yAxisId="left"
                                            tick={{ fontSize: 10, fill: '#64748b' }} 
                                            allowDecimals={false}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <YAxis 
                                            yAxisId="right"
                                            orientation="right"
                                            tick={{ fontSize: 9, fill: '#64748b' }} 
                                            tickFormatter={val => formatShortVND(val)}
                                            axisLine={false}
                                            tickLine={false}
                                        />
                                        <Tooltip
                                            content={({ active, payload, label }) => {
                                                if (!active || !payload || !payload.length) return null;
                                                const d = payload[0].payload;
                                                return (
                                                    <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-xl border border-slate-700">
                                                        <div className="font-bold flex items-center gap-1.5" style={{ color: d.color }}>
                                                            <span>{d.label}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3 text-slate-300">
                                                            <span>Số cơ hội:</span>
                                                            <span className="font-bold font-mono">{d.count} cơ hội</span>
                                                        </div>
                                                        <div className="flex items-center justify-between gap-3 text-amber-300 font-bold border-t border-slate-800 pt-1">
                                                            <span>Giá trị dự kiến:</span>
                                                            <span className="font-mono">{formatVND(d.value)}</span>
                                                        </div>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar yAxisId="left" dataKey="count" radius={[6, 6, 0, 0]} barSize={28}>
                                            {stats.funnelData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                        <Line yAxisId="right" type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3, fill: '#6366f1' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART 2 (5 Cols): Phân Bổ Theo Điểm Tiềm Năng Hoặc Nguồn Dẫn */}
                        <div className="lg:col-span-5 p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                                <div className="flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-blue-600" />
                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                        {donutMode === 'SCORE' ? 'Phân Tầng Điểm Tiềm Năng' : 'Top Nguồn Cơ Hội Bán Hàng'}
                                    </span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-semibold">
                                    {donutMode === 'SCORE' ? `${stats.scoreTierData.length} phân khúc` : `${stats.sourceData.length} nguồn`}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                {/* Donut Pie */}
                                <div className="sm:col-span-6 h-48 sm:h-56 relative flex items-center justify-center">
                                    {donutMode === 'SCORE' ? (
                                        stats.scoreTierData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.scoreTierData}
                                                        innerRadius={46}
                                                        outerRadius={68}
                                                        paddingAngle={3}
                                                        dataKey="count"
                                                    >
                                                        {stats.scoreTierData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload || !payload.length) return null;
                                                            const p = payload[0].payload;
                                                            const pct = stats.totalLeads > 0 ? Math.round((p.count / stats.totalLeads) * 100) : 0;
                                                            return (
                                                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700">
                                                                    <div className="font-bold" style={{ color: p.color }}>{p.name}</div>
                                                                    <div>Số lượng: <span className="font-bold font-mono">{p.count} cơ hội</span> ({pct}%)</div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Chưa có dữ liệu</div>
                                        )
                                    ) : (
                                        stats.sourceData.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.sourceData}
                                                        innerRadius={46}
                                                        outerRadius={68}
                                                        paddingAngle={3}
                                                        dataKey="count"
                                                    >
                                                        {stats.sourceData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        content={({ active, payload }) => {
                                                            if (!active || !payload || !payload.length) return null;
                                                            const p = payload[0].payload;
                                                            const pct = stats.totalLeads > 0 ? Math.round((p.count / stats.totalLeads) * 100) : 0;
                                                            return (
                                                                <div className="bg-slate-900 text-white p-2.5 rounded-xl text-xs space-y-1 shadow-lg border border-slate-700">
                                                                    <div className="font-bold" style={{ color: p.color }}>{p.name}</div>
                                                                    <div>Số lượng: <span className="font-bold font-mono">{p.count}</span> ({pct}%)</div>
                                                                    <div className="text-amber-300 font-mono text-[11px]">Giá trị: {formatVND(p.value)}</div>
                                                                </div>
                                                            );
                                                        }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic">Chưa có dữ liệu</div>
                                        )
                                    )}

                                    {/* Donut Center Label */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-[10px] uppercase font-bold text-slate-400">Win Rate</span>
                                        <span className="text-base font-black font-mono text-emerald-600">
                                            {stats.winRate}%
                                        </span>
                                    </div>
                                </div>

                                {/* Legend List */}
                                <div className="sm:col-span-6 space-y-1.5 text-xs">
                                    {(donutMode === 'SCORE' ? stats.scoreTierData : stats.sourceData).map((item, idx) => {
                                        const pct = stats.totalLeads > 0 ? Math.round((item.count / stats.totalLeads) * 100) : 0;
                                        return (
                                            <div key={idx} className="p-2 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 min-w-0 pr-1">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                    <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200 truncate">
                                                        {item.name}
                                                    </span>
                                                </div>
                                                <span className="font-mono font-bold text-[11px] text-slate-700 dark:text-slate-300 shrink-0">
                                                    {item.count} ({pct}%)
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

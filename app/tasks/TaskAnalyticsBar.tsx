'use client';

import React, { useState, useMemo } from 'react';
import {
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Tooltip,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid
} from 'recharts';
import {
    CheckCircle2,
    Clock,
    AlertTriangle,
    Users,
    ChevronUp,
    ChevronDown,
    TrendingUp,
    Layers,
    Briefcase,
    Zap,
    Sparkles,
    ShieldAlert
} from 'lucide-react';

interface TaskAnalyticsBarProps {
    tasks: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    DONE: { label: 'Hoàn thành', color: '#10b981', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    IN_PROGRESS: { label: 'Đang làm', color: '#3b82f6', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    TODO: { label: 'Cần làm', color: '#f59e0b', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    REVIEW: { label: 'Chờ duyệt', color: '#0ea5e9', bg: 'bg-sky-50 text-sky-700 border-sky-200' },
    PAUSED: { label: 'Tạm ngưng', color: '#eab308', bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    OVERDUE: { label: 'Quá hạn', color: '#ef4444', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    CANCELLED: { label: 'Đã hủy', color: '#94a3b8', bg: 'bg-slate-50 text-slate-600 border-slate-200' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; text: string }> = {
    URGENT: { label: 'Khẩn cấp', color: '#ef4444', bg: 'bg-rose-500', text: 'text-rose-700' },
    HIGH: { label: 'Mức cao', color: '#f97316', bg: 'bg-orange-500', text: 'text-orange-700' },
    MEDIUM: { label: 'Trung bình', color: '#3b82f6', bg: 'bg-blue-500', text: 'text-blue-700' },
    LOW: { label: 'Mức thấp', color: '#94a3b8', bg: 'bg-slate-400', text: 'text-slate-600' },
};

export function TaskAnalyticsBar({ tasks = [] }: TaskAnalyticsBarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Compute metrics
    const metrics = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        let todoCount = 0;
        let inProgressCount = 0;
        let reviewCount = 0;
        let doneCount = 0;
        let overdueCount = 0;
        let pausedCount = 0;
        let totalActive = 0;

        const priorityCounts: Record<string, number> = {
            URGENT: 0,
            HIGH: 0,
            MEDIUM: 0,
            LOW: 0,
        };

        const assigneeMap = new Map<string, { name: string; avatar?: string; total: number; done: number; active: number }>();

        tasks.forEach((t: any) => {
            const st = t.status || 'TODO';
            if (st === 'TODO') todoCount++;
            else if (st === 'IN_PROGRESS') inProgressCount++;
            else if (st === 'REVIEW') reviewCount++;
            else if (st === 'DONE') doneCount++;
            else if (st === 'PAUSED') pausedCount++;

            if (st !== 'DONE' && st !== 'CANCELLED') {
                totalActive++;
            }

            // Check overdue
            if (t.dueDate && st !== 'DONE' && st !== 'CANCELLED') {
                const due = new Date(t.dueDate);
                due.setHours(0, 0, 0, 0);
                if (due < now) {
                    overdueCount++;
                }
            }

            // Priority
            const p = t.priority || 'MEDIUM';
            if (priorityCounts[p] !== undefined) {
                priorityCounts[p]++;
            }

            // Assignees
            if (t.assignees && t.assignees.length > 0) {
                t.assignees.forEach((a: any) => {
                    const u = a.user;
                    if (u && u.id) {
                        if (!assigneeMap.has(u.id)) {
                            assigneeMap.set(u.id, {
                                name: u.name || u.email || 'Thành viên',
                                avatar: u.avatar,
                                total: 0,
                                done: 0,
                                active: 0,
                            });
                        }
                        const entry = assigneeMap.get(u.id)!;
                        entry.total++;
                        if (st === 'DONE') entry.done++;
                        else if (st !== 'CANCELLED') entry.active++;
                    }
                });
            }
        });

        const totalTasks = tasks.length;
        const completionRate = totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0;

        // Assignee workload chart items
        const workloadItems = Array.from(assigneeMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 5)
            .map(a => ({
                name: a.name.length > 15 ? a.name.substring(0, 14) + '...' : a.name,
                fullName: a.name,
                total: a.total,
                done: a.done,
                active: a.active,
            }));

        // Status Donut items
        const donutItems = [
            { name: 'Hoàn thành', value: doneCount, color: '#10b981' },
            { name: 'Đang làm', value: inProgressCount, color: '#3b82f6' },
            { name: 'Cần làm', value: todoCount, color: '#f59e0b' },
            { name: 'Chờ duyệt', value: reviewCount, color: '#0ea5e9' },
            { name: 'Quá hạn', value: overdueCount, color: '#ef4444' },
        ].filter(d => d.value > 0);

        return {
            totalTasks,
            totalActive,
            doneCount,
            overdueCount,
            completionRate,
            priorityCounts,
            workloadItems,
            donutItems,
        };
    }, [tasks]);

    return (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all overflow-hidden mb-5">
            {/* Header with Title & Collapse Toggle */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-emerald-50/30">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                        <TrendingUp size={16} strokeWidth={2.5} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight leading-tight">
                                Phân Tích Tiến Độ & Khối Lượng Công Việc (BI Tasks)
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {metrics.totalTasks} Công việc
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer"
                    >
                        {isCollapsed ? (
                            <>
                                <ChevronDown size={14} />
                                <span>Mở rộng biểu đồ</span>
                            </>
                        ) : (
                            <>
                                <ChevronUp size={14} />
                                <span>Thu gọn</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Collapsible Content */}
            {!isCollapsed && (
                <div className="p-4 sm:p-5 space-y-5 animate-in fade-in duration-200">
                    {/* Top 4 KPI Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* KPI 1: Total Tasks */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200/80 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                                    Tổng công việc
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-xl font-black text-slate-900 font-mono">
                                        {metrics.totalTasks}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium">({metrics.totalActive} đang xử lý)</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                <Briefcase size={18} />
                            </div>
                        </div>

                        {/* KPI 2: Completion Rate */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200/70 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                                    Tỷ lệ hoàn tất
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-xl font-black text-emerald-800 font-mono">
                                        {metrics.completionRate.toFixed(1)}%
                                    </span>
                                    <span className="text-[10px] text-emerald-600 font-medium">({metrics.doneCount} xong)</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                <CheckCircle2 size={18} />
                            </div>
                        </div>

                        {/* KPI 3: Overdue Alert */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-50/60 to-white border border-rose-200/70 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider block">
                                    Quá hạn cần xử lý
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-xl font-black text-rose-700 font-mono">
                                        {metrics.overdueCount}
                                    </span>
                                    <span className="text-[10px] text-rose-500 font-medium">việc quá deadline</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                                <AlertTriangle size={18} />
                            </div>
                        </div>

                        {/* KPI 4: Urgent & High Priorities */}
                        <div className="p-3.5 rounded-xl bg-gradient-to-br from-amber-50/60 to-white border border-amber-200/70 flex items-center justify-between">
                            <div>
                                <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
                                    Ưu tiên Khẩn & Cao
                                </span>
                                <div className="flex items-baseline gap-1.5 mt-0.5">
                                    <span className="text-xl font-black text-amber-900 font-mono">
                                        {metrics.priorityCounts.URGENT + metrics.priorityCounts.HIGH}
                                    </span>
                                    <span className="text-[10px] text-amber-700 font-medium">({metrics.priorityCounts.URGENT} khẩn cấp)</span>
                                </div>
                            </div>
                            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                                <Zap size={18} />
                            </div>
                        </div>
                    </div>

                    {/* Split View: Recharts Donut (Status) + Workload BarChart */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                        {/* Chart 1: Status Donut Chart (5 Cols) */}
                        <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Layers size={14} className="text-emerald-600" />
                                    Cơ Cấu Trạng Thái Công Việc
                                </span>
                                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                                    {metrics.doneCount}/{metrics.totalTasks} Xong
                                </span>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-2">
                                {/* Donut */}
                                <div className="relative w-[180px] h-[170px] shrink-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={metrics.donutItems}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={3}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {metrics.donutItems.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: '10px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '11px',
                                                    padding: '8px 12px'
                                                }}
                                                formatter={(val: any, _name: any, item: any) => [
                                                    `${val} công việc`,
                                                    item.payload.name
                                                ]}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-[9px] text-slate-400 font-bold uppercase">Hoàn tất</span>
                                        <span className="text-base font-black text-emerald-700 font-mono">
                                            {metrics.completionRate.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Legend Pills */}
                                <div className="flex-1 space-y-1.5 w-full">
                                    {metrics.donutItems.map((item, idx) => {
                                        const share = metrics.totalTasks > 0 ? (item.value / metrics.totalTasks) * 100 : 0;
                                        return (
                                            <div
                                                key={idx}
                                                className="p-1.5 px-2.5 rounded-lg bg-white border border-slate-200/70 flex items-center justify-between text-xs"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                    <span className="font-medium text-slate-700 text-[11px]">{item.name}</span>
                                                </div>
                                                <span className="font-mono font-bold text-slate-900 text-[11px]">
                                                    {item.value} <span className="text-slate-400 font-normal">({share.toFixed(0)}%)</span>
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Chart 2: Workload BarChart by Assignee (7 Cols) */}
                        <div className="lg:col-span-7 bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 flex flex-col justify-between">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Users size={14} className="text-blue-600" />
                                    Khối Lượng Công Việc Theo Nhân Sự (Top 5)
                                </span>
                                <span className="text-[11px] font-medium text-slate-400">Đơn vị: Việc</span>
                            </div>

                            {metrics.workloadItems.length === 0 ? (
                                <div className="flex-1 flex items-center justify-center text-xs text-slate-400 py-10">
                                    Chưa có dữ liệu phân công nhân sự.
                                </div>
                            ) : (
                                <div className="w-full flex-1" style={{ minHeight: '180px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            layout="vertical"
                                            data={metrics.workloadItems}
                                            margin={{ top: 5, right: 25, left: 10, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                            <XAxis
                                                type="number"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#64748b', fontSize: 11 }}
                                            />
                                            <YAxis
                                                type="category"
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#1e293b', fontSize: 11, fontWeight: 600 }}
                                                width={95}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#ffffff',
                                                    borderRadius: '10px',
                                                    border: '1px solid #cbd5e1',
                                                    fontSize: '11px',
                                                    padding: '8px 12px'
                                                }}
                                                formatter={(val: any, _name: any, item: any) => [
                                                    `${val} việc (${item.payload.done} xong, ${item.payload.active} đang làm)`,
                                                    item.payload.fullName
                                                ]}
                                            />
                                            <Bar
                                                dataKey="total"
                                                radius={[0, 6, 6, 0]}
                                                maxBarSize={22}
                                                fill="#3b82f6"
                                            >
                                                {metrics.workloadItems.map((_, index) => {
                                                    const colors = ['#2563eb', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'];
                                                    return (
                                                        <Cell key={`cell-${index}`} fill={colors[index] || '#3b82f6'} />
                                                    );
                                                })}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

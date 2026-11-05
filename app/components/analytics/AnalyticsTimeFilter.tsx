'use client';

import React from 'react';
import { Calendar, ChevronDown, Filter } from 'lucide-react';

export type TimeFilterMode = 'YEAR' | 'MONTH' | 'PERIOD';

export interface TimeFilterValue {
    mode: TimeFilterMode; // 'YEAR' | 'MONTH' | 'PERIOD'
    type?: TimeFilterMode; // alias for mode
    year: number;         // e.g. 2026
    month: number;        // 1 - 12
    period: 'ALL' | 'LAST_30' | 'LAST_90' | 'Q1' | 'Q2' | 'Q3' | 'Q4';
}

export const defaultTimeFilterValue: TimeFilterValue = {
    mode: 'YEAR',
    type: 'YEAR',
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    period: 'ALL'
};

/**
 * Kiểm tra 1 ngày có khớp với bộ lọc thời gian hay không
 */
export function matchTimeFilter(
    rawDate: Date | string | number | null | undefined,
    filter: TimeFilterValue
): boolean {
    if (!rawDate) return false;
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return false;

    if (filter.mode === 'YEAR') {
        return d.getFullYear() === filter.year;
    }

    if (filter.mode === 'MONTH') {
        return d.getFullYear() === filter.year && (d.getMonth() + 1) === filter.month;
    }

    if (filter.mode === 'PERIOD') {
        if (filter.period === 'ALL') return true;

        const now = new Date();
        if (filter.period === 'LAST_30') {
            const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return d >= past30 && d <= now;
        }
        if (filter.period === 'LAST_90') {
            const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            return d >= past90 && d <= now;
        }

        const itemYear = d.getFullYear();
        const itemMonth = d.getMonth(); // 0 to 11
        if (itemYear !== filter.year) return false;

        if (filter.period === 'Q1') return itemMonth >= 0 && itemMonth <= 2;
        if (filter.period === 'Q2') return itemMonth >= 3 && itemMonth <= 5;
        if (filter.period === 'Q3') return itemMonth >= 6 && itemMonth <= 8;
        if (filter.period === 'Q4') return itemMonth >= 9 && itemMonth <= 11;
    }

    return true;
}

/**
 * Trả về nhãn mô tả thời gian đang lọc (VD: "Năm 2026", "Tháng 11/2026", "Quý 4/2026")
 */
export function getTimeFilterLabel(filter: TimeFilterValue): string {
    if (filter.mode === 'YEAR') {
        return `Năm ${filter.year}`;
    }
    if (filter.mode === 'MONTH') {
        return `Tháng ${filter.month}/${filter.year}`;
    }
    if (filter.mode === 'PERIOD') {
        switch (filter.period) {
            case 'LAST_30': return '30 ngày qua';
            case 'LAST_90': return '90 ngày qua';
            case 'Q1': return `Quý 1/${filter.year}`;
            case 'Q2': return `Quý 2/${filter.year}`;
            case 'Q3': return `Quý 3/${filter.year}`;
            case 'Q4': return `Quý 4/${filter.year}`;
            case 'ALL': return 'Toàn bộ thời gian';
            default: return 'Giai đoạn';
        }
    }
    return 'Năm nay';
}

interface AnalyticsTimeFilterProps {
    value: TimeFilterValue;
    onChange: (val: TimeFilterValue) => void;
    availableYears?: number[];
    className?: string;
    compact?: boolean;
}

export function AnalyticsTimeFilter({
    value,
    onChange,
    availableYears = [2027, 2026, 2025, 2024, 2023],
    className = '',
    compact = false
}: AnalyticsTimeFilterProps) {
    const currentYear = new Date().getFullYear();
    const years = availableYears.includes(currentYear)
        ? availableYears
        : [currentYear, ...availableYears].sort((a, b) => b - a);

    return (
        <div className={`inline-flex items-center gap-1.5 flex-wrap p-1 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs ${className}`}>
            {/* Mode Selector (Pills) */}
            <div className="inline-flex items-center p-0.5 bg-white dark:bg-slate-900 rounded-lg shadow-2xs text-[11px] font-bold">
                <button
                    type="button"
                    onClick={() => onChange({ ...value, mode: 'YEAR' })}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        value.mode === 'YEAR'
                            ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Lọc thống kê theo Năm (Mặc định)"
                >
                    Năm
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ ...value, mode: 'MONTH' })}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        value.mode === 'MONTH'
                            ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Lọc thống kê theo Tháng cụ thể"
                >
                    Tháng
                </button>
                <button
                    type="button"
                    onClick={() => onChange({ ...value, mode: 'PERIOD' })}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        value.mode === 'PERIOD'
                            ? 'bg-emerald-600 text-white shadow-2xs font-bold'
                            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    title="Lọc thống kê theo Giai đoạn (Quý / 30 ngày / Toàn bộ)"
                >
                    Giai đoạn
                </button>
            </div>

            {/* Dynamic Secondary Selectors */}
            {value.mode === 'YEAR' && (
                <div className="relative">
                    <select
                        value={value.year}
                        onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
                        className="appearance-none pl-2.5 pr-6 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                        {years.map(y => (
                            <option key={y} value={y}>Năm {y}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
                </div>
            )}

            {value.mode === 'MONTH' && (
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <select
                            value={value.month}
                            onChange={(e) => onChange({ ...value, month: Number(e.target.value) })}
                            className="appearance-none pl-2.5 pr-6 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                <option key={m} value={m}>Tháng {m}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
                    </div>

                    <div className="relative">
                        <select
                            value={value.year}
                            onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
                            className="appearance-none pl-2.5 pr-6 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
                    </div>
                </div>
            )}

            {value.mode === 'PERIOD' && (
                <div className="flex items-center gap-1">
                    <div className="relative">
                        <select
                            value={value.period}
                            onChange={(e) => onChange({ ...value, period: e.target.value as any })}
                            className="appearance-none pl-2.5 pr-6 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg shadow-2xs focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        >
                            <option value="LAST_30">30 ngày qua</option>
                            <option value="LAST_90">90 ngày qua</option>
                            <option value="Q1">Quý 1 (T1 - T3)</option>
                            <option value="Q2">Quý 2 (T4 - T6)</option>
                            <option value="Q3">Quý 3 (T7 - T9)</option>
                            <option value="Q4">Quý 4 (T10 - T12)</option>
                            <option value="ALL">Toàn bộ thời gian</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1.5 top-2 pointer-events-none" />
                    </div>

                    {['Q1', 'Q2', 'Q3', 'Q4'].includes(value.period) && (
                        <div className="relative">
                            <select
                                value={value.year}
                                onChange={(e) => onChange({ ...value, year: Number(e.target.value) })}
                                className="appearance-none pl-2 pr-5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 rounded-lg shadow-2xs focus:outline-none cursor-pointer"
                            >
                                {years.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1 top-2 pointer-events-none" />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Check,
    Sliders,
    Layers,
    CalendarRange,
    Clock
} from 'lucide-react';

export type PeriodMode = 'month' | 'quarter' | 'year' | 'custom' | 'all';

export interface PeriodFilterState {
    mode: PeriodMode;
    startDate: Date | null;
    endDate: Date | null;
    label: string;
    shortLabel: string;
    year: number;
    month?: number; // 0-indexed (0 = T1, 11 = T12)
    quarter?: number; // 1-indexed (1..4)
    customStartDate?: string; // YYYY-MM-DD
    customEndDate?: string;   // YYYY-MM-DD
}

export function getDefaultPeriodFilter(): PeriodFilterState {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    return getMonthPeriod(year, month);
}

export function getMonthPeriod(year: number, month: number): PeriodFilterState {
    const now = new Date();
    const isCurrent = now.getFullYear() === year && now.getMonth() === month;
    const isLastMonth = (now.getMonth() === 0
        ? (year === now.getFullYear() - 1 && month === 11)
        : (year === now.getFullYear() && month === now.getMonth() - 1));

    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    let label = `Tháng ${month + 1}/${year}`;
    if (isCurrent) label = `Tháng này (${month + 1}/${year})`;
    else if (isLastMonth) label = `Tháng trước (${month + 1}/${year})`;

    return {
        mode: 'month',
        startDate,
        endDate,
        label,
        shortLabel: `T${month + 1}/${year}`,
        year,
        month,
    };
}

export function getQuarterPeriod(year: number, quarter: number): PeriodFilterState {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const isCurrent = now.getFullYear() === year && currentQuarter === quarter;

    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1, 0, 0, 0, 0);
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);

    const label = isCurrent ? `Quý này (Q${quarter}/${year})` : `Quý ${quarter}/${year}`;

    return {
        mode: 'quarter',
        startDate,
        endDate,
        label,
        shortLabel: `Q${quarter}/${year}`,
        year,
        quarter,
    };
}

export function getYearPeriod(year: number): PeriodFilterState {
    const now = new Date();
    const isCurrent = now.getFullYear() === year;

    const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

    const label = isCurrent ? `Năm nay (${year})` : `Năm ${year}`;

    return {
        mode: 'year',
        startDate,
        endDate,
        label,
        shortLabel: `${year}`,
        year,
    };
}

export function getCustomPeriod(startStr: string, endStr: string): PeriodFilterState {
    const start = startStr ? new Date(`${startStr}T00:00:00`) : null;
    const end = endStr ? new Date(`${endStr}T23:59:59.999`) : null;

    const formatVn = (d: Date) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = d.getFullYear();
        return `${dd}/${mm}/${yy}`;
    };

    let label = 'Tùy chọn';
    let shortLabel = 'Tùy chọn';
    if (start && end) {
        label = `${formatVn(start)} - ${formatVn(end)}`;
        shortLabel = `${formatVn(start)} - ${formatVn(end)}`;
    } else if (start) {
        label = `Từ ${formatVn(start)}`;
        shortLabel = `Từ ${formatVn(start)}`;
    } else if (end) {
        label = `Đến ${formatVn(end)}`;
        shortLabel = `Đến ${formatVn(end)}`;
    }

    return {
        mode: 'custom',
        startDate: start,
        endDate: end,
        label,
        shortLabel,
        year: start ? start.getFullYear() : new Date().getFullYear(),
        customStartDate: startStr,
        customEndDate: endStr,
    };
}

export function getAllPeriod(): PeriodFilterState {
    return {
        mode: 'all',
        startDate: null,
        endDate: null,
        label: 'Tất cả thời gian',
        shortLabel: 'Tất cả',
        year: new Date().getFullYear(),
    };
}

export function isItemInPeriod(dateValue: string | Date | null | undefined, filter: PeriodFilterState): boolean {
    if (!filter || filter.mode === 'all') return true;
    if (!dateValue) return false;

    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return false;

    if (filter.startDate && d < filter.startDate) return false;
    if (filter.endDate && d > filter.endDate) return false;

    return true;
}

interface DashboardPeriodFilterProps {
    value: PeriodFilterState;
    onChange: (value: PeriodFilterState) => void;
    align?: 'left' | 'right';
    buttonClassName?: string;
    compact?: boolean;
}

export function DashboardPeriodFilter({
    value,
    onChange,
    align = 'right',
    buttonClassName = '',
    compact = false,
}: DashboardPeriodFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'month' | 'quarter' | 'year' | 'custom'>(() => {
        return value.mode === 'all' ? 'month' : value.mode;
    });

    // Internal navigation year for month / quarter selector
    const [browseYear, setBrowseYear] = useState<number>(() => value.year || new Date().getFullYear());

    // Custom date range inputs
    const [customStart, setCustomStart] = useState<string>(value.customStartDate || '');
    const [customEnd, setCustomEnd] = useState<string>(value.customEndDate || '');

    const popoverRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Sync tab and browse year when value changes from outside
    useEffect(() => {
        if (value.mode !== 'all') {
            setActiveTab(value.mode);
        }
        if (value.year) {
            setBrowseYear(value.year);
        }
        if (value.customStartDate) setCustomStart(value.customStartDate);
        if (value.customEndDate) setCustomEnd(value.customEndDate);
    }, [value]);

    // Close when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                popoverRef.current &&
                !popoverRef.current.contains(event.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentQuarter = Math.floor(currentMonth / 3) + 1;

    // Quick select month
    const handleSelectMonth = (m: number) => {
        onChange(getMonthPeriod(browseYear, m));
        setIsOpen(false);
    };

    // Quick select quarter
    const handleSelectQuarter = (q: number) => {
        onChange(getQuarterPeriod(browseYear, q));
        setIsOpen(false);
    };

    // Quick select year
    const handleSelectYear = (y: number) => {
        onChange(getYearPeriod(y));
        setIsOpen(false);
    };

    // Apply custom range
    const handleApplyCustom = () => {
        if (!customStart && !customEnd) return;
        onChange(getCustomPeriod(customStart, customEnd));
        setIsOpen(false);
    };

    // Reset to default (Current month)
    const handleResetDefault = () => {
        onChange(getDefaultPeriodFilter());
        setBrowseYear(currentYear);
        setIsOpen(false);
    };

    // Select all time
    const handleSelectAll = () => {
        onChange(getAllPeriod());
        setIsOpen(false);
    };

    const isCurrentMonthActive =
        value.mode === 'month' && value.year === currentYear && value.month === currentMonth;

    return (
        <div className="relative inline-block text-left">
            {/* Trigger Button */}
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-2xs ${
                    isOpen
                        ? 'bg-blue-50 text-blue-800 border-blue-300 ring-2 ring-blue-400/20'
                        : isCurrentMonthActive
                        ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        : 'bg-blue-50 text-blue-700 border-blue-200/80 hover:bg-blue-100/70'
                } ${buttonClassName}`}
                title="Chọn giai đoạn thời gian (Tháng, Quý, Năm, Tùy chọn)"
            >
                <CalendarIcon size={13} className={isCurrentMonthActive ? 'text-slate-500' : 'text-blue-600'} />
                <span className="whitespace-nowrap font-bold">
                    {compact ? value.shortLabel : value.label}
                </span>
                <ChevronDown
                    size={13}
                    className={`transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'
                    }`}
                />
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div
                    ref={popoverRef}
                    className={`absolute z-50 mt-1.5 w-[320px] sm:w-[350px] bg-white rounded-2xl border border-slate-200 shadow-xl p-3.5 text-slate-800 animate-in fade-in zoom-in-95 duration-150 ${
                        align === 'right' ? 'right-0' : 'left-0'
                    }`}
                >
                    {/* Mode Navigation Tabs */}
                    <div className="flex items-center bg-slate-100/90 p-1 rounded-xl gap-1 mb-3 border border-slate-200/60">
                        <button
                            type="button"
                            onClick={() => setActiveTab('month')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                activeTab === 'month'
                                    ? 'bg-white text-blue-700 shadow-2xs border border-blue-200/60'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <CalendarIcon size={12} />
                            <span>Tháng</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('quarter')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                activeTab === 'quarter'
                                    ? 'bg-white text-blue-700 shadow-2xs border border-blue-200/60'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Layers size={12} />
                            <span>Quý</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('year')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                activeTab === 'year'
                                    ? 'bg-white text-blue-700 shadow-2xs border border-blue-200/60'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <CalendarRange size={12} />
                            <span>Năm</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('custom')}
                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                activeTab === 'custom'
                                    ? 'bg-white text-blue-700 shadow-2xs border border-blue-200/60'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            <Sliders size={12} />
                            <span>Tự chọn</span>
                        </button>
                    </div>

                    {/* Tab 1: THEO THÁNG */}
                    {activeTab === 'month' && (
                        <div className="space-y-3">
                            {/* Quick Presets */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBrowseYear(currentYear);
                                        handleSelectMonth(currentMonth);
                                    }}
                                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                                        value.mode === 'month' && value.year === currentYear && value.month === currentMonth
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    Tháng này (T{currentMonth + 1})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
                                        const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
                                        setBrowseYear(prevY);
                                        onChange(getMonthPeriod(prevY, prevM));
                                        setIsOpen(false);
                                    }}
                                    className="flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-all"
                                >
                                    Tháng trước
                                </button>
                            </div>

                            {/* Year Stepper */}
                            <div className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded-xl border border-slate-200/70">
                                <button
                                    type="button"
                                    onClick={() => setBrowseYear(y => y - 1)}
                                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                                    title="Năm trước"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-bold text-slate-800">
                                    Năm {browseYear}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setBrowseYear(y => y + 1)}
                                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                                    title="Năm sau"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* 12 Months Grid */}
                            <div className="grid grid-cols-4 gap-1.5">
                                {Array.from({ length: 12 }, (_, i) => {
                                    const isSelected =
                                        value.mode === 'month' &&
                                        value.year === browseYear &&
                                        value.month === i;
                                    const isCurrent =
                                        browseYear === currentYear && i === currentMonth;

                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => handleSelectMonth(i)}
                                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all relative flex flex-col items-center justify-center border ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                    : isCurrent
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 hover:border-slate-300'
                                            }`}
                                        >
                                            <span>Tháng {i + 1}</span>
                                            {isCurrent && (
                                                <span
                                                    className={`w-1 h-1 rounded-full mt-0.5 ${
                                                        isSelected ? 'bg-white' : 'bg-blue-600'
                                                    }`}
                                                />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tab 2: THEO QUÝ */}
                    {activeTab === 'quarter' && (
                        <div className="space-y-3">
                            {/* Quick Preset */}
                            <button
                                type="button"
                                onClick={() => {
                                    setBrowseYear(currentYear);
                                    handleSelectQuarter(currentQuarter);
                                }}
                                className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all text-center ${
                                    value.mode === 'quarter' && value.year === currentYear && value.quarter === currentQuarter
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                            >
                                Quý này (Quý {currentQuarter}/{currentYear})
                            </button>

                            {/* Year Stepper */}
                            <div className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded-xl border border-slate-200/70">
                                <button
                                    type="button"
                                    onClick={() => setBrowseYear(y => y - 1)}
                                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-bold text-slate-800">
                                    Năm {browseYear}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setBrowseYear(y => y + 1)}
                                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            {/* 4 Quarters Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { q: 1, label: 'Quý 1', sub: 'Tháng 1 - Tháng 3' },
                                    { q: 2, label: 'Quý 2', sub: 'Tháng 4 - Tháng 6' },
                                    { q: 3, label: 'Quý 3', sub: 'Tháng 7 - Tháng 9' },
                                    { q: 4, label: 'Quý 4', sub: 'Tháng 10 - Tháng 12' },
                                ].map(({ q, label, sub }) => {
                                    const isSelected =
                                        value.mode === 'quarter' &&
                                        value.year === browseYear &&
                                        value.quarter === q;
                                    const isCurrent =
                                        browseYear === currentYear && q === currentQuarter;

                                    return (
                                        <button
                                            key={q}
                                            type="button"
                                            onClick={() => handleSelectQuarter(q)}
                                            className={`p-2.5 rounded-xl text-left border transition-all ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                    : isCurrent
                                                    ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-xs">{label}</span>
                                                {isCurrent && (
                                                    <span
                                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                                                            isSelected
                                                                ? 'bg-white/20 text-white'
                                                                : 'bg-blue-100 text-blue-700'
                                                        }`}
                                                    >
                                                        Hiện tại
                                                    </span>
                                                )}
                                            </div>
                                            <span
                                                className={`text-[10px] block mt-0.5 ${
                                                    isSelected ? 'text-blue-100' : 'text-slate-400'
                                                }`}
                                            >
                                                {sub}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tab 3: THEO NĂM */}
                    {activeTab === 'year' && (
                        <div className="space-y-3">
                            {/* Quick Presets */}
                            <div className="flex items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => handleSelectYear(currentYear)}
                                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                                        value.mode === 'year' && value.year === currentYear
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    Năm nay ({currentYear})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSelectYear(currentYear - 1)}
                                    className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-all ${
                                        value.mode === 'year' && value.year === currentYear - 1
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                                    }`}
                                >
                                    Năm trước ({currentYear - 1})
                                </button>
                            </div>

                            {/* Years List */}
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    currentYear - 3,
                                    currentYear - 2,
                                    currentYear - 1,
                                    currentYear,
                                    currentYear + 1,
                                    currentYear + 2,
                                ].map(y => {
                                    const isSelected = value.mode === 'year' && value.year === y;
                                    const isCurrent = y === currentYear;

                                    return (
                                        <button
                                            key={y}
                                            type="button"
                                            onClick={() => handleSelectYear(y)}
                                            className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                                                isSelected
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                                    : isCurrent
                                                    ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                                                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200/80 hover:border-slate-300'
                                            }`}
                                        >
                                            <span>Năm {y}</span>
                                            {isCurrent && (
                                                <span
                                                    className={`block text-[9px] font-normal ${
                                                        isSelected ? 'text-blue-100' : 'text-blue-600'
                                                    }`}
                                                >
                                                    (Hiện tại)
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tab 4: TỰ CHỌN (CUSTOM DATE RANGE) */}
                    {activeTab === 'custom' && (
                        <div className="space-y-3">
                            <div className="space-y-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                        Từ ngày:
                                    </label>
                                    <input
                                        type="date"
                                        value={customStart}
                                        onChange={e => setCustomStart(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                                        Đến ngày:
                                    </label>
                                    <input
                                        type="date"
                                        value={customEnd}
                                        onChange={e => setCustomEnd(e.target.value)}
                                        className="w-full px-2.5 py-1.5 text-xs font-medium border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={handleApplyCustom}
                                disabled={!customStart && !customEnd}
                                className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white transition-colors shadow-2xs cursor-pointer"
                            >
                                Áp dụng khoảng thời gian
                            </button>
                        </div>
                    )}

                    {/* Popover Footer: Reset & All Time Options */}
                    <div className="pt-2.5 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                            type="button"
                            onClick={handleResetDefault}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-700 transition-colors"
                        >
                            <RotateCcw size={11} />
                            <span>Mặc định (Tháng này)</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold transition-colors ${
                                value.mode === 'all'
                                    ? 'text-blue-600'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {value.mode === 'all' && <Check size={11} />}
                            <span>Tất cả thời gian</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

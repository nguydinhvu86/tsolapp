'use client';

import React from 'react';
import { Calendar, Search, X } from 'lucide-react';

interface PortalQuickDateFilterProps {
    from: string;
    to: string;
    search?: string;
    onFromChange: (val: string) => void;
    onToChange: (val: string) => void;
    onSearchChange?: (val: string) => void;
    onReset: () => void;
    placeholderSearch?: string;
}

export default function PortalQuickDateFilter({
    from,
    to,
    search = '',
    onFromChange,
    onToChange,
    onSearchChange,
    onReset,
    placeholderSearch = 'Tìm kiếm theo mã, từ khóa...'
}: PortalQuickDateFilterProps) {
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const setPreset = (preset: 'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'all') => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        switch (preset) {
            case 'today':
                onFromChange(formatDate(now));
                onToChange(formatDate(now));
                break;
            case 'this_week': {
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
                const monday = new Date(now.setDate(diff));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                onFromChange(formatDate(monday));
                onToChange(formatDate(sunday));
                break;
            }
            case 'this_month': {
                const firstDay = new Date(year, month, 1);
                const lastDay = new Date(year, month + 1, 0);
                onFromChange(formatDate(firstDay));
                onToChange(formatDate(lastDay));
                break;
            }
            case 'last_month': {
                const firstDay = new Date(year, month - 1, 1);
                const lastDay = new Date(year, month, 0);
                onFromChange(formatDate(firstDay));
                onToChange(formatDate(lastDay));
                break;
            }
            case 'this_quarter': {
                const currentQuarter = Math.floor(month / 3);
                const firstDay = new Date(year, currentQuarter * 3, 1);
                const lastDay = new Date(year, (currentQuarter + 1) * 3, 0);
                onFromChange(formatDate(firstDay));
                onToChange(formatDate(lastDay));
                break;
            }
            case 'this_year': {
                const firstDay = new Date(year, 0, 1);
                const lastDay = new Date(year, 11, 31);
                onFromChange(formatDate(firstDay));
                onToChange(formatDate(lastDay));
                break;
            }
            case 'all':
                onFromChange('');
                onToChange('');
                break;
        }
    };

    const hasFilter = Boolean(from || to || search);

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 print:hidden space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                {/* Search Bar */}
                {onSearchChange && (
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder={placeholderSearch}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder-slate-400 transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => onSearchChange('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                )}

                {/* Date Inputs */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-400">Từ:</span>
                        <input
                            type="date"
                            value={from}
                            onChange={(e) => onFromChange(e.target.value)}
                            className="text-xs sm:text-sm bg-transparent border-none text-slate-700 focus:outline-none"
                        />
                    </div>

                    <span className="text-slate-400 font-medium">-</span>

                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500">
                        <Calendar size={14} className="text-slate-400 shrink-0" />
                        <span className="text-xs text-slate-400">Đến:</span>
                        <input
                            type="date"
                            value={to}
                            onChange={(e) => onToChange(e.target.value)}
                            className="text-xs sm:text-sm bg-transparent border-none text-slate-700 focus:outline-none"
                        />
                    </div>

                    {hasFilter && (
                        <button
                            type="button"
                            onClick={onReset}
                            className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors shrink-0 flex items-center gap-1"
                            title="Xóa bộ lọc"
                        >
                            <X size={14} />
                            <span>Xóa lọc</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Quick Filter Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-medium text-slate-600 scrollbar-none pt-1 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider mr-1 shrink-0">Lọc nhanh:</span>
                <button
                    type="button"
                    onClick={() => setPreset('today')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors shrink-0"
                >
                    Hôm nay
                </button>
                <button
                    type="button"
                    onClick={() => setPreset('this_week')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors shrink-0"
                >
                    Tuần này
                </button>
                <button
                    type="button"
                    onClick={() => setPreset('this_month')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors shrink-0"
                >
                    Tháng này
                </button>
                <button
                    type="button"
                    onClick={() => setPreset('last_month')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors shrink-0"
                >
                    Tháng trước
                </button>
                <button
                    type="button"
                    onClick={() => setPreset('this_quarter')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors shrink-0"
                >
                    Quý này
                </button>
                <button
                    type="button"
                    onClick={() => setPreset('this_year')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors shrink-0"
                >
                    Năm nay
                </button>
                <button
                    type="button"
                    onClick={() => setPreset('all')}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                >
                    Tất cả
                </button>
            </div>
        </div>
    );
}

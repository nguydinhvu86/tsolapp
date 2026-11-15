'use client';

import React from 'react';

export interface PageHeaderProps {
    badge?: string;
    category?: string;
    categoryColor?: 'emerald' | 'blue' | 'indigo' | 'amber' | 'purple' | 'slate' | string;
    tagline?: string;
    description?: string;
    title: string;
    count?: number | string;
    itemCount?: number | string;
    itemLabel?: string;
    actions?: React.ReactNode;
    children?: React.ReactNode;
    className?: string;
    variant?: 'card' | 'flat';
}

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; dot: string; countBg: string; countText: string; countBorder: string }> = {
    emerald: {
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
        countBg: 'bg-emerald-100 dark:bg-emerald-900/40',
        countText: 'text-emerald-800 dark:text-emerald-300',
        countBorder: 'border-emerald-300 dark:border-emerald-800'
    },
    blue: {
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-300 dark:border-blue-800',
        dot: 'bg-blue-500',
        countBg: 'bg-blue-100 dark:bg-blue-900/40',
        countText: 'text-blue-800 dark:text-blue-300',
        countBorder: 'border-blue-300 dark:border-blue-800'
    },
    indigo: {
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        text: 'text-indigo-700 dark:text-indigo-400',
        border: 'border-indigo-300 dark:border-indigo-800',
        dot: 'bg-indigo-500',
        countBg: 'bg-indigo-100 dark:bg-indigo-900/40',
        countText: 'text-indigo-800 dark:text-indigo-300',
        countBorder: 'border-indigo-300 dark:border-indigo-800'
    },
    amber: {
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
        countBg: 'bg-amber-100 dark:bg-amber-900/40',
        countText: 'text-amber-800 dark:text-amber-300',
        countBorder: 'border-amber-300 dark:border-amber-800'
    },
    purple: {
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        text: 'text-purple-700 dark:text-purple-400',
        border: 'border-purple-300 dark:border-purple-800',
        dot: 'bg-purple-500',
        countBg: 'bg-purple-100 dark:bg-purple-900/40',
        countText: 'text-purple-800 dark:text-purple-300',
        countBorder: 'border-purple-300 dark:border-purple-800'
    },
    slate: {
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-700 dark:text-slate-300',
        border: 'border-slate-300 dark:border-slate-700',
        dot: 'bg-slate-500',
        countBg: 'bg-slate-100 dark:bg-slate-800',
        countText: 'text-slate-800 dark:text-slate-200',
        countBorder: 'border-slate-300 dark:border-slate-700'
    }
};

/**
 * PageHeader - Thành phần Header chuẩn hóa giao diện cấp cao (Next-Gen ERP Standard)
 * Đảm bảo 100% co - giãn mượt mà và hiển thị hoàn hảo trên mọi thiết bị (Mobile, Tablet, Laptop, 2K/4K).
 */
export function PageHeader({
    badge,
    category,
    categoryColor = 'emerald',
    tagline,
    description,
    title,
    count,
    itemCount,
    itemLabel,
    actions,
    children,
    className = '',
    variant = 'card'
}: PageHeaderProps) {
    const isCard = variant === 'card';
    const displayBadge = badge || category;
    const displayTagline = tagline || description;
    const displayCount = count !== undefined && count !== null ? count : itemCount;
    const theme = COLOR_MAP[categoryColor] || COLOR_MAP.emerald;

    return (
        <div
            className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                isCard
                    ? 'bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs'
                    : 'pb-3 border-b border-slate-200/80 dark:border-slate-800'
            } ${className}`}
        >
            {/* Title & Metadata Area */}
            <div className="min-w-0 flex-1">
                {(displayBadge || displayTagline) && (
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                        {displayBadge && (
                            <span className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[9.5px] sm:text-[10px] font-bold tracking-wider uppercase ${theme.bg} ${theme.text} border ${theme.border} shadow-2xs shrink-0`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} animate-pulse`} />
                                {displayBadge}
                            </span>
                        )}
                        {displayBadge && displayTagline && (
                            <span className="text-slate-300 dark:text-slate-700 text-xs hidden xs:inline">|</span>
                        )}
                        {displayTagline && (
                            <span className="text-[11px] sm:text-xs font-medium sm:font-semibold text-slate-500 dark:text-slate-400 line-clamp-1 sm:line-clamp-none">
                                {displayTagline}
                            </span>
                        )}
                    </div>
                )}
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-slate-900 dark:white leading-tight break-words">
                        {title}
                    </h1>
                    {displayCount !== undefined && displayCount !== null && (
                        <span className={`px-2 sm:px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold ${theme.countBg} ${theme.countText} border ${theme.countBorder} font-mono shadow-2xs shrink-0`}>
                            {displayCount} {itemLabel ? `${itemLabel}` : ''}
                        </span>
                    )}
                </div>
            </div>

            {/* Action Toolbar Area (Co-giãn thông minh trên Mobile & Tablet) */}
            {(actions || children) && (
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-start sm:justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
                    {actions}
                    {children}
                </div>
            )}
        </div>
    );
}

export default PageHeader;

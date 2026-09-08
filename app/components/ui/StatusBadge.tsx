'use client';

import React from 'react';

export type StatusVariant = 
    | 'DRAFT' 
    | 'SENT' 
    | 'PENDING' 
    | 'CONFIRMED' 
    | 'APPROVED' 
    | 'ACCEPTED' 
    | 'COMPLETED' 
    | 'PAID' 
    | 'PARTIAL' 
    | 'PARTIALLY_PAID' 
    | 'OVERDUE' 
    | 'CANCELLED' 
    | 'REJECTED' 
    | 'ACTIVE' 
    | 'INACTIVE'
    | string;

interface StatusBadgeProps {
    status: StatusVariant;
    label?: string;
    showDot?: boolean;
    className?: string;
}

const statusConfigMap: Record<string, { bg: string, text: string, border: string, dot: string, defaultLabel: string }> = {
    DRAFT: {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        defaultLabel: 'Bản nháp'
    },
    SENT: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        defaultLabel: 'Đã gửi'
    },
    PENDING: {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
        defaultLabel: 'Chờ duyệt'
    },
    CONFIRMED: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        defaultLabel: 'Đã xác nhận'
    },
    APPROVED: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        defaultLabel: 'Đã duyệt'
    },
    ACCEPTED: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        defaultLabel: 'Đã chấp thuận'
    },
    ACTIVE: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        defaultLabel: 'Hoạt động'
    },
    COMPLETED: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-500',
        defaultLabel: 'Hoàn thành'
    },
    PAID: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        defaultLabel: 'Đã thanh toán'
    },
    PARTIAL: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        defaultLabel: 'Thanh toán 1 phần'
    },
    PARTIALLY_PAID: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        defaultLabel: 'Một phần'
    },
    PARTIAL_PAID: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        defaultLabel: 'Thanh toán 1 phần'
    },
    PARTIAL_RECEIVED: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        defaultLabel: 'Nhận 1 phần'
    },
    SIGNED: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        defaultLabel: 'Đã ký kết'
    },
    NEW: {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-500',
        defaultLabel: 'Mới'
    },
    CONTACTED: {
        bg: 'bg-sky-50',
        text: 'text-sky-700',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
        defaultLabel: 'Đã liên hệ'
    },
    QUALIFIED: {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        defaultLabel: 'Tiềm năng'
    },
    PROPOSAL: {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-500',
        defaultLabel: 'Đề xuất / Báo giá'
    },
    WON: {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        defaultLabel: 'Thành công'
    },
    LOST: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        defaultLabel: 'Thất bại'
    },
    OVERDUE: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        defaultLabel: 'Quá hạn'
    },
    CANCELLED: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        dot: 'bg-red-500',
        defaultLabel: 'Đã hủy'
    },
    REJECTED: {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        defaultLabel: 'Từ chối'
    },
    INACTIVE: {
        bg: 'bg-zinc-100',
        text: 'text-zinc-600',
        border: 'border-zinc-200',
        dot: 'bg-zinc-400',
        defaultLabel: 'Ngừng hoạt động'
    }
};

export function StatusBadge({ status, label, showDot = true, className = '' }: StatusBadgeProps) {
    const upper = (status || '').toUpperCase();
    const config = statusConfigMap[upper] || {
        bg: 'bg-slate-50',
        text: 'text-slate-700',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
        defaultLabel: status || 'Không rõ'
    };

    const displayLabel = label || config.defaultLabel;

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${config.bg} ${config.text} ${config.border} ${className}`}
        >
            {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />}
            <span>{displayLabel}</span>
        </span>
    );
}

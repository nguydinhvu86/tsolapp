'use client';
import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({ 
    icon: Icon = Inbox, 
    title = 'Không có dữ liệu', 
    description = 'Chưa có thông tin nào được ghi nhận tại mục này.', 
    actionLabel, 
    onAction, 
    className = '' 
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-6 sm:p-7 text-center border-2 border-dashed border-slate-200/80 rounded-xl bg-slate-50/40 ${className}`}>
            <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-2xs mb-2.5 border border-slate-100">
                <Icon className="w-5 h-5 text-slate-400" strokeWidth={1.75} />
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-700 mb-0.5">{title}</h3>
            <p className="text-[11.5px] sm:text-xs text-slate-400 max-w-xs mb-3">{description}</p>
            {actionLabel && onAction && (
                <Button variant="primary" onClick={onAction} className="shadow-2xs text-xs py-1.5 px-3">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

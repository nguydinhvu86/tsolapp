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
        <div className={`flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 ${className}`}>
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4 border border-slate-100">
                <Icon className="w-8 h-8 text-slate-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
            {actionLabel && onAction && (
                <Button variant="primary" onClick={onAction} className="shadow-sm">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}

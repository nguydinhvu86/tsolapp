'use client'

import React, { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { clickToCall } from '@/app/call-center/actions';

interface ClickToCallButtonProps {
    phoneNumber: string;
    className?: string;
    showText?: boolean;
    label?: string;
    size?: 'xs' | 'sm' | 'md';
}

export function ClickToCallButton({ 
    phoneNumber, 
    className,
    showText = false,
    label = 'Gọi',
    size = 'xs'
}: ClickToCallButtonProps) {
    const [loading, setLoading] = useState(false);

    if (!phoneNumber) return null;

    const handleCall = async (e: React.MouseEvent) => {
         e.preventDefault();
         e.stopPropagation();
         
         if (!confirm(`Hệ thống PBX sẽ tự động đổ chuông điện thoại của bạn trước, sau đó kết nối đến số ${phoneNumber}. Xác nhận gọi?`)) return;

         setLoading(true);
         const res = await clickToCall(phoneNumber);
         setLoading(false);

         if (!res.success) {
             alert('Có lỗi xảy ra: ' + res.error);
         }
    };

    if (!showText) {
        return (
            <button 
                type="button"
                onClick={handleCall} 
                disabled={loading}
                title={`Gọi ${phoneNumber} qua tổng đài PBX`}
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 active:scale-95 transition-all shadow-2xs shrink-0 cursor-pointer ${className || ''}`}
            >
                {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Phone className="w-3 h-3" />}
            </button>
        );
    }

    return (
         <button 
             type="button"
             onClick={handleCall} 
             disabled={loading}
             title={`Gọi ${phoneNumber} qua tổng đài PBX`}
             className={`inline-flex items-center justify-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200/80 rounded-md active:scale-95 transition-all text-xs font-semibold whitespace-nowrap shadow-2xs cursor-pointer ${className || ''}`}
         >
             {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
             <span>{label}</span>
         </button>
    );
}


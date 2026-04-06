'use client'

import React, { useState } from 'react';
import { Phone, Loader2 } from 'lucide-react';
import { clickToCall } from '@/app/call-center/actions';

export function ClickToCallButton({ phoneNumber, className }: { phoneNumber: string, className?: string }) {
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

    return (
         <button 
             onClick={handleCall} 
             disabled={loading}
             title="Click-to-Call (Gọi qua tổng đài PBX)"
             className={`inline-flex items-center justify-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border border-green-200 rounded-md transition-colors text-sm font-medium ${className || ''}`}
         >
             {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
             <span>Gọi Ngay</span>
         </button>
    );
}

'use client'

import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

export default function PublicShareButton({ title }: { title?: string }) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: title || 'Phiếu Thu / Chi Online',
                    url: url
                });
                return;
            } catch (e) {
                // fallback to copy
            }
        }

        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            // fallback
            alert(`Liên kết: ${url}`);
        }
    };

    return (
        <button
            onClick={handleShare}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs ${
                copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Sao chép liên kết gửi cho khách hàng ký online"
        >
            {copied ? (
                <>
                    <Check size={14} strokeWidth={2.5} />
                    <span>Đã sao chép link!</span>
                </>
            ) : (
                <>
                    <Share2 size={14} />
                    <span>Gửi link khách hàng</span>
                </>
            )}
        </button>
    );
}

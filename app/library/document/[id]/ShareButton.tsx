'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

export function ShareButton({ documentId, isIconOnly = false }: { documentId: string, isIconOnly?: boolean }) {
    const [copied, setCopied] = useState(false);

    const handleShare = async () => {
        try {
            // Create a public link
            const url = `${window.location.origin}/public/document/${documentId}`;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            // Fallback for older browsers
            const url = `${window.location.origin}/public/document/${documentId}`;
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            document.body.removeChild(textArea);
        }
    };

    if (isIconOnly) {
        return (
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(); }}
                className={`p-1.5 rounded transition-colors ${copied ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                title={copied ? 'Đã copy link' : 'Chia sẻ tài liệu'}
            >
                {copied ? <Check size={16} /> : <Share2 size={16} />}
            </button>
        );
    }

    return (
        <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleShare(); }}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                height: '36px',
                fontSize: '0.875rem',
                fontWeight: 500,
                padding: '0 1rem',
                background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                color: copied ? '#4ade80' : '#f8fafc',
                border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
        >
            {copied ? <Check size={15} /> : <Share2 size={15} />}
            {copied ? 'Đã copy link' : 'Chia sẻ'}
        </button>
    );
}

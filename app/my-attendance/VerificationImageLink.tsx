'use client';

import React, { useState } from 'react';
import { ImageIcon, X } from 'lucide-react';

export default function VerificationImageLink({ url, type }: { url: string, type: 'IN' | 'OUT' }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded border transition-colors ${type === 'IN'
                        ? 'text-emerald-600 hover:text-emerald-700 bg-emerald-50 border-emerald-100'
                        : 'text-rose-600 hover:text-rose-700 bg-rose-50 border-rose-100'
                    }`}
                title={`Xem ảnh ${type}`}
            >
                <ImageIcon size={14} /> {type === 'IN' ? 'In' : 'Out'}
            </button>

            {isOpen && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setIsOpen(false)}
                    style={{ margin: 0 }}
                >
                    <div
                        className="relative w-full max-w-xl bg-white rounded shadow-2xl flex flex-col overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="w-full flex justify-between items-center px-4 py-3 border-b bg-slate-50">
                            <h3 className="font-semibold text-slate-700">Ảnh Xác Minh Check-{type.toLowerCase()}</h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 flex items-center justify-center bg-slate-100">
                            <img
                                src={url}
                                alt={`Check-${type}`}
                                className="rounded shadow-sm"
                                style={{ maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

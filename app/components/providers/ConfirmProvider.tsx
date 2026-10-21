'use client';

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

export interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning' | 'primary';
}

type ConfirmContextType = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

// Standalone global confirm trigger support
let globalConfirmHandler: ((opts: ConfirmOptions | string) => Promise<boolean>) | null = null;

export const confirmModal = (opts: ConfirmOptions | string): Promise<boolean> => {
    if (globalConfirmHandler) {
        return globalConfirmHandler(opts);
    }
    const msg = typeof opts === 'string' ? opts : `${opts.title ? opts.title + '\n\n' : ''}${opts.message}`;
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(msg) : false);
};

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({ message: '' });
    const resolverRef = useRef<((value: boolean) => void) | null>(null);

    const confirm = useCallback((opts: ConfirmOptions | string): Promise<boolean> => {
        const normalizedOpts: ConfirmOptions = typeof opts === 'string' ? { message: opts } : opts;
        setOptions(normalizedOpts);
        setIsOpen(true);

        return new Promise<boolean>((resolve) => {
            resolverRef.current = resolve;
        });
    }, []);

    useEffect(() => {
        globalConfirmHandler = confirm;
        return () => {
            globalConfirmHandler = null;
        };
    }, [confirm]);

    const handleConfirm = () => {
        setIsOpen(false);
        resolverRef.current?.(true);
        resolverRef.current = null;
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolverRef.current?.(false);
        resolverRef.current = null;
    };

    const variant = options.variant || (options.title?.toLowerCase().includes('xóa') ? 'danger' : 'primary');
    const isDanger = variant === 'danger';
    const isWarning = variant === 'warning';

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 999999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        backgroundColor: 'rgba(15, 23, 42, 0.45)',
                        backdropFilter: 'blur(4px)',
                    }}
                    onClick={handleCancel}
                >
                    <div
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start gap-4">
                            <div
                                className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
                                    isDanger
                                        ? 'bg-rose-50 text-rose-600 border border-rose-200/60'
                                        : isWarning
                                        ? 'bg-amber-50 text-amber-600 border border-amber-200/60'
                                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                                }`}
                            >
                                {isDanger && <AlertCircle className="w-6 h-6" />}
                                {isWarning && <AlertTriangle className="w-6 h-6" />}
                                {!isDanger && !isWarning && <HelpCircle className="w-6 h-6" />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-slate-900 leading-snug">
                                    {options.title || (isDanger ? 'Xác nhận xóa dữ liệu' : 'Xác nhận hành động')}
                                </h3>
                                <p className="text-sm text-slate-600 mt-2 leading-relaxed break-words">
                                    {options.message}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                            >
                                {options.cancelText || 'Hủy bỏ'}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                autoFocus
                                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white transition-all shadow-sm cursor-pointer ${
                                    isDanger
                                        ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                                        : isWarning
                                        ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                }`}
                            >
                                {options.confirmText || (isDanger ? 'Đồng ý xóa' : 'Xác nhận')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export function useConfirm() {
    const context = useContext(ConfirmContext);
    if (!context) {
        return confirmModal;
    }
    return context;
}

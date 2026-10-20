'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
    id: string;
    type: ToastType;
    message: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (type: ToastType, message: string, description?: string, duration?: number) => void;
    success: (message: string, description?: string) => void;
    error: (message: string, description?: string) => void;
    warning: (message: string, description?: string) => void;
    info: (message: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Standalone global trigger support
let globalToastHandler: ((type: ToastType, message: string, description?: string) => void) | null = null;

export const toast = {
    success: (message: string, description?: string) => globalToastHandler?.('success', message, description),
    error: (message: string, description?: string) => globalToastHandler?.('error', message, description),
    warning: (message: string, description?: string) => globalToastHandler?.('warning', message, description),
    info: (message: string, description?: string) => globalToastHandler?.('info', message, description),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const showToast = useCallback((type: ToastType, message: string, description?: string, duration = 4000) => {
        const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newItem: ToastItem = { id, type, message, description, duration };

        setToasts((prev) => [...prev.slice(-4), newItem]); // Keep max 5 visible toasts

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    const success = useCallback((message: string, description?: string) => showToast('success', message, description), [showToast]);
    const error = useCallback((message: string, description?: string) => showToast('error', message, description, 5000), [showToast]);
    const warning = useCallback((message: string, description?: string) => showToast('warning', message, description), [showToast]);
    const info = useCallback((message: string, description?: string) => showToast('info', message, description), [showToast]);

    useEffect(() => {
        globalToastHandler = showToast;
        return () => {
            globalToastHandler = null;
        };
    }, [showToast]);

    return (
        <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
            {children}
            {/* Fixed Toast Container */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    right: '24px',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    maxWidth: '420px',
                    width: 'calc(100vw - 48px)',
                    pointerEvents: 'none',
                }}
            >
                {toasts.map((t) => {
                    const isSuccess = t.type === 'success';
                    const isError = t.type === 'error';
                    const isWarning = t.type === 'warning';

                    const borderClass = isSuccess
                        ? 'border-emerald-500/30 bg-white/95 text-slate-800 shadow-emerald-500/10'
                        : isError
                        ? 'border-rose-500/30 bg-white/95 text-slate-800 shadow-rose-500/10'
                        : isWarning
                        ? 'border-amber-500/30 bg-white/95 text-slate-800 shadow-amber-500/10'
                        : 'border-blue-500/30 bg-white/95 text-slate-800 shadow-blue-500/10';

                    return (
                        <div
                            key={t.id}
                            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${borderClass}`}
                            style={{
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
                            }}
                        >
                            <div className="shrink-0 pt-0.5">
                                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
                                {isError && <XCircle className="w-5 h-5 text-rose-600" />}
                                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-600" />}
                                {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-blue-600" />}
                            </div>
                            <div className="flex-1 min-w-0 pr-1">
                                <div className="text-sm font-semibold text-slate-900 leading-snug">{t.message}</div>
                                {t.description && (
                                    <div className="text-xs text-slate-500 mt-1 leading-relaxed break-words">{t.description}</div>
                                )}
                            </div>
                            <button
                                onClick={() => removeToast(t.id)}
                                className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors"
                                aria-label="Close"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        return {
            showToast: toast.info,
            success: toast.success,
            error: toast.error,
            warning: toast.warning,
            info: toast.info,
        };
    }
    return context;
}

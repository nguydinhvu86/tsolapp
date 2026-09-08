'use client';
import React from 'react';

export function Modal({ isOpen, onClose, title, children, maxWidth = '500px' }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, padding: '1rem', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(2px)' }}>
            <div
                className="modal-container"
                style={{ width: '100%', maxWidth, maxHeight: '92vh', background: 'var(--surface, #ffffff)', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', border: '1px solid #e2e8f0' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.25rem', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: '#0f172a', letterSpacing: '-0.01em' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px', borderRadius: '6px' }}
                        className="hover:bg-slate-100 hover:text-slate-800 transition-colors"
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div style={{ padding: '1rem 1.25rem', overflowY: 'auto', flex: 1, background: '#ffffff' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}


'use client';
import React from 'react';

export function Modal({ isOpen, onClose, title, children, maxWidth = '500px' }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, padding: '2rem', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}>
            <div
                className="modal-container"
                style={{ width: '100%', maxWidth, maxHeight: '90vh', background: 'var(--surface)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' }}>{title}</h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        aria-label="Close"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, background: 'var(--surface)' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

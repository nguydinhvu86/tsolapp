'use client';
import React from 'react';

export function Modal({ isOpen, onClose, title, children, maxWidth = '500px' }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 50, padding: '2rem'
        }}>
            <div className="card" style={{ width: '100%', maxWidth, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                    <h3>{title}</h3>
                    <button onClick={onClose} style={{ fontSize: '1.5rem', lineHeight: 1 }}>&times;</button>
                </div>
                {children}
            </div>
        </div>
    );
}

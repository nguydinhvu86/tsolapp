'use client';
import React from 'react';

export function Input({
    label,
    error,
    className = '',
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, error?: string }) {
    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            {label && <label style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</label>}
            <input className="input" {...props} />
            {error && <span style={{ color: 'var(--danger)', fontSize: '0.875rem' }}>{error}</span>}
        </div>
    );
}

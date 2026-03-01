'use client';
import React from 'react';

export function Button({
    children,
    variant = 'primary',
    className = '',
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
    return (
        <button
            className={`btn btn-${variant} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}

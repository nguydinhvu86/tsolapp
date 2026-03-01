'use client';
import React from 'react';

export function Table({ children, className = '' }: { children: React.ReactNode, className?: string }) {
    return (
        <div className={`table-wrapper ${className}`}>
            <table>
                {children}
            </table>
        </div>
    );
}

'use client';
import React from 'react';

export function Card({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`card ${className}`} {...props}>
            {children}
        </div>
    );
}

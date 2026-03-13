'use client';
import React, { useState, useEffect } from 'react';

interface AvatarImageProps {
    src: string | null | undefined;
    name: string | null | undefined;
    size?: number;
    className?: string;
    style?: React.CSSProperties;
    fallbackStyle?: React.CSSProperties;
}

export function AvatarImage({ src, name, size = 40, className, style, fallbackStyle }: AvatarImageProps) {
    const [error, setError] = useState(false);

    // Reset error if src changes
    useEffect(() => {
        setError(false);
    }, [src]);

    if (!src || error) {
        return (
            <div
                className={className}
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    background: 'var(--bg-subtle, #f1f5f9)',
                    color: 'var(--primary, #6366f1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    fontSize: `${size / 2.5}px`,
                    border: '1px solid rgba(79, 70, 229, 0.2)',
                    flexShrink: 0,
                    ...style,
                    ...fallbackStyle
                }}
            >
                {name ? name.charAt(0).toUpperCase() : 'U'}
            </div>
        );
    }

    return (
        <img
            src={src}
            alt={name || "Avatar"}
            className={className}
            style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
                border: '1px solid rgba(79, 70, 229, 0.2)',
                ...style
            }}
            onError={() => setError(true)}
        />
    );
}

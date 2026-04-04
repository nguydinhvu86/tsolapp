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
    const imgRef = React.useRef<HTMLImageElement>(null);

    // Reset error if src changes
    useEffect(() => {
        setError(false);
        if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth === 0) {
            setError(true);
        }
    }, [src]);

// Fallback extraction
    const fallbackChar = (typeof name === 'string' && name.length > 0) ? name.charAt(0).toUpperCase() : 'U';

    if (!src || typeof src !== 'string' || error) {
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
                {fallbackChar}
            </div>
        );
    }

    let finalSrc = src;
    try {
        if (typeof src === 'string' && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
            finalSrc = '/' + src;
        }
    } catch (e) {
        // Ignore fallback
    }

    return (
        <img
            ref={imgRef}
            src={finalSrc}
            alt={typeof name === 'string' ? name : "Avatar"}
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

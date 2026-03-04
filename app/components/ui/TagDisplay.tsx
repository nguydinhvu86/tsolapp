import React from 'react';

interface TagDisplayProps {
    tagsString: string | null | undefined;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const colorPairs = [
    { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' }, // blue
    { bg: '#ecfdf5', text: '#047857', border: '#a7f3d0' }, // emerald
    { bg: '#fffbeb', text: '#b45309', border: '#fde68a' }, // amber
    { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' }, // rose
    { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' }, // purple
    { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe' }, // indigo
    { bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' }, // cyan
    { bg: '#fdf4ff', text: '#a21caf', border: '#f5d0fe' }, // fuchsia
    { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' }, // sky
    { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4' }, // teal
];

function getHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

export function TagDisplay({ tagsString, className = '', size = 'sm' }: TagDisplayProps) {
    if (!tagsString) return null;

    const tags = tagsString
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

    if (tags.length === 0) return null;

    const sizeStyles = {
        sm: { fontSize: '11px', padding: '2px 8px', lineHeight: '1.2' },
        md: { fontSize: '12px', padding: '4px 10px', lineHeight: '1.4' },
        lg: { fontSize: '14px', padding: '6px 12px', lineHeight: '1.5' },
    };

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }} className={className}>
            {tags.map((tag, i) => {
                const colorIndex = getHash(tag.toLowerCase()) % colorPairs.length;
                const colors = colorPairs[colorIndex];

                return (
                    <span
                        key={i}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontWeight: 500,
                            borderRadius: '9999px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                            ...sizeStyles[size]
                        }}
                    >
                        {tag}
                    </span>
                );
            })}
        </div>
    );
}

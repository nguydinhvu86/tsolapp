import React from 'react';

interface TagDisplayProps {
    tagsString: string | null | undefined;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

const colorPairs = [
    { bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' }, // slate
    { bg: '#eff6ff', text: '#1e40af', border: '#dbeafe' }, // blue
    { bg: '#f0fdf4', text: '#166534', border: '#dcfce7' }, // emerald
    { bg: '#fff7ed', text: '#9a3412', border: '#ffedd5' }, // orange
    { bg: '#faf5ff', text: '#6b21a8', border: '#f3e8ff' }, // purple
    { bg: '#f0fdfa', text: '#115e59', border: '#ccfbf1' }, // teal
    { bg: '#fdf2f8', text: '#9d174d', border: '#fce7f3' }, // pink
    { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' }, // zinc
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
        sm: { fontSize: '11px', padding: '1.5px 6px', lineHeight: '1.3' },
        md: { fontSize: '12px', padding: '3px 8px', lineHeight: '1.3' },
        lg: { fontSize: '13px', padding: '4px 10px', lineHeight: '1.4' },
    };

    return (
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }} className={className}>
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
                            borderRadius: '5px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                            letterSpacing: '-0.01em',
                            whiteSpace: 'nowrap',
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


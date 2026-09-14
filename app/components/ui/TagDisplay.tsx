import React from 'react';

interface TagDisplayProps {
    tagsString: string | null | undefined;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showHash?: boolean;
}

const colorPairs = [
    { bg: '#f8fafc', text: '#475569', border: '#e2e8f0', hash: '#94a3b8' }, // Slate
    { bg: '#f0f9ff', text: '#0284c7', border: '#e0f2fe', hash: '#38bdf8' }, // Sky
    { bg: '#ecfdf5', text: '#059669', border: '#d1fae5', hash: '#34d399' }, // Emerald
    { bg: '#fffbeb', text: '#d97706', border: '#fef3c7', hash: '#f59e0b' }, // Amber
    { bg: '#f5f3ff', text: '#7c3aed', border: '#ede9fe', hash: '#a78bfa' }, // Violet
    { bg: '#f0fdfa', text: '#0d9488', border: '#ccfbf1', hash: '#2dd4bf' }, // Teal
    { bg: '#fff1f2', text: '#e11d48', border: '#ffe4e6', hash: '#fb7185' }, // Rose
    { bg: '#eef2ff', text: '#4f46e5', border: '#e0e7ff', hash: '#818cf8' }, // Indigo
];

function getHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
}

export function TagDisplay({ tagsString, className = '', size = 'sm', showHash = true }: TagDisplayProps) {
    if (!tagsString) return null;

    const tags = tagsString
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

    if (tags.length === 0) return null;

    const sizeStyles = {
        sm: { fontSize: '10.5px', padding: '1px 6px', minHeight: '19px' },
        md: { fontSize: '11.5px', padding: '2px 7.5px', minHeight: '22px' },
        lg: { fontSize: '12.5px', padding: '3px 9px', minHeight: '25px' },
    };

    return (
        <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '3.5px', alignItems: 'center' }} className={className}>
            {tags.map((tag, i) => {
                const colorIndex = getHash(tag.toLowerCase()) % colorPairs.length;
                const colors = colorPairs[colorIndex];

                return (
                    <span
                        key={i}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontFamily: "var(--font-sans), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontWeight: 500,
                            borderRadius: '4px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                            letterSpacing: '-0.01em',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                            ...sizeStyles[size]
                        }}
                    >
                        {showHash && (
                            <span
                                style={{
                                    color: colors.hash,
                                    marginRight: '2px',
                                    fontWeight: 500,
                                    fontSize: '9.5px',
                                    userSelect: 'none',
                                    opacity: 0.85
                                }}
                            >
                                #
                            </span>
                        )}
                        <span>{tag}</span>
                    </span>
                );
            })}
        </div>
    );
}



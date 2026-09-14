import React from 'react';

interface TagDisplayProps {
    tagsString: string | null | undefined;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showHash?: boolean;
}

const colorPairs = [
    { bg: '#f8fafc', text: '#334155', border: '#e2e8f0', hash: '#94a3b8' }, // Slate
    { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', hash: '#38bdf8' }, // Sky
    { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', hash: '#4ade80' }, // Emerald
    { bg: '#fffbeb', text: '#b45309', border: '#fde68a', hash: '#fbbf24' }, // Amber
    { bg: '#faf5ff', text: '#7e22ce', border: '#e9d5ff', hash: '#c084fc' }, // Purple
    { bg: '#f0fdfa', text: '#0f766e', border: '#99f6e4', hash: '#2dd4bf' }, // Teal
    { bg: '#fff1f2', text: '#be123c', border: '#fecdd3', hash: '#fb7185' }, // Rose
    { bg: '#eef2ff', text: '#4338ca', border: '#c7d2fe', hash: '#818cf8' }, // Indigo
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
        sm: { fontSize: '11px', padding: '1.5px 6.5px', minHeight: '20px' },
        md: { fontSize: '11.5px', padding: '2.5px 8px', minHeight: '22px' },
        lg: { fontSize: '12.5px', padding: '3.5px 10px', minHeight: '26px' },
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
                            fontFamily: "var(--font-sans), 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                            fontWeight: 550,
                            borderRadius: '5px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            borderColor: colors.border,
                            letterSpacing: '-0.015em',
                            lineHeight: 1.25,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.02)',
                            transition: 'all 0.15s ease',
                            ...sizeStyles[size]
                        }}
                    >
                        {showHash && (
                            <span
                                style={{
                                    color: colors.hash,
                                    marginRight: '2.5px',
                                    fontWeight: 600,
                                    fontSize: '10px',
                                    userSelect: 'none'
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



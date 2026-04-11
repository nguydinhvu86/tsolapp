import React from 'react';

interface SkeletonProps {
    className?: string;
    width?: string | number;
    height?: string | number;
    circle?: boolean;
}

export function Skeleton({ className = '', width, height, circle = false }: SkeletonProps) {
    const style: React.CSSProperties = {
        width: width,
        height: height,
        borderRadius: circle ? '50%' : undefined,
    };

    return (
        <div 
            className={`animate-pulse bg-slate-200/60 rounded-md ${className}`} 
            style={style}
        />
    );
}

import React from 'react';

interface WatermarkProps {
    settings?: Record<string, string>;
    documentType?: string;
}

export function Watermark({ settings, documentType }: WatermarkProps) {
    if (!settings) return null;
    if (settings.WATERMARK_ENABLED !== 'true') return null;

    if (documentType && settings.WATERMARK_DOCUMENTS) {
        try {
            const allowedDocs = JSON.parse(settings.WATERMARK_DOCUMENTS);
            if (!Array.isArray(allowedDocs) || !allowedDocs.includes(documentType)) {
                return null;
            }
        } catch (error) {
            console.error("Failed to parse WATERMARK_DOCUMENTS", error);
        }
    }

    const type = settings.WATERMARK_TYPE || 'TEXT';
    const text = settings.WATERMARK_TEXT || 'BẢN SAO';
    const imageUrl = settings.WATERMARK_IMAGE_URL || '';
    const opacity = parseFloat(settings.WATERMARK_OPACITY || '0.1');
    const rotation = parseInt(settings.WATERMARK_ROTATION || '-45', 10);
    const color = settings.WATERMARK_COLOR || '#000000';
    const size = parseInt(settings.WATERMARK_SIZE || '150', 10);

    let backgroundStyle = {};

    if (type === 'TEXT') {
        const svgBoxSize = Math.max(size * 2, text.length * size * 0.7);
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgBoxSize}" height="${svgBoxSize}">
            <rect width="100%" height="100%" fill="none"/>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial, sans-serif" font-size="${size}px" font-weight="bold" fill="${color}" opacity="${opacity}" transform="rotate(${rotation}, ${svgBoxSize / 2}, ${svgBoxSize / 2})">${text}</text>
        </svg>`;
        const isLarge = svgBoxSize > 400;
        backgroundStyle = {
            backgroundImage: `url("data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svgString)}")`,
            backgroundRepeat: isLarge ? 'no-repeat' : 'space',
            backgroundPosition: 'center center',
            backgroundSize: isLarge ? 'contain' : `${svgBoxSize}px`
        };
    } else if (type === 'IMAGE' && imageUrl) {
        backgroundStyle = {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url('${imageUrl}')`,
            backgroundRepeat: 'space',
            backgroundSize: `${size}px`,
            backgroundPosition: 'center center',
            opacity: opacity,
            transform: `rotate(${rotation}deg)`,
            pointerEvents: 'none' as any
        };
        // Using an inner div for image rotation so we don't rotate the full container
        return (
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                pointerEvents: 'none',
                zIndex: 1,
                overflow: 'hidden',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
            }}>
                <div style={backgroundStyle as any}></div>
            </div>
        );
    }

    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 1,
            overflow: 'hidden',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            ...backgroundStyle
        }} />
    );
}

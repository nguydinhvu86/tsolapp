'use client'

import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string, locationStr?: string) => void;
    onCancel: () => void;
}

export function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [locationStr, setLocationStr] = useState<string>('');

    useEffect(() => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocationStr(`${position.coords.latitude}, ${position.coords.longitude}`);
                },
                (err) => console.log('Không thể lấy vị trí:', err)
            );
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Handle resizing for crisp lines
        const resizeCanvas = () => {
            const rect = canvas.getBoundingClientRect();
            // Handle ratio for retina displays
            const scale = window.devicePixelRatio || 1;
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;
            ctx.scale(scale, scale);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 3;
            ctx.strokeStyle = '#0f172a';
        };
        
        resizeCanvas();
        
        // Timeout to ensure it renders sizes correctly inside modals
        const timer = setTimeout(resizeCanvas, 50);

        window.addEventListener('resize', resizeCanvas);
        return () => {
            window.removeEventListener('resize', resizeCanvas);
            clearTimeout(timer);
        };
    }, []);

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        // e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault(); // Prevent scrolling while drawing on mobile
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = (e as React.MouseEvent).clientX;
            clientY = (e as React.MouseEvent).clientY;
        }

        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
        setHasDrawn(true);
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        // e.preventDefault();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        setHasDrawn(false);
    };

    const handleSave = () => {
        if (!hasDrawn) {
            alert("Vui lòng ký trước khi lưu.");
            return;
        }
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Export transparent png
        const dataUrl = canvas.toDataURL('image/png');
        onSave(dataUrl, locationStr);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="text-sm text-gray-600 text-center">
                Dùng chuột hoặc ngón tay để ký vào khung bên dưới
            </div>
            <div 
                className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white mx-auto touch-none" 
                style={{ height: '250px', width: '100%', maxWidth: '500px' }}
            >
                <canvas
                    ref={canvasRef}
                    style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                />
            </div>
            
            <div className="flex justify-between items-center mt-2 max-w-[500px] mx-auto w-full">
                <button 
                    type="button" 
                    onClick={clearCanvas}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                    Viết lại
                </button>
                <div className="flex gap-2">
                    <button 
                        type="button" 
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        type="button" 
                        onClick={handleSave}
                        disabled={!hasDrawn}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${hasDrawn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                        Lưu chữ ký
                    </button>
                </div>
            </div>
        </div>
    );
}

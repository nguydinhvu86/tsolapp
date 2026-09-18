'use client';

import React, { useState } from 'react';

import { Printer, Download } from 'lucide-react';

interface PrintButtonProps {
    label?: string;
    inline?: boolean;
}

export function PrintButton({ label = 'In Tài Liệu (A4)', inline = false }: PrintButtonProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownloadPdf = async () => {
        const element = document.querySelector('.a4-document') || document.querySelector('.sun-editor-editable');
        if (!element) {
            alert('Không tìm thấy nội dung tài liệu để xuất PDF.');
            return;
        }

        const htmlElement = element as HTMLElement;
        const originalCssText = htmlElement.style.cssText;

        try {
            setIsDownloading(true);

            // Xóa bỏ định dạng cứng của web để html2pdf tự động dàn trang 
            // với chiều ngang lọt lòng là 170mm (A4 210mm - 20mm lề trái - 20mm lề phải)
            htmlElement.style.cssText = `
                width: 170mm !important;
                max-width: 170mm !important;
                padding: 0 !important;
                margin: 0 !important;
                min-height: auto !important;
                box-shadow: none !important;
                background: white !important;
            `;

            // Dynamically import to avoid "window is not defined" in Next.js SSR
            // @ts-ignore
            const html2pdf = (await import('html2pdf.js')).default;

            const opt = {
                margin: [15, 20, 15, 20] as [number, number, number, number], // top, left, bottom, right (mm)
                filename: `${label.replace(/[^a-zA-Z0-9\s]/g, '').trim().replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg' as const, quality: 1 },
                html2canvas: {
                    scale: 4,
                    useCORS: true,
                    letterRendering: true
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdf().set(opt).from(htmlElement).save();
        } catch (error) {
            console.error('Lỗi khi xuất PDF:', error);
            alert('Đã xảy ra lỗi khi tạo file PDF.');
        } finally {
            // Khôi phục lại giao diện hiển thị web
            htmlElement.style.cssText = originalCssText;
            setIsDownloading(false);
        }
    };

    if (inline) {
        return (
            <div className="no-print flex items-center gap-2">
                <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs transition-all cursor-pointer disabled:opacity-50"
                    title="Tải xuống tập tin PDF"
                >
                    {isDownloading ? (
                        <span className="w-3.5 h-3.5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                        <Download size={14} className="text-slate-500" />
                    )}
                    <span>{isDownloading ? 'Đang tạo...' : 'Tải PDF'}</span>
                </button>
                <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs hover:shadow transition-all cursor-pointer"
                    title="In trực tiếp ra máy in"
                >
                    <Printer size={14} />
                    <span>{label}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="no-print" style={{ position: 'fixed', top: '24px', right: '24px', zIndex: 9999, display: 'flex', gap: '12px' }}>
            <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="btn btn-secondary"
                style={{
                    padding: '0.75rem 1.5rem',
                    fontSize: '1rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    backgroundColor: 'white',
                    color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                    cursor: isDownloading ? 'wait' : 'pointer'
                }}
                title="Tải xuống tập tin PDF"
            >
                {isDownloading ? (
                    <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                ) : (
                    <Download size={18} />
                )}
                {isDownloading ? 'Đang tạo...' : 'Tải PDF'}
            </button>
            <button
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{
                    padding: '0.75rem 2rem',
                    fontSize: '1.125rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                }}
                title="In trực tiếp ra máy in"
            >
                <Printer size={20} />
                {label}
            </button>
        </div>
    );
}

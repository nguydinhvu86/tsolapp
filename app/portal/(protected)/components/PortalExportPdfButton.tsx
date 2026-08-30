'use client';

import React, { useState } from 'react';
import { Download, Printer } from 'lucide-react';

interface PortalExportPdfButtonProps {
    targetId: string;
    fileName: string;
    title?: string;
}

export default function PortalExportPdfButton({ targetId, fileName, title }: PortalExportPdfButtonProps) {
    const [isExporting, setIsExporting] = useState(false);

    const handleExportPdf = async () => {
        const element = document.getElementById(targetId);
        if (!element) {
            alert('Không tìm thấy nội dung để xuất PDF.');
            return;
        }

        try {
            setIsExporting(true);

            // Dynamically import html2pdf.js to avoid SSR errors
            // @ts-ignore
            const html2pdfModule = (await import('html2pdf.js')).default || (await import('html2pdf.js'));

            const opt = {
                margin: [10, 10, 10, 10] as [number, number, number, number],
                filename: `${fileName.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s-]/g, '').trim().replace(/\s+/g, '_')}.pdf`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: {
                    scale: 2.5,
                    useCORS: true,
                    letterRendering: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
            };

            await html2pdfModule().set(opt).from(element).save();
        } catch (error) {
            console.error('Lỗi khi xuất PDF:', error);
            alert('Đã xảy ra lỗi khi tạo file PDF. Bạn có thể sử dụng tính năng In (Ctrl+P) để lưu thành file PDF.');
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="flex items-center gap-2 print:hidden">
            <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExporting}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-60 disabled:cursor-wait"
                title="Tải xuống tệp PDF"
            >
                {isExporting ? (
                    <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                    <Download size={16} className="text-emerald-600" />
                )}
                <span>{isExporting ? 'Đang xuất...' : 'Xuất PDF'}</span>
            </button>

            <button
                type="button"
                onClick={() => window.print()}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2"
                title="In tài liệu"
            >
                <Printer size={16} className="text-slate-600" />
                <span className="hidden sm:inline">In</span>
            </button>
        </div>
    );
}

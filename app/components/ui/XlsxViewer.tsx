'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Loader2, AlertCircle } from 'lucide-react';

interface XlsxViewerProps {
    fileUrl: string;
}

export default function XlsxViewer({ fileUrl }: XlsxViewerProps) {
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAndRender = async () => {
            try {
                setIsLoading(true);
                setError(null);
                let arrayBuffer: ArrayBuffer;

                if (fileUrl.startsWith('data:')) {
                    // Direct base64 parsing 
                    const base64Data = fileUrl.split(',')[1];
                    const binaryString = window.atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    arrayBuffer = bytes.buffer;
                } else {
                    const response = await fetch(fileUrl);
                    if (!response.ok) throw new Error('Không thể tải file bảng tính');
                    arrayBuffer = await response.arrayBuffer();
                }

                const workbook = XLSX.read(arrayBuffer, { type: 'array' });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    throw new Error('Tệp Excel không có dữ liệu');
                }

                // Get the first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Convert to HTML
                const html = XLSX.utils.sheet_to_html(worksheet, { header: '', footer: '' });

                setHtmlContent(html);
            } catch (err: any) {
                console.error('Lỗi khi đọc file Excel:', err);
                setError(err.message || 'Có lỗi xảy ra khi xử lý hiển thị file Excel.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndRender();
    }, [fileUrl]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 min-h-[300px] absolute inset-0">
                <Loader2 size={40} className="animate-spin text-green-500 mb-4" />
                <p className="text-slate-500 font-medium">Đang xử lý bảng tính Excel...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-red-50 text-red-500 gap-4 min-h-[300px] p-6 text-center absolute inset-0">
                <AlertCircle size={48} />
                <p className="font-medium">{error}</p>
                <p className="text-sm">Vui lòng tải tệp xuống để xem thay vì xem trước.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-[#f3f2f1] overflow-auto p-4 md:p-8 absolute inset-0">
            <div className="bg-white p-6 shadow-sm border border-slate-200 rounded-lg inline-block min-w-full">
                <style>{`
                    .excel-table-container { width: 100%; border-radius: 4px; overflow: hidden; }
                    .excel-table { border-collapse: collapse; width: 100%; min-width: 800px; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; box-shadow: 0 0 0 1px #e2e8f0; }
                    .excel-table td, .excel-table th { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 13.5px; color: #1e293b; white-space: nowrap; }
                    .excel-table tr:first-child td { font-weight: 600; background-color: #f1f5f9; color: #0f172a; text-align: center; }
                    .excel-table tr td:first-child { background-color: #f8fafc; font-weight: 500; text-align: center; color: #475569; width: 40px; }
                    .excel-table tr:hover td { background-color: #f8fafc; }
                    .excel-table tr:first-child:hover td { background-color: #f1f5f9; }
                `}</style>
                <div
                    className="overflow-x-auto excel-table-container pb-4"
                    dangerouslySetInnerHTML={{ __html: htmlContent.replace('<table', '<table class="excel-table"') }}
                />
            </div>
        </div>
    );
}

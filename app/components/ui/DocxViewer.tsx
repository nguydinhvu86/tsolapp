'use client';

import React, { useEffect, useState, useRef } from 'react';
import mammoth from 'mammoth';
import { Loader2, AlertCircle } from 'lucide-react';

interface DocxViewerProps {
    fileUrl: string;
}

export default function DocxViewer({ fileUrl }: DocxViewerProps) {
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
                    if (!response.ok) throw new Error('Không thể tải file tài liệu');
                    arrayBuffer = await response.arrayBuffer();
                }

                // Need to use browser version of mammoth
                const result = await mammoth.convertToHtml({ arrayBuffer });
                setHtmlContent(result.value);
            } catch (err: any) {
                console.error('Lỗi khi đọc file DOCX:', err);
                setError(err.message || 'Có lỗi xảy ra khi xử lý hiển thị file DOCX.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndRender();
    }, [fileUrl]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 min-h-[300px] absolute inset-0">
                <Loader2 size={40} className="animate-spin text-indigo-500 mb-4" />
                <p className="text-slate-500 font-medium">Đang xử lý tài liệu Word...</p>
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
        <div className="w-full h-full bg-[#f3f2f1] overflow-auto py-8 absolute inset-0">
            <div className="mx-auto bg-white p-8 sm:p-12 shadow-md max-w-[850px] min-h-[1100px] relative mt-2 mb-8">
                <div
                    className="prose prose-sm sm:prose-base max-w-none text-slate-800
                    prose-headings:font-bold prose-headings:text-slate-900
                    prose-p:leading-relaxed prose-p:my-2
                    prose-table:border-collapse prose-table:w-full prose-table:my-4
                    prose-th:border prose-th:border-slate-300 prose-th:bg-slate-50 prose-th:p-2 prose-th:text-left
                    prose-td:border prose-td:border-slate-300 prose-td:p-2
                    prose-img:max-w-full prose-img:h-auto prose-img:mx-auto prose-img:rounded-md
                    prose-a:text-indigo-600 prose-a:underline hover:prose-a:text-indigo-800"
                    dangerouslySetInnerHTML={{ __html: htmlContent }}
                />
            </div>
        </div>
    );
}

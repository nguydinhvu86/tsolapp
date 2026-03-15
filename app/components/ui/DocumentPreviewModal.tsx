'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Download, X, FileText, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import DocxViewer from './DocxViewer';
import XlsxViewer from './XlsxViewer';

interface DocumentPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileName: string;
}

export function DocumentPreviewModal({ isOpen, onClose, fileUrl, fileName }: DocumentPreviewModalProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // Helper to determine file type from URL or Name
    const getFileType = (url: string, name: string) => {
        const extension = name.split('.').pop()?.toLowerCase() || url.split('.').pop()?.toLowerCase() || '';

        if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) return 'image';
        if (['pdf'].includes(extension)) return 'pdf';
        if (['doc', 'docx'].includes(extension)) return 'docx';
        if (['xls', 'xlsx'].includes(extension)) return 'xlsx';
        if (['ppt', 'pptx'].includes(extension)) return 'office';
        if (['txt', 'csv'].includes(extension)) return 'text';

        return 'unknown';
    };

    const fileType = getFileType(fileUrl, fileName);

    const renderPreviewContent = () => {
        switch (fileType) {
            case 'image':
                return (
                    <div className="flex items-center justify-center w-full h-full p-4">
                        <img
                            src={fileUrl}
                            alt={fileName}
                            className="max-w-full max-h-full object-contain"
                            onLoad={() => setIsLoading(false)}
                            onError={() => setIsLoading(false)} // Handle error as well
                        />
                        {isLoading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50">
                                <Loader2 className="animate-spin text-slate-400" size={32} />
                            </div>
                        )}
                    </div>
                );
            case 'pdf':
            case 'text':
                // Built-in browser support via iframe
                return (
                    <iframe
                        src={fileUrl}
                        className="w-full h-full border-none"
                        onLoad={() => setIsLoading(false)}
                        title={fileName}
                    />
                );
            case 'docx':
                return <DocxViewer fileUrl={fileUrl} />;
            case 'xlsx':
                return <XlsxViewer fileUrl={fileUrl} />;
            case 'office': {
                // Use Google Docs Viewer for other Office documents (PPT) as a fallback
                const googleDocsUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`;
                return (
                    <iframe
                        src={googleDocsUrl}
                        className="w-full h-full border-none"
                        onLoad={() => setIsLoading(false)}
                        title={fileName}
                    />
                );
            }
            default:
                // Unknown type, just show download button
                return (
                    <div className="flex flex-col items-center justify-center w-full h-full bg-slate-50 text-slate-500 gap-4">
                        <FileText size={48} className="text-slate-300" />
                        <p className="text-sm">Không thể xem trước định dạng tệp này.</p>
                        <a
                            href={fileUrl}
                            download={fileName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                        >
                            <Download size={16} /> Tải xuống tệp
                        </a>
                    </div>
                );
        }
    };

    const modalContent = (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999999,
            display: 'flex', flexDirection: 'column',
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            transition: 'all 0.3s ease'
        }}>
            {/* Header Toolbar */}
            <div style={{
                height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 1rem', backgroundColor: '#1e293b', borderBottom: '1px solid #334155'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                    <div style={{ padding: '6px', backgroundColor: '#334155', borderRadius: '4px', color: '#94a3b8' }}>
                        <FileText size={18} />
                    </div>
                    <span style={{ color: 'white', fontWeight: 500, fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }} title={fileName}>
                        {fileName}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <a
                        href={fileUrl}
                        download={fileName}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '6px',
                            backgroundColor: '#3b82f6', color: 'white',
                            fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none',
                            transition: 'background 0.2s'
                        }}
                        className="hover:bg-blue-600"
                    >
                        <Download size={16} /> Tải về
                    </a>

                    <div style={{ width: '1px', height: '24px', backgroundColor: '#334155', margin: '0 0.5rem' }} />

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                        className="hover:bg-slate-700 hover:text-white transition-colors"
                        title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                    >
                        {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                    </button>

                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', color: '#f87171', padding: '8px', cursor: 'pointer', borderRadius: '4px' }}
                        className="hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Đóng (Esc)"
                    >
                        <X size={24} />
                    </button>
                </div>
            </div>

            {/* Viewer Body */}
            <div style={{
                flex: 1, position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: isFullscreen ? '0' : '2rem',
                transition: 'padding 0.3s ease'
            }}>
                <div style={{
                    width: '100%', height: '100%',
                    maxWidth: isFullscreen ? '100%' : '1200px',
                    backgroundColor: 'white',
                    borderRadius: isFullscreen ? '0' : '8px',
                    overflow: 'hidden',
                    boxShadow: isFullscreen ? 'none' : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    position: 'relative'
                }}>
                    {/* Render Loading Overlay for generic iframes */}
                    {isLoading && ['pdf', 'office', 'text'].includes(fileType) && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', zIndex: 10 }}>
                            <Loader2 size={40} className="animate-spin text-slate-400 mb-4" />
                            <p className="text-slate-500 font-medium">Đang tải tài liệu...</p>
                        </div>
                    )}
                    {renderPreviewContent()}
                </div>
            </div>
        </div>
    );

    if (typeof window === 'undefined') return null;

    return createPortal(modalContent, document.body);
}

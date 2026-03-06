'use client';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { fetchGoogleDocHTML } from '../../actions/fetchGoogleDoc';
import { Link2, Download, Loader2 } from 'lucide-react';

// Jodit heavily relies on browser APIs (window/document), so it must be dynamically imported
const JoditEditor = dynamic(() => import('jodit-react'), { ssr: false });

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editorRef = useRef<any>(null);

    const [isFetchingGoogleDoc, setIsFetchingGoogleDoc] = useState(false);
    const [googleDocLink, setGoogleDocLink] = useState('');
    const [googleDocError, setGoogleDocError] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const handleImportGoogleDoc = async () => {
        if (!googleDocLink.trim()) {
            setGoogleDocError('Vui lòng nhập link bài viết Google Docs.');
            return;
        }

        setGoogleDocError('');
        setIsFetchingGoogleDoc(true);

        try {
            const res = await fetchGoogleDocHTML(googleDocLink);
            if (!res.success) {
                setGoogleDocError(res.error || 'Có lỗi xảy ra khi tải dữ liệu.');
            } else if (res.html) {
                // If Jodit ref exists, we try to set it, otherwise fallback to prop onChange
                onChange(res.html);
                setGoogleDocLink('');
            }
        } catch (error: any) {
            setGoogleDocError(error.message || 'Lỗi mạng nội bộ.');
        } finally {
            setIsFetchingGoogleDoc(false);
        }
    };

    // Jodit configuration
    const config = useMemo(() => ({
        readonly: false,
        placeholder: placeholder || 'Nhập nội dung mẫu văn bản...',
        language: 'vi',
        height: 800,
        width: '100%',
        theme: 'default',
        enableDragAndDropFileToEditor: true,
        uploader: {
            insertImageAsBase64URI: true
        },
        buttons: [
            'source', '|',
            'bold', 'strikethrough', 'underline', 'italic', '|',
            'superscript', 'subscript', '|',
            'ul', 'ol', '|',
            'outdent', 'indent', '|',
            'font', 'fontsize', 'brush', 'paragraph', '|',
            'image', 'table', 'link', '|',
            'align', 'undo', 'redo', '|',
            'hr', 'eraser', 'copyformat', '|',
            'symbol', 'fullsize', 'print'
        ],
        extraButtons: [],
        showCharsCounter: false,
        showWordsCounter: false,
        showXPathInStatusbar: false,
        // Using iframe is crucial for scoping CSS without affecting the whole page
        iframe: true,
        iframeStyle: `
            html { background: #f1f5f9; padding: 2rem 0; display: flex; justify-content: center; min-height: 100%; }
            body { 
                width: 21cm !important; 
                min-height: 29.7cm !important; 
                margin: 0 auto !important; 
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important; 
                background: white !important; 
                padding: 2cm !important;
                box-sizing: border-box !important;
                font-family: 'Times New Roman', Times, serif;
                font-size: 14pt;
                line-height: 1.5;
            }
            body > *:first-child { margin-top: 0; }
        `,
        style: {
            // style for the wrapper when iframe=false, ignored mostly when iframe=true
        }
    }), [placeholder]);

    if (!isMounted) {
        return <div style={{ height: 800, background: '#f8fafc', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Đang tải trình soạn thảo...</div>;
    }

    return (
        <div className="jodit-wrapper" style={{ position: 'relative' }}>
            {/* Google Docs Feature Section */}
            <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', marginBottom: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: '500', fontSize: '14px' }}>
                    <Link2 size={16} color="#3b82f6" /> <span>Tải nội dung trực tiếp từ Google Docs</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <input
                            type="text"
                            className="input"
                            placeholder="Dán link bài viết (Chế độ chia sẻ: Bất kỳ ai có liên kết đều xem được)..."
                            value={googleDocLink}
                            onChange={(e) => setGoogleDocLink(e.target.value)}
                            disabled={isFetchingGoogleDoc}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px' }}
                        />
                        {googleDocError && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{googleDocError}</div>}
                    </div>
                    <button
                        type="button"
                        onClick={handleImportGoogleDoc}
                        disabled={isFetchingGoogleDoc || !googleDocLink.trim()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: isFetchingGoogleDoc || !googleDocLink.trim() ? '#94a3b8' : '#2563eb',
                            color: 'white', padding: '8px 16px', borderRadius: '6px',
                            fontWeight: '500', fontSize: '14px', border: 'none', cursor: isFetchingGoogleDoc || !googleDocLink.trim() ? 'not-allowed' : 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {isFetchingGoogleDoc ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        {isFetchingGoogleDoc ? 'Đang tải...' : 'Chép dữ liệu'}
                    </button>
                </div>
            </div>

            <div className="jodit-a4-container">
                <JoditEditor
                    ref={editorRef}
                    value={value || ''}
                    config={config}
                    onBlur={newContent => onChange(newContent)}
                    onChange={(newContent) => {
                        // Jodit triggers this often, we only rely on onBlur or manual state if we want strictly less re-renders, 
                        // but onChange provides realtime typing feedback for preview mapping if used in forms.
                        onChange(newContent);
                    }}
                />
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
                .jodit-wrapper .jodit-container {
                    border: 1px solid #e2e8f0 !important;
                    border-radius: 8px !important;
                }
                .jodit-a4-container {
                    position: relative;
                }
            `}} />
        </div>
    );
}

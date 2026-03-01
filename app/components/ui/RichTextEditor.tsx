'use client';
import React from 'react';
import dynamic from 'next/dynamic';
import 'suneditor/dist/css/suneditor.min.css';
import * as XLSX from 'xlsx';

const SunEditor = dynamic(() => import('suneditor-react'), {
    ssr: false,
    loading: () => <div style={{ height: '300px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>Đang tải công cụ soạn thảo Chuyên nghiệp...</div>
});

const editorOptions = {
    buttonList: [
        ['undo', 'redo'],
        ['font', 'fontSize', 'formatBlock'],
        ['paragraphStyle', 'blockquote'],
        ['bold', 'underline', 'italic', 'strike', 'subscript', 'superscript'],
        ['fontColor', 'hiliteColor', 'textStyle'],
        ['removeFormat'],
        '/', // Line break
        ['outdent', 'indent'],
        ['align', 'horizontalRule', 'list', 'lineHeight'],
        ['table', 'link', 'image', 'video'],
        ['fullScreen', 'showBlocks', 'codeView'],
        ['preview', 'print']
    ],
    defaultTag: 'div',
    minHeight: '600px',
    showPathLabel: false,
    font: [
        'Times New Roman', 'Arial', 'Tahoma', 'Courier New', 'Verdana', 'Georgia', 'Calibri', 'Consolas'
    ],
    fontSize: [
        8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 36
    ],
    // Allow any classes from Word or Excel
    allowedClassNames: '.*',
    // Allow any styles
    allowedStyleProps: ['.*'],
    // Which tags to keep when pasting
    pasteTagsWhitelist: 'p|span|font|b|strong|i|em|u|ins|s|strike|del|a|ul|ol|li|hr|table|tbody|thead|tfoot|tr|th|td|div|h1|h2|h3|h4|h5|h6|br|img',
    // Add custom inline CSS style definitions
    textStyles: [
        'translucent',
        'dashed',
        'solid',
        'double'
    ]
};

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
    const editorRef = React.useRef<any>(null);
    const [mode, setMode] = React.useState<'visual' | 'html'>(
        (value || '').includes('<table') || (value || '').includes('<div style=') ? 'html' : 'visual'
    );

    // Track internal vs external changes to prevent cursor jumping
    const latestValue = React.useRef(value);

    React.useEffect(() => {
        if (editorRef.current && typeof editorRef.current.setContents === 'function' && value !== latestValue.current) {
            // Only update if the parent forced a completely new value that we don't know about
            // (e.g. switching templates)
            latestValue.current = value;
            editorRef.current.setContents(value);
        } else if (value !== latestValue.current) {
            // Keep latestValue in sync even if editor isn't ready or in HTML mode
            latestValue.current = value;
        }
    }, [value]);

    const handleEditorChange = (content: string) => {
        latestValue.current = content;
        onChange(content);
    };

    return (
        <div className="quill-wrapper" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <button
                    type="button"
                    onClick={() => setMode('visual')}
                    style={{ fontWeight: mode === 'visual' ? 'bold' : 'normal', color: mode === 'visual' ? 'var(--primary)' : 'var(--text-muted)' }}
                >
                    Trực quan (Rich Text)
                </button>
                <button
                    type="button"
                    onClick={() => setMode('html')}
                    style={{ fontWeight: mode === 'html' ? 'bold' : 'normal', color: mode === 'html' ? 'var(--primary)' : 'var(--text-muted)' }}
                >
                    Mã HTML (Bảo toàn Format)
                </button>
            </div>

            {mode === 'visual' ? (
                <div style={{ position: 'relative' }}>
                    <SunEditor
                        getSunEditorInstance={(sunEditor: any) => {
                            editorRef.current = sunEditor;
                        }}
                        setContents={value}
                        onChange={handleEditorChange}
                        setOptions={editorOptions}
                        placeholder={placeholder || 'Nhập nội dung...'}
                    />
                </div>
            ) : (
                <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ background: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '1rem', marginBottom: '1rem', borderRadius: '4px' }}>
                        <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e3a8a' }}>
                            <strong>💡 MẸO COPY BẢNG TỪ EXCEL / WORD DÀNH CHO CODE:</strong><br />
                            Hệ thống đã tự động hỗ trợ tự động Copy & Paste giữ nguyên định dạng (kể cả bảng biểu, màu sắc) trên thẻ Trực quan. <br />
                            <br />
                            Nếu thẻ trực quan bị lỗi định dạng bảng hiển thị phức tạp, bạn có thể copy nội dung dạng HTML vào đây.
                            <br /><br />
                            1. Truy cập <a href="https://wordhtml.com/" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', fontWeight: 'bold' }}>WordHTML.com</a><br />
                            2. Dán file Word/Excel của bạn vào đó, sau đó copy <strong>mã HTML</strong> kết quả.<br />
                            3. Dán mã HTML đó vào ô bên dưới đây.
                        </p>
                    </div>
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder="Dán mã HTML vào đây..."
                        style={{ width: '100%', height: '600px', padding: '1rem', fontFamily: 'monospace', fontSize: '13px', border: '1px solid #e2e8f0', borderRadius: '4px', background: '#f8fafc' }}
                    />
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .quill-wrapper .se-wrapper-inner { font-family: 'Times New Roman', Times, serif; font-size: 14pt; line-height: 1.6; }
        .quill-wrapper .sun-editor { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        .quill-wrapper .se-toolbar { background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
        .quill-wrapper .se-resizing-bar { background: #f8fafc; border-top: 1px solid #e2e8f0; }
        
        /* MS Word styles override */
        .se-wrapper-inner table { width: 100% !important; border-collapse: collapse !important; }
        .se-wrapper-inner table td, .se-wrapper-inner table th { padding: 4px; border: 1px solid #000; }
        .se-wrapper-inner p.MsoNormal, .se-wrapper-inner li.MsoNormal, .se-wrapper-inner div.MsoNormal { margin-bottom: 0pt; line-height: normal; }
      `}} />
        </div>
    );
}

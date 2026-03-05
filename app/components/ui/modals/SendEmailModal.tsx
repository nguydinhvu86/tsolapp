'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Mail, Paperclip } from 'lucide-react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

interface SendEmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: { to: string, subject: string, htmlBody: string, attachmentName?: string, attachmentBase64?: string }) => Promise<void>;
    defaultToEmail?: string;
    moduleType: string; // 'ESTIMATE', 'INVOICE', 'CUSTOMER'
    variablesData?: Record<string, string>; // Maps 'customerName' -> 'John Doe'
    templates: any[]; // List of templates fetched by the parent
    printUrl?: string; // URL to the public print view (e.g. /public/sales/estimate/123)
    documentName?: string; // Name for the generated PDF (e.g. Bao_Gia_BG001.pdf)
}

export function SendEmailModal({ isOpen, onClose, onSend, defaultToEmail, moduleType, variablesData = {}, templates, printUrl, documentName }: SendEmailModalProps) {
    const [toEmail, setToEmail] = useState(defaultToEmail || '');
    const [subject, setSubject] = useState('');
    const [htmlBody, setHtmlBody] = useState('');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [isSending, setIsSending] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [attachPdf, setAttachPdf] = useState(!!printUrl);

    // Hidden iframe ref for PDF generation
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Initial setup
    useEffect(() => {
        if (isOpen) {
            setToEmail(defaultToEmail || '');
            setSubject('');
            setHtmlBody('');
            setSelectedTemplateId('');
            setAttachPdf(!!printUrl);
            setStatusMessage('');
        }
    }, [isOpen, defaultToEmail, printUrl]);

    // Apply template and parse variables
    const applyTemplate = (templateId: string) => {
        setSelectedTemplateId(templateId);

        const template = templates.find(t => t.id === templateId);
        if (!template) return;

        let newSubject = template.subject;
        let newBody = template.body;

        // Dynamic Parsing
        Object.keys(variablesData).forEach(key => {
            const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
            newSubject = newSubject.replace(regex, variablesData[key]);
            newBody = newBody.replace(regex, variablesData[key]);
        });

        setSubject(newSubject);
        setHtmlBody(newBody);
    };

    if (!isOpen) return null;

    const generatePdfBase64 = async (): Promise<string | null> => {
        return new Promise((resolve) => {
            if (!iframeRef.current || !printUrl) {
                resolve(null);
                return;
            }

            const iframe = iframeRef.current;

            // Clean up previous listeners
            iframe.onload = async () => {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                    if (!iframeDoc) {
                        resolve(null);
                        return;
                    }

                    // Give it a tiny bit of time for React to render inside the iframe if needed
                    await new Promise(r => setTimeout(r, 500));

                    const element = iframeDoc.querySelector('.print-container') || iframeDoc.body;

                    // @ts-ignore
                    const html2pdf = (await import('html2pdf.js')).default;

                    const opt = {
                        margin: [15, 20, 15, 20] as [number, number, number, number],
                        filename: documentName || 'document.pdf',
                        image: { type: 'jpeg' as const, quality: 1 },
                        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
                        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                    };

                    const base64 = await html2pdf().set(opt).from(element as HTMLElement).output('datauristring');
                    resolve(base64);
                } catch (error) {
                    console.error("Lỗi khi tạo PDF trong iframe:", error);
                    resolve(null);
                }
            };

            // Trigger load
            iframe.src = printUrl;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!toEmail || !subject || !htmlBody) {
            alert('Vui lòng nhập người nhận, tiêu đề và nội dung Email.');
            return;
        }

        setIsSending(true);
        setStatusMessage('Đang chuẩn bị gửi...');

        try {
            let attachmentBase64 = undefined;
            let finalAttachmentName = undefined;

            if (attachPdf && printUrl) {
                setStatusMessage('Đang trích xuất dữ liệu thành file PDF đính kèm...');
                attachmentBase64 = await generatePdfBase64();
                if (attachmentBase64) {
                    finalAttachmentName = documentName || 'TaiLieu.pdf';
                } else {
                    alert('Cảnh báo: Không thể tạo file PDF đính kèm. Email sẽ được gửi mà không có file đính kèm.');
                }
            }

            setStatusMessage('Đang phát tín hiệu thư điện tử...');
            await onSend({
                to: toEmail,
                subject,
                htmlBody,
                attachmentName: finalAttachmentName,
                attachmentBase64: attachmentBase64 || undefined
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert("Lỗi khi gửi email.");
        } finally {
            setIsSending(false);
            setStatusMessage('');
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
            <div style={{
                background: 'white', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                width: '100%', maxWidth: '1100px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                overflow: 'hidden', animation: 'modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid #e2e8f0'
            }}>
                <style>{`
                    @keyframes modalFadeIn {
                        from { opacity: 0; transform: scale(0.95) translateY(10px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    .template-btn {
                        transition: all 0.2s ease;
                    }
                    .template-btn:hover {
                        background: #f8fafc;
                        border-color: #cbd5e1;
                    }
                    .template-btn.active {
                        background: #eff6ff;
                        border-color: #bfdbfe;
                        box-shadow: 0 1px 2px 0 rgba(59, 130, 246, 0.1);
                    }
                `}</style>

                {/* Hidden iframe for PDF generation */}
                <iframe ref={iframeRef} style={{ display: 'none' }} title="PDF Generator" />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', background: 'white', flexShrink: 0 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#0f172a', letterSpacing: '-0.025em' }}>
                        <div style={{ background: '#eff6ff', padding: '0.5rem', borderRadius: '10px', color: '#2563eb' }}>
                            <Mail size={20} strokeWidth={2.5} />
                        </div>
                        Soạn Email Gửi Khách Hàng
                    </h2>
                    <button
                        onClick={onClose}
                        style={{ padding: '0.5rem', background: 'transparent', border: 'none', color: '#94a3b8', borderRadius: '50%', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'row', background: '#f8fafc' }}>

                    {/* Left sidebar: Templates */}
                    <div style={{ width: '320px', borderRight: '1px solid #e2e8f0', background: 'white', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                        <div style={{ padding: '1.25rem 1.5rem 0.75rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                            <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                                📋 Mẫu Có Sẵn ({moduleType})
                            </h3>
                        </div>

                        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {templates.filter(t => t.module === moduleType || t.module === 'GENERAL').length > 0 ? (
                                templates.filter(t => t.module === moduleType || t.module === 'GENERAL').map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => applyTemplate(t.id)}
                                        className={`template-btn ${selectedTemplateId === t.id ? 'active' : ''}`}
                                        style={{
                                            width: '100%', textAlign: 'left', padding: '1rem', borderRadius: '12px', border: '1px solid', cursor: 'pointer',
                                            borderColor: selectedTemplateId === t.id ? '#bfdbfe' : '#e2e8f0',
                                            background: selectedTemplateId === t.id ? '#eff6ff' : 'white'
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, color: selectedTemplateId === t.id ? '#1d4ed8' : '#334155', fontSize: '0.95rem', marginBottom: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {t.name}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: selectedTemplateId === t.id ? '#3b82f6' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {t.subject}
                                        </div>
                                    </button>
                                ))
                            ) : (
                                <div style={{ fontSize: '0.875rem', color: '#64748b', textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                                    Oops! Chưa có mẫu email nào cho {moduleType}. Bạn hãy vào Cài đặt để thêm mới nhé.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right area: Form */}
                    <form id="email-form" onSubmit={handleSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', gap: '1.5rem' }}>

                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                                    Gửi tới (To Email) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="email"
                                    required
                                    value={toEmail}
                                    onChange={e => setToEmail(e.target.value)}
                                    placeholder="Ví dụ: khachhang@example.com"
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                                        borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', fontWeight: 500
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)'; }}
                                    onBlur={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>
                                    Tiêu đề (Subject) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="Vui lòng nhập tiêu đề Email..."
                                    style={{
                                        width: '100%', padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                                        borderRadius: '12px', fontSize: '0.95rem', color: '#0f172a', outline: 'none', transition: 'all 0.2s', fontWeight: 500
                                    }}
                                    onFocus={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)'; }}
                                    onBlur={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                            <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155', margin: 0 }}>Nội dung Email</label>
                                {printUrl && (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: 600, color: '#0f172a', cursor: 'pointer', userSelect: 'none' }}>
                                        <input
                                            type="checkbox"
                                            checked={attachPdf}
                                            onChange={(e) => setAttachPdf(e.target.checked)}
                                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }}
                                        />
                                        <Paperclip size={16} color="#64748b" />
                                        Đính kèm file PDF ({documentName})
                                    </label>
                                )}
                            </div>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '350px' }}>
                                <style>{`
                                    .ql-container.ql-snow { border: none !important; font-family: inherit !important; font-size: 0.95rem !important; }
                                    .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e2e8f0 !important; background: white !important; padding: 0.5rem 1.25rem !important; }
                                    .ql-editor { padding: 1.25rem !important; color: #1e293b; }
                                `}</style>
                                <ReactQuill
                                    theme="snow"
                                    value={htmlBody}
                                    onChange={setHtmlBody}
                                    style={{ height: '300px' }}
                                    modules={{
                                        toolbar: [
                                            [{ 'header': [1, 2, 3, false] }, { 'font': [] }],
                                            ['bold', 'italic', 'underline', 'strike'],
                                            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                                            ['link', 'clean']
                                        ],
                                    }}
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer Footer */}
                <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid #e2e8f0', background: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500, fontStyle: 'italic' }}>
                        {statusMessage && <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span> {statusMessage}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            style={{
                                padding: '0.625rem 1.5rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem',
                                background: 'white', color: '#475569', border: '1px solid #cbd5e1', cursor: isSending ? 'not-allowed' : 'pointer',
                                opacity: isSending ? 0.6 : 1, transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => { if (!isSending) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#0f172a'; } }}
                            onMouseLeave={(e) => { if (!isSending) { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#475569'; } }}
                        >
                            Hủy Bỏ
                        </button>
                        <button
                            type="submit"
                            form="email-form"
                            disabled={isSending}
                            style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                padding: '0.625rem 1.5rem', borderRadius: '12px', fontWeight: 600, fontSize: '0.95rem',
                                background: '#2563eb', color: 'white', border: 'none', cursor: isSending ? 'not-allowed' : 'pointer',
                                opacity: isSending ? 0.7 : 1, transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.4)'
                            }}
                            onMouseEnter={(e) => { if (!isSending) { e.currentTarget.style.background = '#1d4ed8'; e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(37, 99, 235, 0.4)'; } }}
                            onMouseLeave={(e) => { if (!isSending) { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.4)'; } }}
                        >
                            {isSending ? (
                                'Đang xử lý...'
                            ) : (
                                <>
                                    <Send size={18} /> Gửi Email Này
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

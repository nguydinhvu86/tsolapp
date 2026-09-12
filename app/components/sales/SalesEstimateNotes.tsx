'use client';

import React, { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FileText, Send, Trash2, Paperclip, MessageSquare, Image as ImageIcon, CheckSquare, X, Eye, Download, UploadCloud } from 'lucide-react';
import { createSalesEstimateNote, deleteSalesEstimateNote } from '@/app/sales/estimates/actions';
import { Modal } from '@/app/components/ui/Modal';
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';
import { autoLinkText } from '@/lib/utils/formatters';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

interface AttachmentItem {
    url: string;
    name: string;
    type?: string;
    size?: number;
}

interface SalesEstimateNotesProps {
    estimateId: string;
    notes: any[];
    currentUserId: string;
    currentUserRole: string;
}

export function SalesEstimateNotes({ estimateId, notes, currentUserId, currentUserRole }: SalesEstimateNotesProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const displayNotes = notes?.slice(0, 5) || [];

    // Helper to upload a single File object
    const uploadFile = async (file: File): Promise<AttachmentItem | null> => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || 'Lỗi tải tệp lên hệ thống');
        }
        const data = await res.json();
        return {
            url: data.url,
            name: file.name,
            type: file.type,
            size: file.size
        };
    };

    // Handle File / Image List Upload
    const handleFilesUpload = async (files: FileList | File[]) => {
        if (!files || files.length === 0) return;
        setIsUploading(true);
        try {
            const newItems: AttachmentItem[] = [];
            for (let i = 0; i < files.length; i++) {
                const item = await uploadFile(files[i]);
                if (item) newItems.push(item);
            }
            setAttachments(prev => [...prev, ...newItems]);
        } catch (err: any) {
            alert(err.message || 'Lỗi tải tệp tin');
        } finally {
            setIsUploading(false);
        }
    };

    // Handle Direct Image Paste (Ctrl+V)
    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        const imageFiles: File[] = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                if (blob) {
                    const ext = item.type.split('/')[1] || 'png';
                    const pastedFile = new File([blob], `anh-dan-${format(new Date(), 'yyyyMMdd-HHmmss')}.${ext}`, { type: item.type });
                    imageFiles.push(pastedFile);
                }
            }
        }

        if (imageFiles.length > 0) {
            e.preventDefault();
            await handleFilesUpload(imageFiles);
        }
    }, []);

    // Handle Drag & Drop
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            await handleFilesUpload(files);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && attachments.length === 0) return;

        setIsSubmitting(true);
        try {
            const attachmentStr = attachments.length > 0 ? JSON.stringify(attachments) : undefined;
            const res = await createSalesEstimateNote(estimateId, content.trim(), attachmentStr);
            if (res.success) {
                setContent('');
                setAttachments([]);
            } else {
                alert('Lỗi: ' + res.error);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa ghi chú này?')) return;

        setIsDeletingId(noteId);
        try {
            const res = await deleteSalesEstimateNote(noteId);
            if (!res.success) {
                alert('Lỗi: ' + res.error);
            }
        } finally {
            setIsDeletingId(null);
        }
    };

    const isImageAttachment = (url: string, name?: string) => {
        const lower = (name || url).toLowerCase();
        return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '0.5rem', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                        <MessageSquare size={17} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b' }}>Ghi Chú & Tài Liệu Báo Giá</h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Ghi chú việc đã làm, cần làm, đính kèm file hoặc dán ảnh (Ctrl+V)</p>
                    </div>
                </div>
                {notes && notes.length > 0 && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569', padding: '0.2rem 0.6rem', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
                        {notes.length} ghi chú
                    </span>
                )}
            </div>

            <div style={{ padding: '1.25rem' }}>
                {/* Form Input with Drag & Drop and Paste */}
                <form onSubmit={handleSubmit} style={{ marginBottom: '1.25rem' }}>
                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        style={{
                            position: 'relative',
                            borderRadius: '0.75rem',
                            border: isDragging ? '2px dashed #3b82f6' : '1px solid #cbd5e1',
                            backgroundColor: isDragging ? '#eff6ff' : '#f8fafc',
                            padding: '0.75rem',
                            paddingBottom: '3.25rem',
                            transition: 'all 0.2s',
                            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)'
                        }}
                    >
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onPaste={handlePaste}
                            placeholder="Nhập việc đã làm / cần làm cho báo giá này, kéo thả file hoặc nhấn Ctrl+V để dán ảnh trực tiếp..."
                            style={{
                                width: '100%',
                                minHeight: '65px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                resize: 'vertical',
                                outline: 'none',
                                fontSize: '0.875rem',
                                color: '#1e293b',
                                fontFamily: 'inherit',
                                lineHeight: 1.5
                            }}
                        />

                        {/* Drag notice overlay */}
                        {isDragging && (
                            <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(239, 246, 255, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#2563eb', fontWeight: 600, fontSize: '0.875rem', borderRadius: '0.75rem', pointerEvents: 'none' }}>
                                <UploadCloud size={22} />
                                Thả tệp tin hoặc ảnh vào đây
                            </div>
                        )}

                        {/* Toolbar / Actions Bar */}
                        <div style={{ position: 'absolute', bottom: '0.625rem', left: '0.75rem', right: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
                                {/* File Picker */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                    onChange={(e) => {
                                        if (e.target.files) handleFilesUpload(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '0.375rem',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        color: '#475569',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        cursor: isUploading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                    }}
                                    title="Tải tệp đính kèm (PDF, Word, Excel, ZIP...)"
                                >
                                    <Paperclip size={14} color="#3b82f6" /> Đính kèm file
                                </button>

                                {/* Image Picker */}
                                <input
                                    ref={imageInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    style={{ display: 'none' }}
                                    disabled={isUploading}
                                    onChange={(e) => {
                                        if (e.target.files) handleFilesUpload(e.target.files);
                                        e.target.value = '';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => imageInputRef.current?.click()}
                                    disabled={isUploading}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.375rem',
                                        padding: '0.3rem 0.6rem',
                                        borderRadius: '0.375rem',
                                        backgroundColor: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        color: '#475569',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        cursor: isUploading ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                    }}
                                    title="Tải ảnh lên"
                                >
                                    <ImageIcon size={14} color="#10b981" /> Tải ảnh
                                </button>

                                {isUploading && (
                                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <span style={{ display: 'inline-block', width: '10px', height: '10px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                                        Đang tải...
                                    </span>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || (!content.trim() && attachments.length === 0) || isUploading}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.375rem',
                                    padding: '0.4rem 1rem',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.8125rem',
                                    fontWeight: 600,
                                    backgroundColor: ((content.trim() || attachments.length > 0) && !isSubmitting && !isUploading) ? '#2563eb' : '#94a3b8',
                                    color: 'white',
                                    border: 'none',
                                    cursor: ((content.trim() || attachments.length > 0) && !isSubmitting && !isUploading) ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 2px rgba(37,99,235,0.2)'
                                }}
                            >
                                {isSubmitting ? 'Đang lưu...' : <><Send size={13} /> Lưu Ghi Chú</>}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Pending Attachments Thumbnails */}
                {attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem', padding: '0.5rem', backgroundColor: '#f1f5f9', borderRadius: '0.5rem' }}>
                        {attachments.map((att, idx) => {
                            const isImg = isImageAttachment(att.url, att.name);
                            return (
                                <div key={idx} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#1e293b' }}>
                                    {isImg ? (
                                        <img src={att.url} alt={att.name} style={{ width: '22px', height: '22px', objectFit: 'cover', borderRadius: '0.25rem' }} />
                                    ) : (
                                        <FileText size={14} color="#3b82f6" />
                                    )}
                                    <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                    <button
                                        type="button"
                                        onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', padding: '0 2px' }}
                                        title="Xóa đính kèm"
                                    >
                                        <X size={13} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Notes List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {displayNotes && displayNotes.length > 0 ? (
                        displayNotes.map((note) => {
                            let parsedAttachments: AttachmentItem[] = [];
                            if (note.attachment) {
                                try {
                                    const parsed = JSON.parse(note.attachment);
                                    if (Array.isArray(parsed)) parsedAttachments = parsed;
                                    else if (typeof parsed === 'string') parsedAttachments = [{ url: parsed, name: 'Tài liệu đính kèm' }];
                                } catch (e) {
                                    parsedAttachments = [{ url: note.attachment, name: 'Tài liệu đính kèm' }];
                                }
                            }

                            return (
                                <div key={note.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                        <AvatarImage src={note.user?.avatar} name={note.user?.name} size={34} />
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{note.user?.name || 'User'}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    {format(new Date(note.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                                </span>
                                            </div>
                                            {(currentUserId === note.userId || currentUserRole === 'ADMIN') && (
                                                <button
                                                    onClick={() => handleDelete(note.id)}
                                                    disabled={isDeletingId === note.id}
                                                    style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '0.25rem', transition: 'all 0.2s' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                    title="Xóa ghi chú"
                                                >
                                                    {isDeletingId === note.id ? <span style={{ fontSize: '0.75rem' }}>...</span> : <Trash2 size={13} />}
                                                </button>
                                            )}
                                        </div>

                                        {note.content && (
                                            <div
                                                style={{ fontSize: '0.875rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}
                                                dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }}
                                            />
                                        )}

                                        {/* Attachments Display */}
                                        {parsedAttachments.length > 0 && (
                                            <div style={{ marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {parsedAttachments.map((att, aIdx) => {
                                                    const isImg = isImageAttachment(att.url, att.name);
                                                    if (isImg) {
                                                        return (
                                                            <div
                                                                key={aIdx}
                                                                onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Ảnh đính kèm' })}
                                                                style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', width: '90px', height: '70px', backgroundColor: '#f1f5f9' }}
                                                                title="Bấm để xem ảnh phóng to"
                                                            >
                                                                <img src={att.url} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.65rem', padding: '1px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {att.name}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <button
                                                            key={aIdx}
                                                            type="button"
                                                            onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.375rem',
                                                                padding: '0.35rem 0.6rem',
                                                                backgroundColor: 'white',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '0.375rem',
                                                                fontSize: '0.75rem',
                                                                color: '#2563eb',
                                                                fontWeight: 500,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s',
                                                                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                                            }}
                                                        >
                                                            <FileText size={13} />
                                                            <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {att.name || 'Tài liệu đính kèm'}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#94a3b8', fontSize: '0.8125rem' }}>
                            <FileText size={28} style={{ margin: '0 auto 0.375rem auto', opacity: 0.4 }} />
                            Chưa có ghi chú nào cho báo giá này.
                        </div>
                    )}
                </div>
            </div>

            {/* View All Modal Trigger if > 5 notes */}
            {notes && notes.length > 5 && (
                <div style={{ padding: '0.625rem 1.25rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                        className="hover:underline"
                    >
                        Xem tất cả {notes.length} ghi chú & tài liệu
                    </button>
                </div>
            )}

            {/* All Notes Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lịch Sử Ghi Chú & Tài Liệu Báo Giá">
                <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {notes?.map((note) => {
                            let parsedAttachments: AttachmentItem[] = [];
                            if (note.attachment) {
                                try {
                                    const parsed = JSON.parse(note.attachment);
                                    if (Array.isArray(parsed)) parsedAttachments = parsed;
                                    else if (typeof parsed === 'string') parsedAttachments = [{ url: parsed, name: 'Tài liệu đính kèm' }];
                                } catch (e) {
                                    parsedAttachments = [{ url: note.attachment, name: 'Tài liệu đính kèm' }];
                                }
                            }

                            return (
                                <div key={note.id} style={{ display: 'flex', gap: '0.75rem' }}>
                                    <div style={{ flexShrink: 0, marginTop: '2px' }}>
                                        <AvatarImage src={note.user?.avatar} name={note.user?.name} size={34} />
                                    </div>
                                    <div style={{ flex: 1, backgroundColor: '#f8fafc', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem' }}>{note.user?.name || 'User'}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                                    {format(new Date(note.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                                </span>
                                            </div>
                                        </div>

                                        {note.content && (
                                            <div
                                                style={{ fontSize: '0.875rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}
                                                dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }}
                                            />
                                        )}

                                        {parsedAttachments.length > 0 && (
                                            <div style={{ marginTop: '0.625rem', paddingTop: '0.625rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                {parsedAttachments.map((att, aIdx) => {
                                                    const isImg = isImageAttachment(att.url, att.name);
                                                    if (isImg) {
                                                        return (
                                                            <div
                                                                key={aIdx}
                                                                onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Ảnh đính kèm' })}
                                                                style={{ position: 'relative', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', width: '90px', height: '70px', backgroundColor: '#f1f5f9' }}
                                                            >
                                                                <img src={att.url} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.65rem', padding: '1px 4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                    {att.name}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return (
                                                        <button
                                                            key={aIdx}
                                                            type="button"
                                                            onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '0.375rem',
                                                                padding: '0.35rem 0.6rem',
                                                                backgroundColor: 'white',
                                                                border: '1px solid #cbd5e1',
                                                                borderRadius: '0.375rem',
                                                                fontSize: '0.75rem',
                                                                color: '#2563eb',
                                                                fontWeight: 500,
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            <FileText size={13} /> {att.name || 'Tài liệu đính kèm'}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            {/* Document / Image Preview Modal */}
            {previewDoc && (
                <DocumentPreviewModal
                    isOpen={!!previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    fileUrl={previewDoc.url}
                    fileName={previewDoc.name}
                />
            )}
        </div>
    );
}

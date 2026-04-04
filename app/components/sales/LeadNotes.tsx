'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FileText, User as UserIcon, Send, Trash2, Paperclip, MessageSquare } from 'lucide-react';
import { createLeadNote, deleteLeadNote } from '../../sales/leads/actions';
import { Modal } from '@/app/components/ui/Modal';
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';
import { autoLinkText } from '@/lib/utils/formatters';
import { AvatarImage } from '@/app/components/ui/AvatarImage';

interface LeadNotesProps {
    leadId: string;
    notes: any[];
    currentUserId: string;
    currentUserRole: string;
}

export function LeadNotes({ leadId, notes, currentUserId, currentUserRole }: LeadNotesProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<{ url: string, name: string }[]>([]);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);

    const displayNotes = notes?.slice(0, 5) || [];

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    setIsUploading(true);
                    const formData = new FormData();
                    formData.append('file', file);
                    fetch('/api/upload', {
                        method: 'POST',
                        body: formData
                    })
                        .then(res => res.json())
                        .then(data => {
                            if (data.url) {
                                setAttachments(prev => [...prev, { url: data.url, name: file.name || 'image.png' }]);
                            }
                        })
                        .catch(err => {
                            console.error("Paste upload error", err);
                            alert("Lỗi khi tải ảnh clipboard");
                        })
                        .finally(() => setIsUploading(false));
                }
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && attachments.length === 0) return;

        setIsSubmitting(true);
        try {
            const attachmentStr = attachments.length > 0 ? JSON.stringify(attachments) : undefined;
            const res = await createLeadNote(leadId, content.trim(), attachmentStr);
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
            const res = await deleteLeadNote(noteId);
            if (!res.success) {
                alert('Lỗi: ' + res.error);
            }
        } finally {
            setIsDeletingId(null);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', overflow: 'hidden', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} color="#64748b" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Ghi Chép & Tài Liệu</h3>
            </div>

            <div style={{ padding: '1.5rem' }}>
                {/* Submit Note Form */}
                <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
                    <div style={{ position: 'relative', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', padding: '0.75rem', paddingBottom: '3rem', transition: 'all 0.2s', boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)' }}
                        onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onPaste={handlePaste}
                            placeholder="Ghi chú chi tiết trao đổi, hoặc kéo thả/dán (Ctrl+V) tài liệu vào đây..."
                            style={{ width: '100%', minHeight: '60px', border: 'none', backgroundColor: 'transparent', resize: 'vertical', outline: 'none', fontSize: '0.875rem', color: '#1e293b', fontFamily: 'inherit' }}
                        />
                        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                            const files = e.target.files;
                                            if (!files || files.length === 0) return;
                                            setIsUploading(true);
                                            try {
                                                const newAttachments = [...attachments];
                                                for (let i = 0; i < files.length; i++) {
                                                    const formData = new FormData();
                                                    formData.append('file', files[i]);
                                                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                                    if (!res.ok) throw new Error('Upload failed');
                                                    const data = await res.json();
                                                    newAttachments.push({ url: data.url, name: files[i].name });
                                                }
                                                setAttachments(newAttachments);
                                            } catch (err) {
                                                alert('Lỗi tải hình ảnh');
                                            } finally {
                                                setIsUploading(false);
                                                e.target.value = '';
                                            }
                                        }}
                                        title="Thêm hình ảnh"
                                    />
                                    <button type="button" disabled={isUploading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0.375rem', backgroundColor: 'transparent', border: 'none', color: isUploading ? '#cbd5e1' : '#64748b', cursor: isUploading ? 'not-allowed' : 'pointer' }} title="Thêm hình ảnh" className="hover:bg-slate-200">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                    </button>
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type="file"
                                        multiple
                                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                                        disabled={isUploading}
                                        onChange={async (e) => {
                                            const files = e.target.files;
                                            if (!files || files.length === 0) return;
                                            setIsUploading(true);
                                            try {
                                                const newAttachments = [...attachments];
                                                for (let i = 0; i < files.length; i++) {
                                                    const formData = new FormData();
                                                    formData.append('file', files[i]);
                                                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                                    if (!res.ok) throw new Error('Upload failed');
                                                    const data = await res.json();
                                                    newAttachments.push({ url: data.url, name: files[i].name });
                                                }
                                                setAttachments(newAttachments);
                                            } catch (err) {
                                                alert('Lỗi tải tệp tin');
                                            } finally {
                                                setIsUploading(false);
                                                e.target.value = '';
                                            }
                                        }}
                                        title="Đính kèm tài liệu"
                                    />
                                    <button type="button" disabled={isUploading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0.375rem', backgroundColor: 'transparent', border: 'none', color: isUploading ? '#cbd5e1' : '#64748b', cursor: isUploading ? 'not-allowed' : 'pointer' }} title="Đính kèm file" className="hover:bg-slate-200">
                                        <Paperclip size={16} />
                                    </button>
                                </div>
                                {isUploading && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đang tải...</span>}
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting || (!content.trim() && attachments.length === 0) || isUploading}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 1rem', borderRadius: '0.375rem', fontSize: '0.875rem', fontWeight: 500, backgroundColor: ((content.trim() || attachments.length > 0) && !isSubmitting && !isUploading) ? '#2563eb' : '#94a3b8', color: 'white', border: 'none', cursor: ((content.trim() || attachments.length > 0) && !isSubmitting && !isUploading) ? 'pointer' : 'not-allowed', transition: 'background-color 0.2s' }}
                            >
                                {isSubmitting ? 'Đang lưu...' : <><Send size={14} /> Gửi Ý Kiến</>}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Pending Attachments List */}
                {attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {attachments.map((att, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4338ca', maxWidth: '100%', minWidth: 0 }}>
                                <FileText size={12} style={{ flexShrink: 0 }} />
                                <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{att.name}</span>
                                <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Notes List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '4px' }}>
                    {displayNotes && displayNotes.length > 0 ? (
                        displayNotes.map((note) => (
                            <div key={note.id} style={{ display: 'flex', gap: '1rem', minWidth: 0, width: '100%' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <AvatarImage
                                        src={note.user?.avatar}
                                        name={note.user?.name}
                                        size={40}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {note.content && note.content.trim() ? (
                                        <div style={{ display: 'inline-block', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', minWidth: '250px', maxWidth: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{note.user?.name || 'User'}</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {format(new Date(note.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                                    </span>
                                                </div>
                                                {(currentUserId === note.userId || currentUserRole === 'ADMIN') && (
                                                    <button
                                                        onClick={() => handleDelete(note.id)}
                                                        disabled={isDeletingId === note.id}
                                                        style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '0.25rem', transition: 'all 0.2s', marginLeft: '1rem' }}
                                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                        title="Xóa ghi chú"
                                                    >
                                                        {isDeletingId === note.id ? <span style={{ fontSize: '0.75rem' }}>...</span> : <Trash2 size={14} />}
                                                    </button>
                                                )}
                                            </div>
                                            <div
                                                style={{ fontSize: '0.9375rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5, wordBreak: 'break-word' }}
                                                dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{note.user?.name || 'User'}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {format(new Date(note.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                                </span>
                                            </div>
                                            {(currentUserId === note.userId || currentUserRole === 'ADMIN') && (
                                                <button
                                                    onClick={() => handleDelete(note.id)}
                                                    disabled={isDeletingId === note.id}
                                                    style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '0.25rem', transition: 'all 0.2s', marginLeft: '1rem' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                    title="Xóa ghi chú"
                                                >
                                                    {isDeletingId === note.id ? <span style={{ fontSize: '0.75rem' }}>...</span> : <Trash2 size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {note.attachment && (() => {
                                        try {
                                            const parsed = JSON.parse(note.attachment);
                                            if (Array.isArray(parsed) && parsed.length > 0) {
                                                return (
                                                    <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {parsed.map((att: any, idx: number) => {
                                                            const isImage = att.url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || (att.name && att.name.match(/\.(jpeg|jpg|gif|png|webp)$/i));
                                                            if (isImage) {
                                                                return (
                                                                    <div key={idx} style={{ position: 'relative', height: '120px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', maxWidth: '100%', backgroundColor: '#f1f5f9' }} onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Hỉnh ảnh đính kèm' })}>
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={att.url} alt={att.name || 'Image'} style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
                                                                    </div>
                                                                );
                                                            } else {
                                                                return (
                                                                    <button key={idx} onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#4338ca', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '100%', minWidth: 0 }} className="hover:bg-slate-50">
                                                                        <FileText size={16} style={{ flexShrink: 0, color: '#6366f1' }} />
                                                                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, fontWeight: 500 }}>
                                                                            {att.name || 'Tài liệu đính kèm'}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            }
                                                        })}
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            return (
                                                <div style={{ marginTop: '0.25rem' }}>
                                                    <button onClick={() => setPreviewDoc({ url: note.attachment, name: 'Tài liệu đính kèm' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#4338ca', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '100%', minWidth: 0 }} className="hover:bg-slate-50">
                                                        <FileText size={16} style={{ flexShrink: 0, color: '#6366f1' }} />
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, fontWeight: 500 }}>
                                                            Xem đính kèm
                                                        </span>
                                                    </button>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8', fontSize: '0.875rem' }}>
                            <FileText size={32} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
                            Chưa có ghi chép nào.
                        </div>
                    )}
                </div>
            </div>

            {(notes && notes.length > 5) && (
                <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', textAlign: 'center' }}>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '0.875rem', fontWeight: 500, cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', width: '100%' }}
                        className="hover:text-blue-700 hover:underline"
                    >
                        Xem toàn bộ lịch sử ghi chú ({notes.length} thao tác)
                    </button>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lịch Sử Ghi Chép">
                <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {notes?.map((note) => (
                            <div key={note.id} style={{ display: 'flex', gap: '1rem', minWidth: 0, width: '100%' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <AvatarImage
                                        src={note.user?.avatar}
                                        name={note.user?.name}
                                        size={40}
                                    />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {note.content && note.content.trim() ? (
                                        <div style={{ display: 'inline-block', backgroundColor: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', minWidth: '250px', maxWidth: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{note.user?.name || 'User'}</span>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                        {format(new Date(note.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                style={{ fontSize: '0.9375rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5, wordBreak: 'break-word' }}
                                                dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{note.user?.name || 'User'}</span>
                                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                    {format(new Date(note.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {note.attachment && (() => {
                                        try {
                                            const parsed = JSON.parse(note.attachment);
                                            if (Array.isArray(parsed) && parsed.length > 0) {
                                                return (
                                                    <div style={{ marginTop: '0.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {parsed.map((att: any, idx: number) => {
                                                            const isImage = att.url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || (att.name && att.name.match(/\.(jpeg|jpg|gif|png|webp)$/i));
                                                            if (isImage) {
                                                                return (
                                                                    <div key={idx} style={{ position: 'relative', height: '120px', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid #cbd5e1', cursor: 'pointer', maxWidth: '100%', backgroundColor: '#f1f5f9' }} onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Hỉnh ảnh đính kèm' })}>
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={att.url} alt={att.name || 'Image'} style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
                                                                    </div>
                                                                );
                                                            } else {
                                                                return (
                                                                    <button key={idx} onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#4338ca', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '100%', minWidth: 0 }} className="hover:bg-slate-50">
                                                                        <FileText size={16} style={{ flexShrink: 0, color: '#6366f1' }} />
                                                                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, fontWeight: 500 }}>
                                                                            {att.name || 'Tài liệu đính kèm'}
                                                                        </span>
                                                                    </button>
                                                                );
                                                            }
                                                        })}
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            return (
                                                <div style={{ marginTop: '0.25rem' }}>
                                                    <button onClick={() => setPreviewDoc({ url: note.attachment, name: 'Tài liệu đính kèm' })} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.75rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#4338ca', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', maxWidth: '100%', minWidth: 0 }} className="hover:bg-slate-50">
                                                        <FileText size={16} style={{ flexShrink: 0, color: '#6366f1' }} />
                                                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, fontWeight: 500 }}>
                                                            Xem đính kèm
                                                        </span>
                                                    </button>
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </Modal>

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

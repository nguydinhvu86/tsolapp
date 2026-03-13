'use client'

import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MessageSquare, Paperclip, Send, Trash2, User as UserIcon, FileText } from 'lucide-react';
import { createCustomerNote, deleteCustomerNote } from '../../customers/[id]/actions';

interface CustomerNotesPanelProps {
    customerId: string;
    notes: any[];
    currentUserId: string;
    currentUserRole: string;
}

export function CustomerNotesPanel({ customerId, notes, currentUserId, currentUserRole }: CustomerNotesPanelProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<{ url: string, name: string }[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && attachments.length === 0) return;

        setIsSubmitting(true);
        try {
            const attachmentStr = attachments.length > 0 ? JSON.stringify(attachments) : undefined;
            const res = await createCustomerNote(customerId, content.trim(), attachmentStr);
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
            const res = await deleteCustomerNote(noteId);
            if (!res.success) {
                alert('Lỗi: ' + res.error);
            }
        } finally {
            setIsDeletingId(null);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MessageSquare size={18} color="#64748b" />
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>Tủ Hồ Sơ & Ghi Chú</h3>
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
                            onPaste={async (e) => {
                                const items = e.clipboardData.items;
                                for (let i = 0; i < items.length; i++) {
                                    if (items[i].type.indexOf('image') !== -1) {
                                        const file = items[i].getAsFile();
                                        if (file) {
                                            if (file.size > 5242880) {
                                                alert(`File ảnh dán vào quá lớn (Tối đa 5MB)`);
                                                return;
                                            }
                                            setIsUploading(true);
                                            try {
                                                const formData = new FormData();
                                                formData.append('file', file);
                                                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                                                if (!res.ok) throw new Error('Upload failed');
                                                const data = await res.json();
                                                setAttachments(prev => [...prev, { url: data.url, name: file.name || 'image.png' }]);
                                            } catch (err) {
                                                alert('Lỗi tải hình ảnh từ clipboard');
                                            } finally {
                                                setIsUploading(false);
                                            }
                                        }
                                    }
                                }
                            }}
                            placeholder="Ghi chú sở thích khách hàng, tóm tắt cuộc gọi, lịch sử làm việc... (Có thể dán trực tiếp ảnh ctrl+V)"
                            style={{ width: '100%', minHeight: '60px', border: 'none', backgroundColor: 'transparent', resize: 'vertical', outline: 'none', fontSize: '0.875rem', color: '#1e293b', fontFamily: 'inherit' }}
                        />
                        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', right: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
                                        title="Đính kèm tài liệu ảnh"
                                    />
                                    <button type="button" disabled={isUploading} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '0.375rem', backgroundColor: 'transparent', border: 'none', color: isUploading ? '#cbd5e1' : '#64748b', cursor: isUploading ? 'not-allowed' : 'pointer' }} title="Đính kèm file">
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
                                {isSubmitting ? 'Đang lưu...' : <><Send size={14} /> Lưu Ghi Chú</>}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Pending Attachments List */}
                {attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {attachments.map((att, idx) => {
                            const isImage = att.url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i) != null;
                            if (isImage) {
                                return (
                                    <div key={idx} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                        <img src={att.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <button onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer', display: 'flex' }}>
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                );
                            }
                            return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4338ca' }}>
                                    <FileText size={12} />
                                    <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                    <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Notes Timeline List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {notes && notes.length > 0 ? (
                        notes.map((note) => (
                            <div key={note.id} style={{ display: 'flex', gap: '1rem' }}>
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                                        {note.user?.avatar ? (
                                            <img src={note.user.avatar} alt={note.user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <UserIcon size={18} color="#64748b" />
                                        )}
                                    </div>
                                </div>
                                <div style={{ flex: 1, backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
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
                                                style={{ backgroundColor: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '0.25rem', transition: 'all 0.2s' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; e.currentTarget.style.color = '#ef4444'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                                                title="Xóa tài liệu"
                                            >
                                                {isDeletingId === note.id ? <span style={{ fontSize: '0.75rem' }}>...</span> : <Trash2 size={14} />}
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.9375rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                        {note.content}
                                    </div>
                                    {note.attachment && (() => {
                                        try {
                                            const parsed = JSON.parse(note.attachment);
                                            if (Array.isArray(parsed) && parsed.length > 0) {
                                                return (
                                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {parsed.map((att: any, idx: number) => (
                                                            <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4f46e5', textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} onMouseEnter={(e) => e.currentTarget.style.borderColor = '#c7d2fe'} onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}>
                                                                <FileText size={12} /> {att.name || 'Tài liệu đính kèm'}
                                                            </a>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            return (
                                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1' }}>
                                                    <a href={note.attachment} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4f46e5', textDecoration: 'none' }}>
                                                        <FileText size={12} /> Xem đính kèm
                                                    </a>
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
                            <p>Tủ hồ sơ trống. Hãy viết ghi chú hoặc tải lên tài liệu đầu tiên.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

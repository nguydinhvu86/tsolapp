'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FileText, User as UserIcon, Send, Trash2, Paperclip, MessageSquare } from 'lucide-react';
import { createSalesInvoiceNote, deleteSalesInvoiceNote } from '../../sales/invoices/actions';
import { Modal } from '@/app/components/ui/Modal';
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';
import { autoLinkText } from '@/lib/utils/formatters';

interface SalesInvoiceNotesProps {
    invoiceId: string;
    notes: any[];
    currentUserId: string;
    currentUserRole: string;
}

export function SalesInvoiceNotes({ invoiceId, notes, currentUserId, currentUserRole }: SalesInvoiceNotesProps) {
    const [content, setContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [attachments, setAttachments] = useState<{ url: string, name: string }[]>([]);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);

    const displayNotes = notes?.slice(0, 5) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && attachments.length === 0) return;

        setIsSubmitting(true);
        try {
            const attachmentStr = attachments.length > 0 ? JSON.stringify(attachments) : undefined;
            const res = await createSalesInvoiceNote(invoiceId, content.trim(), attachmentStr);
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
            const res = await deleteSalesInvoiceNote(noteId);
            if (!res.success) {
                alert('Lỗi: ' + res.error);
            }
        } finally {
            setIsDeletingId(null);
        }
    };

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)', marginBottom: '2rem', overflow: 'hidden' }}>
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
                            placeholder="Ghi chú các thông tin quan trọng như: S/N, hạn bảo hành, số chứng từ, hoặc kéo thả tài liệu vào đây..."
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
                                        title="Đính kèm tài liệu"
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
                                {isSubmitting ? 'Đang lưu...' : <><Send size={14} /> Gửi Ý Kiến</>}
                            </button>
                        </div>
                    </div>
                </form>

                {/* Pending Attachments List */}
                {attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        {attachments.map((att, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4338ca' }}>
                                <FileText size={12} />
                                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</span>
                                <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Notes List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {displayNotes && displayNotes.length > 0 ? (
                        displayNotes.map((note) => (
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
                                                title="Xóa ghi chú"
                                            >
                                                {isDeletingId === note.id ? <span style={{ fontSize: '0.75rem' }}>...</span> : <Trash2 size={14} />}
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '0.9375rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                                        dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }} />
                                    {note.attachment && (() => {
                                        try {
                                            const parsed = JSON.parse(note.attachment);
                                            if (Array.isArray(parsed) && parsed.length > 0) {
                                                return (
                                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {parsed.map((att: any, idx: number) => (
                                                            <button key={idx} onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4f46e5', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} className="hover:border-indigo-200">
                                                                <FileText size={12} /> {att.name || 'Tài liệu đính kèm'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            return (
                                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1' }}>
                                                    <button onClick={() => setPreviewDoc({ url: note.attachment, name: 'Tài liệu đính kèm' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4f46e5', cursor: 'pointer' }} className="hover:border-indigo-200">
                                                        <FileText size={12} /> Xem đính kèm
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
                            Chưa có ghi chép nào cho hóa đơn này.
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

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lịch Sử Ghi Chép Hóa Đơn">
                <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {notes?.map((note) => (
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
                                    </div>
                                    <div style={{ fontSize: '0.9375rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}
                                        dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }} />
                                    {note.attachment && (() => {
                                        try {
                                            const parsed = JSON.parse(note.attachment);
                                            if (Array.isArray(parsed) && parsed.length > 0) {
                                                return (
                                                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                        {parsed.map((att: any, idx: number) => (
                                                            <button key={idx} onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4f46e5', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }} className="hover:border-indigo-200">
                                                                <FileText size={12} /> {att.name || 'Tài liệu đính kèm'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            return (
                                                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #cbd5e1' }}>
                                                    <button onClick={() => setPreviewDoc({ url: note.attachment, name: 'Tài liệu đính kèm' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.5rem', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '0.375rem', fontSize: '0.75rem', color: '#4f46e5', cursor: 'pointer' }} className="hover:border-indigo-200">
                                                        <FileText size={12} /> Xem đính kèm
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

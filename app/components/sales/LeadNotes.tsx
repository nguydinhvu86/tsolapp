'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { FileText, Send, Trash2, Paperclip, MessageSquare, ImageIcon, Loader2 } from 'lucide-react';
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
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                    <MessageSquare size={16} className="text-slate-500" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        Ghi Chép & Tài Liệu
                    </h3>
                </div>
                <span className="text-[11px] font-semibold text-slate-400">
                    {notes?.length || 0} ghi chú
                </span>
            </div>

            {/* Submit Note Form */}
            <form onSubmit={handleSubmit} className="space-y-2">
                <div className="relative rounded-xl border border-slate-200 bg-slate-50/60 p-3 pb-11 transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Ghi chú chi tiết trao đổi, hoặc kéo thả/dán (Ctrl+V) tài liệu vào đây..."
                        className="w-full min-h-[60px] border-none bg-transparent resize-y outline-none text-xs text-slate-800 placeholder:text-slate-400 leading-relaxed font-sans"
                    />
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                            {/* Upload Image */}
                            <label className="relative cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors" title="Thêm hình ảnh">
                                <ImageIcon size={15} />
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="hidden"
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
                                />
                            </label>

                            {/* Upload Document */}
                            <label className="relative cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors" title="Đính kèm tài liệu">
                                <Paperclip size={15} />
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
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
                                />
                            </label>

                            {isUploading && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                    <Loader2 size={12} className="animate-spin text-emerald-600" /> Đang tải...
                                </span>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || (!content.trim() && attachments.length === 0) || isUploading}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
                                (content.trim() || attachments.length > 0) && !isSubmitting && !isUploading
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {isSubmitting ? (
                                <><Loader2 size={12} className="animate-spin" /> Đang lưu...</>
                            ) : (
                                <><Send size={12} /> Gửi Ý Kiến</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Pending Attachments List */}
                {attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                        {attachments.map((att, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-lg text-xs text-emerald-800 max-w-full">
                                <FileText size={12} className="shrink-0 text-emerald-600" />
                                <span className="truncate max-w-[180px] font-medium">{att.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
                                    className="text-emerald-600 hover:text-rose-600 p-0.5 cursor-pointer"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </form>

            {/* Notes List */}
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
                {displayNotes && displayNotes.length > 0 ? (
                    displayNotes.map((note) => (
                        <div key={note.id} className="flex items-start gap-3 group">
                            <div className="shrink-0 mt-0.5">
                                <AvatarImage
                                    src={note.user?.avatar}
                                    name={note.user?.name}
                                    size={32}
                                />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 space-y-1.5">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-slate-900">{note.user?.name || 'Người dùng'}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {format(new Date(note.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                            </span>
                                        </div>
                                        {(currentUserId === note.userId || currentUserRole === 'ADMIN') && (
                                            <button
                                                onClick={() => handleDelete(note.id)}
                                                disabled={isDeletingId === note.id}
                                                className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5"
                                                title="Xóa ghi chú"
                                            >
                                                {isDeletingId === note.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={13} />}
                                            </button>
                                        )}
                                    </div>

                                    {note.content && note.content.trim() && (
                                        <div
                                            className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed break-words"
                                            dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }}
                                        />
                                    )}

                                    {note.attachment && (() => {
                                        try {
                                            const parsed = JSON.parse(note.attachment);
                                            if (Array.isArray(parsed) && parsed.length > 0) {
                                                return (
                                                    <div className="flex flex-wrap gap-2 pt-1.5">
                                                        {parsed.map((att: any, idx: number) => {
                                                            const isImage = att.url?.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) || (att.name && att.name.match(/\.(jpeg|jpg|gif|png|webp)$/i));
                                                            if (isImage) {
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="relative h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:opacity-90"
                                                                        onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Hình ảnh đính kèm' })}
                                                                    >
                                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                        <img src={att.url} alt={att.name || 'Image'} className="h-full w-auto object-cover" />
                                                                    </div>
                                                                );
                                                            } else {
                                                                return (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })}
                                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg text-xs text-slate-700 cursor-pointer transition-all shadow-2xs"
                                                                    >
                                                                        <FileText size={13} className="text-emerald-600 shrink-0" />
                                                                        <span className="truncate max-w-[160px] font-medium">{att.name || 'Tài liệu'}</span>
                                                                    </button>
                                                                );
                                                            }
                                                        })}
                                                    </div>
                                                );
                                            }
                                        } catch (e) {
                                            return (
                                                <button
                                                    onClick={() => setPreviewDoc({ url: note.attachment, name: 'Tài liệu đính kèm' })}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg text-xs text-slate-700 cursor-pointer transition-all shadow-2xs"
                                                >
                                                    <FileText size={13} className="text-emerald-600 shrink-0" />
                                                    <span className="font-medium">Xem đính kèm</span>
                                                </button>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-6 text-slate-400 text-xs">
                        <FileText size={24} className="mx-auto mb-1.5 opacity-40" />
                        Chưa có ghi chép nào.
                    </div>
                )}
            </div>

            {notes && notes.length > 5 && (
                <div className="pt-2 border-t border-slate-100 text-center">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                        Xem toàn bộ lịch sử ghi chú ({notes.length} mục)
                    </button>
                </div>
            )}

            {/* All Notes Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Lịch Sử Ghi Chép">
                <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
                    {notes?.map((note) => (
                        <div key={note.id} className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                                <AvatarImage
                                    src={note.user?.avatar}
                                    name={note.user?.name}
                                    size={32}
                                />
                            </div>
                            <div className="flex-1 min-w-0 bg-slate-50 rounded-xl p-3 border border-slate-200/70 space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-900">{note.user?.name || 'Người dùng'}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        {format(new Date(note.createdAt), 'HH:mm - dd/MM/yyyy', { locale: vi })}
                                    </span>
                                </div>
                                {note.content && note.content.trim() && (
                                    <div
                                        className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed break-words"
                                        dangerouslySetInnerHTML={{ __html: autoLinkText(note.content) }}
                                    />
                                )}
                            </div>
                        </div>
                    ))}
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

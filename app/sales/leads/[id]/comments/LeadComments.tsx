'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MessageSquare, ImageIcon, Paperclip, Send, Trash2 } from 'lucide-react';
import { createLeadComment, deleteLeadComment } from './actions';
import { Button } from '@/app/components/ui/Button';

export function LeadComments({ leadId, initialComments = [], users = [] }: { leadId: string, initialComments?: any[], users?: any[] }) {
    const { data: session } = useSession();
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [attachments, setAttachments] = useState<{ url: string, name: string }[]>([]);

    const handleAddComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newComment.trim() && attachments.length === 0) return;

        setIsSaving(true);
        try {
            const filesStr = attachments.length > 0 ? JSON.stringify(attachments) : undefined;
            // Dùng \n thành <br/> để hiển thị xuống dòng an toàn hoặc để nguyên tùy CSS
            const finalHtml = newComment.replace(/\n/g, '<br/>');

            const res = await createLeadComment(leadId, finalHtml, undefined, filesStr);
            if (res.success && res.data) {
                setComments([res.data, ...comments]);
                setNewComment('');
                setAttachments([]);
            } else {
                alert(res.error || 'Lỗi gửi bình luận');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteComment = async (commentId: string) => {
        if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;
        try {
            const res = await deleteLeadComment(commentId);
            if (res.success) {
                setComments(comments.filter(c => c.id !== commentId));
            } else {
                alert(res.error || 'Lỗi xóa bình luận');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsSaving(true);
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
            setIsSaving(false);
            e.target.value = '';
        }
    };

    return (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#6366f1" /> Thảo luận nội bộ
                <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '99px', fontSize: '12px' }}>{comments.length}</span>
            </h3>

            {/* Comment Form */}
            <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <div style={{ position: 'relative' }}>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        style={{
                            width: '100%',
                            minHeight: '80px',
                            padding: '0.75rem',
                            paddingBottom: '2.5rem',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            resize: 'vertical',
                            fontSize: '0.95rem',
                            lineHeight: 1.5,
                            outline: 'none',
                            fontFamily: 'inherit'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                        onBlur={(e) => e.target.style.borderColor = '#cbd5e1'}
                        placeholder="Thêm tin nhắn, trao đổi, thông tin về khách hàng này..."
                    />
                    <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                        <label style={{ cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px' }} className="hover:bg-slate-200">
                            <Paperclip size={18} />
                            <input type="file" hidden multiple onChange={handleFileUpload} disabled={isSaving} />
                        </label>
                    </div>
                    <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem' }}>
                        <Button
                            onClick={() => handleAddComment()}
                            disabled={isSaving || (!newComment.trim() && attachments.length === 0)}
                            style={{ padding: '6px 16px', height: 'auto', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            {isSaving ? 'Đang gửi...' : <><Send size={14} /> Gửi</>}
                        </Button>
                    </div>
                </div>

                {/* Pending Attachments */}
                {attachments.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                        {attachments.map((att, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '12px', color: '#4338ca' }}>
                                <Paperclip size={12} />
                                <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name || 'Tệp đính kèm'}</span>
                                <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', display: 'flex' }}>
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {comments.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', fontStyle: 'italic' }}>Chưa có thảo luận nào.</p>
                ) : (
                    comments.map((c: any) => {
                        let parsedFiles: any[] = [];
                        if (c.files) {
                            try { parsedFiles = JSON.parse(c.files); } catch (e) { }
                        }

                        const isOwner = session?.user?.id === c.userId;
                        const isAdmin = session?.user?.role === 'ADMIN';

                        return (
                            <div key={c.id} style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', backgroundColor: '#f1f5f9', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '14px', border: '1px solid #e2e8f0' }}>
                                    {c.user?.name?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{c.user?.name || c.user?.email || 'Người dùng'}</span>
                                        <span style={{ fontSize: '12px', color: '#64748b' }}>
                                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                                        </span>
                                    </div>

                                    {/* Text Content */}
                                    {c.content && c.content !== '<br/>' && c.content !== '' && (
                                        <div
                                            style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '0px 12px 12px 12px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#334155', lineHeight: 1.5, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
                                            dangerouslySetInnerHTML={{ __html: c.content }}
                                        />
                                    )}

                                    {/* Attachments */}
                                    {parsedFiles.length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: c.content ? '8px' : '0' }}>
                                            {parsedFiles.map((att, idx) => (
                                                <a key={idx} href={att.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', color: '#4f46e5', textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} className="hover:border-indigo-300 hover:bg-indigo-50">
                                                    <Paperclip size={14} style={{ color: '#6366f1' }} /> {att.name || 'Tài liệu đính kèm'}
                                                </a>
                                            ))}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {(isOwner || isAdmin) && (
                                        <div style={{ marginTop: '6px', display: 'flex', gap: '12px' }}>
                                            <button onClick={() => handleDeleteComment(c.id)} style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} className="hover:text-red-500">
                                                <Trash2 size={12} /> Xóa
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

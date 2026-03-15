'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MessageSquare, ImageIcon, Paperclip, Send, Trash2 } from 'lucide-react';
import { createLeadComment, deleteLeadComment, toggleLeadCommentReaction } from './actions';
import { Button } from '@/app/components/ui/Button';
import { useRouter } from 'next/navigation';
import { DocumentPreviewModal } from '@/app/components/ui/DocumentPreviewModal';

const EMOJIS = ['👍', '❤️', '😂', '🎉', '👀'];

export function LeadComments({ leadId, initialComments = [], users = [] }: { leadId: string, initialComments?: any[], users?: any[] }) {
    const { data: session } = useSession();
    const router = useRouter();
    const [comments, setComments] = useState(initialComments);
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Attachments
    const [commentImages, setCommentImages] = useState<{ url: string, file: File }[]>([]);
    const [attachments, setAttachments] = useState<{ url: string, name: string }[]>([]);

    // Lightbox State
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);

    React.useEffect(() => {
        setComments(initialComments);
    }, [initialComments]);

    const handleCommentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName.toLowerCase() === 'img') {
            setLightboxImage((target as HTMLImageElement).src);
        }
    };

    const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        Array.from(e.target.files).forEach(file => {
            if (file.size > 5242880) {
                alert(`File ${file.name} quá lớn (Tối đa 5MB)`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    const url = event.target.result as string;
                    setCommentImages(prev => [...prev, { url, file }]);
                }
            };
            reader.readAsDataURL(file);
        });
        e.target.value = ''; // Reset input
    };

    const removeCommentImage = (index: number) => {
        setCommentImages(prev => prev.filter((_, i) => i !== index));
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    if (file.size > 5242880) {
                        alert(`File ảnh dán vào quá lớn (Tối đa 5MB)`);
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        if (event.target?.result) {
                            const url = event.target.result as string;
                            setCommentImages(prev => [...prev, { url, file }]);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            }
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

    const handleAddComment = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!newComment.trim() && attachments.length === 0 && commentImages.length === 0) return;
        if (!session?.user?.id) return;

        setIsSaving(true);
        try {
            const filesStr = attachments.length > 0 ? JSON.stringify(attachments) : undefined;

            let finalHtml = newComment.replace(/\n/g, '<br/>');
            finalHtml = finalHtml.replace(/@([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF ]+?)(?=\s|$|<)/g, '<strong style="color: #4f46e5;">@$1</strong>');

            if (commentImages.length > 0) {
                const imgTags = commentImages.map(img => `<img src="${img.url}" style="max-width: 100%; max-height: 200px; border-radius: 8px; margin-top: 8px; cursor: pointer; border: 1px solid #e2e8f0;"/>`).join('');
                finalHtml += `<div style="display: flex; gap: 8px; flex-wrap: wrap;">${imgTags}</div>`;
            }

            // Optimistic update
            const parentId = replyTo;
            const optimisticComment = {
                id: 'temp-' + Date.now(),
                content: finalHtml,
                userId: session.user.id,
                parentId: parentId,
                createdAt: new Date().toISOString(),
                user: { id: session.user.id, name: session.user.name || session.user.email },
                reactions: [],
                files: filesStr
            };
            setComments(prev => [optimisticComment, ...prev]);

            setNewComment('');
            setAttachments([]);
            setCommentImages([]);
            setReplyTo(null);

            const res = await createLeadComment(leadId, finalHtml, parentId || undefined, undefined, filesStr);
            if (res.success && res.data) {
                router.refresh(); // Sync actual IDs
            } else {
                alert(res.error || 'Lỗi gửi bình luận');
                // Revert optimistic if needed
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
            // Optimistic
            setComments(prev => prev.filter(c => c.id !== commentId));

            const res = await deleteLeadComment(commentId);
            if (!res.success) {
                alert(res.error || 'Lỗi xóa bình luận');
                router.refresh();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleReaction = async (commentId: string, emoji: string) => {
        if (!session?.user?.id) return;
        const uid = session.user.id;

        // Optimistic Update
        setComments(prev => {
            return prev.map((c: any) => {
                if (c.id === commentId) {
                    const existingIdx = c.reactions?.findIndex((r: any) => r.emoji === emoji && r.user?.id === uid);
                    const newReactions = [...(c.reactions || [])];
                    if (existingIdx !== undefined && existingIdx >= 0) {
                        newReactions.splice(existingIdx, 1); // Remove
                    } else {
                        newReactions.push({ emoji, user: { id: uid, name: session.user?.name } }); // Add
                    }
                    return { ...c, reactions: newReactions };
                }
                return c;
            });
        });

        await toggleLeadCommentReaction(commentId, emoji, uid);
        router.refresh();
    };

    // Prepare comment tree
    const rootComments = comments.filter((c: any) => !c.parentId);
    const getReplies = (parentId: string) => comments.filter((c: any) => c.parentId === parentId);

    return (
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
            {/* Lighbox */}
            {lightboxImage && (
                <div
                    style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    onClick={() => setLightboxImage(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightboxImage} alt="Phóng to" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '8px' }} />
                </div>
            )}

            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#6366f1" /> Thảo luận nội bộ
                <span style={{ backgroundColor: '#e0e7ff', color: '#4f46e5', padding: '2px 8px', borderRadius: '99px', fontSize: '12px' }}>{comments.length}</span>
            </h3>

            {/* Main Comment Form */}
            {!replyTo && (
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
                            onPaste={handlePaste}
                            placeholder="Thêm tin nhắn, trao đổi, thông tin về khách hàng này (có thể dán ảnh trực tiếp)..."
                        />
                        <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                            <label style={{ cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px' }} className="hover:bg-slate-200">
                                <ImageIcon size={18} />
                                <input type="file" hidden multiple accept="image/*" onChange={handleCommentImageSelect} disabled={isSaving} />
                            </label>
                            <label style={{ cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px' }} className="hover:bg-slate-200">
                                <Paperclip size={18} />
                                <input type="file" hidden multiple onChange={handleFileUpload} disabled={isSaving} />
                            </label>
                        </div>
                        <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem' }}>
                            <Button
                                onClick={() => handleAddComment()}
                                disabled={isSaving || (!newComment.trim() && attachments.length === 0 && commentImages.length === 0)}
                                style={{ padding: '6px 16px', height: 'auto', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                                {isSaving ? 'Đang gửi...' : <><Send size={14} /> Gửi</>}
                            </Button>
                        </div>
                    </div>

                    {/* Pending Items */}
                    {(attachments.length > 0 || commentImages.length > 0) && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                            {commentImages.map((img, idx) => (
                                <div key={`img-${idx}`} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.url} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={() => removeCommentImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer', display: 'flex' }}>
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                            {attachments.map((att, idx) => (
                                <div key={`doc-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '12px', color: '#4338ca', height: 'max-content' }}>
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
            )}

            {/* Comments List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {rootComments.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', fontStyle: 'italic' }}>Chưa có thảo luận nào.</p>
                ) : (
                    rootComments.map((comment: any) => {
                        const replies = getReplies(comment.id);

                        const renderComment = (c: any, isReply = false) => {
                            let parsedFiles: any[] = [];
                            if (c.files) {
                                try { parsedFiles = JSON.parse(c.files); } catch (e) { }
                            }

                            const isOwner = session?.user?.id === c.userId;
                            const isAdmin = session?.user?.role === 'ADMIN';

                            // Group reactions by emoji
                            const reactionCounts = c.reactions?.reduce((acc: any, r: any) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {}) || {};

                            // Check if current user reacted
                            const userReactions = c.reactions?.filter((r: any) => r.user?.id === session?.user?.id).map((r: any) => r.emoji) || [];

                            return (
                                <div key={c.id} style={{ display: 'flex', gap: '12px', marginTop: isReply ? '1rem' : '0' }}>
                                    <div style={{ width: isReply ? '28px' : '36px', height: isReply ? '28px' : '36px', borderRadius: '50%', backgroundColor: isReply ? '#f1f5f9' : '#e0e7ff', color: isReply ? '#475569' : '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: isReply ? '12px' : '14px', border: '1px solid #e2e8f0' }}>
                                        {c.user?.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, fontSize: isReply ? '13px' : '14px', color: '#0f172a' }}>{c.user?.name || c.user?.email || 'Người dùng'}</span>
                                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                                {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                                            </span>
                                        </div>

                                        {/* Text Content */}
                                        {c.content && c.content !== '' && (
                                            <div
                                                style={{ padding: isReply ? '8px 12px' : '12px', backgroundColor: isReply ? '#f1f5f9' : '#f8fafc', borderRadius: '0px 12px 12px 12px', border: '1px solid #e2e8f0', fontSize: isReply ? '13.5px' : '14px', color: '#334155', lineHeight: 1.5, overflowWrap: 'anywhere' }}
                                                dangerouslySetInnerHTML={{ __html: c.content }}
                                                onClick={handleCommentClick}
                                            />
                                        )}

                                        {/* Document Attachments */}
                                        {parsedFiles.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: c.content ? '8px' : '0' }}>
                                                {parsedFiles.map((att, idx) => (
                                                    <button key={idx} onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', color: '#4f46e5', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }} className="hover:border-indigo-300 hover:bg-indigo-50">
                                                        <Paperclip size={12} style={{ color: '#6366f1' }} /> {att.name || 'Tài liệu đính kèm'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                                            {/* Reaction Summary */}
                                            {Object.keys(reactionCounts).length > 0 && (
                                                <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                                                        <div key={emoji} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', padding: '2px 6px', backgroundColor: userReactions.includes(emoji) ? '#e0e7ff' : '#f1f5f9', borderRadius: '12px', fontSize: '0.8rem', cursor: 'pointer', border: userReactions.includes(emoji) ? '1px solid #c7d2fe' : '1px solid transparent' }} onClick={() => handleToggleReaction(c.id, emoji)}>
                                                            <span>{emoji}</span>
                                                            <span style={{ color: userReactions.includes(emoji) ? '#4f46e5' : '#64748b', fontWeight: 600 }}>{count as number}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Quick Emojis & Actions */}
                                            <div style={{ display: 'flex', gap: '0.75rem', opacity: 0.8, alignItems: 'center' }}>
                                                {EMOJIS.slice(0, 3).map(emoji => (
                                                    <button key={emoji} onClick={() => handleToggleReaction(c.id, emoji)} style={{ fontSize: '0.85rem', cursor: 'pointer', transition: 'transform 0.1s', border: 'none', background: 'none' }} title="Thả cảm xúc" className="hover:scale-110">
                                                        {emoji}
                                                    </button>
                                                ))}

                                                {!isReply && (
                                                    <button onClick={() => {
                                                        // Reset form when clicking another reply
                                                        if (replyTo !== c.id) {
                                                            setNewComment('@' + (c.user?.name || 'Người dùng') + ' ');
                                                            setAttachments([]);
                                                            setCommentImages([]);
                                                        }
                                                        setReplyTo(c.id);
                                                    }} style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }} className="hover:text-indigo-600">
                                                        Trả lời
                                                    </button>
                                                )}

                                                {(isOwner || isAdmin) && (
                                                    <button onClick={() => handleDeleteComment(c.id)} style={{ fontSize: '12px', color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} className="hover:text-red-500">
                                                        Xóa
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Inline Reply Form */}
                                        {replyTo === c.id && !isReply && (
                                            <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '12px', border: '1px solid #3b82f6', marginTop: '12px', transition: 'all 0.2s', position: 'relative' }}>
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
                                                        onPaste={handlePaste}
                                                        placeholder="Viết câu trả lời của bạn (có thể dán ảnh trực tiếp)..."
                                                        autoFocus
                                                    />
                                                    <div style={{ position: 'absolute', bottom: '0.75rem', left: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                                                        <label style={{ cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px' }} className="hover:bg-slate-200">
                                                            <ImageIcon size={18} />
                                                            <input type="file" hidden multiple accept="image/*" onChange={handleCommentImageSelect} disabled={isSaving} />
                                                        </label>
                                                        <label style={{ cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px' }} className="hover:bg-slate-200">
                                                            <Paperclip size={18} />
                                                            <input type="file" hidden multiple onChange={handleFileUpload} disabled={isSaving} />
                                                        </label>
                                                    </div>
                                                    <div style={{ position: 'absolute', bottom: '0.75rem', right: '0.75rem', display: 'flex', gap: '8px' }}>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={() => setReplyTo(null)}
                                                            disabled={isSaving}
                                                            style={{ padding: '6px 16px', height: 'auto', fontSize: '13px' }}
                                                        >
                                                            Hủy
                                                        </Button>
                                                        <Button
                                                            onClick={() => handleAddComment()}
                                                            disabled={isSaving || (!newComment.trim() && attachments.length === 0 && commentImages.length === 0)}
                                                            style={{ padding: '6px 16px', height: 'auto', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                                                        >
                                                            {isSaving ? 'Đang gửi...' : <><Send size={14} /> Gửi trả lời</>}
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Pending Items in Reply */}
                                                {(attachments.length > 0 || commentImages.length > 0) && (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                                        {commentImages.map((img, idx) => (
                                                            <div key={`img-${idx}`} style={{ position: 'relative', width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img src={img.url} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                                <button onClick={() => removeCommentImage(idx)} style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', padding: '2px', cursor: 'pointer', display: 'flex' }}>
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        {attachments.map((att, idx) => (
                                                            <div key={`doc-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px', backgroundColor: '#e0e7ff', border: '1px solid #c7d2fe', borderRadius: '6px', fontSize: '12px', color: '#4338ca', height: 'max-content' }}>
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
                                        )}

                                        {/* Nested Replies */}
                                        {!isReply && replies.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid #e2e8f0' }}>
                                                {replies.map((r: any) => renderComment(r, true))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        };

                        return renderComment(comment);
                    })
                )}
            </div>

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

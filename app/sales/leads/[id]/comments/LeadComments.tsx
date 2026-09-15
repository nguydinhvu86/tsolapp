'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MessageSquare, ImageIcon, Paperclip, Send, Trash2, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { createLeadComment, deleteLeadComment, toggleLeadCommentReaction, getLeadComments } from './actions';
import { autoLinkHtml } from '@/lib/utils/formatters';
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

    const [commentImages, setCommentImages] = useState<{ url: string, file: File }[]>([]);
    const [attachments, setAttachments] = useState<{ url: string, name: string }[]>([]);

    // Upload Progress State
    const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

    // Lightbox State
    const [lightboxData, setLightboxData] = useState<{ images: string[], currentIndex: number } | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ url: string, name: string } | null>(null);

    React.useEffect(() => {
        setComments(initialComments);
    }, [initialComments]);

    React.useEffect(() => {
        const interval = setInterval(async () => {
            if (leadId) {
                const updatedComments = await getLeadComments(leadId);
                setComments((prev: any) => {
                    const hasTemp = prev.some((c: any) => c.id.toString().startsWith('temp-'));
                    if (hasTemp) return prev;
                    if (JSON.stringify(prev) !== JSON.stringify(updatedComments)) {
                        return updatedComments;
                    }
                    return prev;
                });
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [leadId]);

    const handleCommentClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        if (target.tagName.toLowerCase() === 'img') {
            const container = e.currentTarget;
            const images = Array.from(container.querySelectorAll('img')).map((img: HTMLImageElement) => img.src);
            const clickedSrc = (target as HTMLImageElement).src;
            const currentIndex = images.indexOf(clickedSrc);
            setLightboxData({ images, currentIndex: currentIndex >= 0 ? currentIndex : 0 });
        }
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lightboxData) {
            setLightboxData({ ...lightboxData, currentIndex: (lightboxData.currentIndex + 1) % lightboxData.images.length });
        }
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (lightboxData) {
            setLightboxData({ ...lightboxData, currentIndex: (lightboxData.currentIndex - 1 + lightboxData.images.length) % lightboxData.images.length });
        }
    };

    const handleCommentImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        Array.from(e.target.files).forEach(file => {
            if (file.size > 52428800) {
                alert(`File ${file.name} quá lớn (Tối đa 50MB)`);
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
                    if (file.size > 52428800) {
                        alert(`File ảnh dán vào quá lớn (Tối đa 50MB)`);
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
                const file = files[i];
                if (file.size > 52428800) continue;
                
                setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
                const formData = new FormData();
                formData.append('file', file);
                
                try {
                    const url = await new Promise<string>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.open('POST', '/api/upload', true);
                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                const percentComplete = Math.round((event.loaded / event.total) * 100);
                                setUploadProgress(prev => ({ ...prev, [file.name]: percentComplete }));
                            }
                        };
                        xhr.onload = () => {
                            if (xhr.status === 200) {
                                try { resolve(JSON.parse(xhr.responseText).url); } catch (e) { reject(new Error()); }
                            } else { reject(new Error()); }
                        };
                        xhr.onerror = () => reject(new Error());
                        xhr.send(formData);
                    });
                    newAttachments.push({ url, name: file.name });
                } catch (err) {
                    alert(`Không thể tải tệp: ${file.name}`);
                } finally {
                    setUploadProgress(prev => { const next = { ...prev }; delete next[file.name]; return next; });
                }
            }
            setAttachments(newAttachments);
        } finally {
            setIsSaving(false);
            e.target.value = '';
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() && attachments.length === 0 && commentImages.length === 0) return;
        if (!session?.user?.id) {
            alert('Bạn phải đăng nhập để bình luận');
            return;
        }

        setIsSaving(true);
        try {
            let finalHtml = newComment.trim();
            const filesStr = attachments.length > 0 ? JSON.stringify(attachments) : undefined;

            if (commentImages.length > 0) {
                const uploadedImages: string[] = [];
                for (const img of commentImages) {
                    const formData = new FormData();
                    formData.append('file', img.file);
                    setUploadProgress(prev => ({ ...prev, [img.file.name]: 0 }));

                    try {
                        const url = await new Promise<string>((resolve, reject) => {
                            const xhr = new XMLHttpRequest();
                            xhr.open('POST', '/api/upload', true);
                            xhr.upload.onprogress = (event) => {
                                if (event.lengthComputable) {
                                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                                    setUploadProgress(prev => ({ ...prev, [img.file.name]: percentComplete }));
                                }
                            };
                            xhr.onload = () => {
                                if (xhr.status === 200) {
                                    try { resolve(JSON.parse(xhr.responseText).url); } catch (e) { reject(new Error()); }
                                } else { reject(new Error()); }
                            };
                            xhr.onerror = () => reject(new Error());
                            xhr.send(formData);
                        });
                        uploadedImages.push(url);
                    } catch (err) {
                        throw new Error('Ảnh tải lên thất bại');
                    } finally {
                        setUploadProgress(prev => { const next = { ...prev }; delete next[img.file.name]; return next; });
                    }
                }

                const imgTags = uploadedImages.map(url => `<img src="${url}" class="max-w-full max-h-[200px] rounded-lg mt-2 cursor-pointer border border-slate-200 object-contain shadow-2xs"/>`).join('');
                finalHtml += `<div class="flex gap-2 flex-wrap">${imgTags}</div>`;
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
                router.refresh();
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

        setComments(prev => {
            return prev.map((c: any) => {
                if (c.id === commentId) {
                    const existingIdx = c.reactions?.findIndex((r: any) => r.emoji === emoji && r.user?.id === uid);
                    const newReactions = [...(c.reactions || [])];
                    if (existingIdx !== undefined && existingIdx >= 0) {
                        newReactions.splice(existingIdx, 1);
                    } else {
                        newReactions.push({ emoji, user: { id: uid, name: session.user?.name } });
                    }
                    return { ...c, reactions: newReactions };
                }
                return c;
            });
        });

        await toggleLeadCommentReaction(commentId, emoji, uid);
        router.refresh();
    };

    const rootComments = comments.filter((c: any) => !c.parentId);
    const getReplies = (parentId: string) => comments.filter((c: any) => c.parentId === parentId);

    return (
        <div className="space-y-4">
            {/* Lightbox Modal */}
            {lightboxData && (
                <div
                    className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center cursor-pointer p-4 backdrop-blur-xs"
                    onClick={() => setLightboxData(null)}
                >
                    <button className="absolute top-5 right-5 text-white/80 hover:text-white p-2 cursor-pointer z-10" onClick={() => setLightboxData(null)}>
                        <X size={28} />
                    </button>

                    {lightboxData.images.length > 1 && (
                        <button onClick={handlePrevImage} className="absolute left-5 bg-white/20 hover:bg-white/40 text-white rounded-full p-2.5 transition-all cursor-pointer z-10">
                            <ChevronLeft size={28} />
                        </button>
                    )}

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightboxData.images[lightboxData.currentIndex]} alt="Phóng to" className="max-w-[90%] max-h-[90%] object-contain rounded-xl shadow-2xl" />

                    {lightboxData.images.length > 1 && (
                        <button onClick={handleNextImage} className="absolute right-5 bg-white/20 hover:bg-white/40 text-white rounded-full p-2.5 transition-all cursor-pointer z-10">
                            <ChevronRight size={28} />
                        </button>
                    )}

                    {lightboxData.images.length > 1 && (
                        <div className="absolute bottom-5 text-white bg-black/60 px-4 py-1.5 rounded-full text-xs font-medium">
                            {lightboxData.currentIndex + 1} / {lightboxData.images.length}
                        </div>
                    )}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200/70 text-emerald-600 flex items-center justify-center">
                        <MessageSquare size={15} />
                    </div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Thảo luận nội bộ
                    </h2>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/80">
                    {comments.length} bình luận
                </span>
            </div>

            {/* Main Comment Form */}
            {!replyTo && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 pb-11 relative transition-all focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/10">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onPaste={handlePaste}
                        placeholder="Thêm tin nhắn, trao đổi, thông tin về khách hàng này (có thể dán ảnh trực tiếp)..."
                        className="w-full min-h-[65px] border-none bg-transparent resize-y outline-none text-xs text-slate-800 placeholder:text-slate-400 leading-relaxed font-sans"
                    />
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center">
                        <div className="flex items-center gap-1.5">
                            <label className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors" title="Thêm ảnh">
                                <ImageIcon size={15} />
                                <input type="file" hidden multiple accept="image/*" onChange={handleCommentImageSelect} disabled={isSaving} />
                            </label>
                            <label className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors" title="Đính kèm file">
                                <Paperclip size={15} />
                                <input type="file" hidden multiple onChange={handleFileUpload} disabled={isSaving} />
                            </label>
                            {isSaving && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                    <Loader2 size={12} className="animate-spin text-emerald-600" /> Đang tải...
                                </span>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddComment}
                            disabled={isSaving || (!newComment.trim() && attachments.length === 0 && commentImages.length === 0)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-2xs ${
                                (newComment.trim() || attachments.length > 0 || commentImages.length > 0) && !isSaving
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {isSaving ? <><Loader2 size={12} className="animate-spin" /> Đang gửi...</> : <><Send size={12} /> Gửi</>}
                        </button>
                    </div>

                    {/* Attachments / Images Preview */}
                    {(attachments.length > 0 || commentImages.length > 0) && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-200/60 mt-2">
                            {commentImages.map((img, idx) => (
                                <div key={`img-${idx}`} className="relative w-14 h-14 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={img.url} alt="Upload preview" className="w-full h-full object-cover" />
                                    <button onClick={() => removeCommentImage(idx)} className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 cursor-pointer">
                                        <Trash2 size={10} />
                                    </button>
                                </div>
                            ))}
                            {attachments.map((att, idx) => (
                                <div key={`doc-${idx}`} className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-lg text-xs text-emerald-800">
                                    <Paperclip size={12} className="text-emerald-600 shrink-0" />
                                    <span className="truncate max-w-[150px] font-medium">{att.name || 'Tệp'}</span>
                                    <button type="button" onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} className="text-emerald-600 hover:text-rose-600 p-0.5 cursor-pointer">
                                        <Trash2 size={11} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Comments List */}
            <div className="space-y-4 pt-1">
                {rootComments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6 italic">Chưa có thảo luận nào.</p>
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

                            const reactionCounts = c.reactions?.reduce((acc: any, r: any) => {
                                acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                                return acc;
                            }, {}) || {};

                            const userReactions = c.reactions?.filter((r: any) => r.user?.id === session?.user?.id).map((r: any) => r.emoji) || [];

                            return (
                                <div key={c.id} className={`flex gap-3 ${isReply ? 'mt-3' : ''}`}>
                                    <div className={`rounded-full flex items-center justify-center font-bold shrink-0 text-xs shadow-2xs border ${
                                        isReply 
                                            ? 'w-7 h-7 bg-slate-100 text-slate-600 border-slate-200' 
                                            : 'w-8 h-8 bg-emerald-50 text-emerald-800 border-emerald-200/80'
                                    }`}>
                                        {c.user?.name?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="font-semibold text-xs text-slate-900">{c.user?.name || c.user?.email || 'Người dùng'}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: vi }) : 'Vừa xong'}
                                            </span>
                                        </div>

                                        {/* Text Content */}
                                        {c.content && (
                                            <div
                                                className={`p-3 rounded-xl border leading-relaxed text-xs text-slate-800 break-words ${
                                                    isReply ? 'bg-slate-50/70 border-slate-200/70' : 'bg-slate-50/90 border-slate-200/80'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: autoLinkHtml(c.content) }}
                                                onClick={handleCommentClick}
                                            />
                                        )}

                                        {/* Document Attachments */}
                                        {parsedFiles.length > 0 && (
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {parsedFiles.map((att, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setPreviewDoc({ url: att.url, name: att.name || 'Tài liệu đính kèm' })}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-lg text-xs text-slate-700 cursor-pointer transition-all shadow-2xs"
                                                    >
                                                        <Paperclip size={12} className="text-emerald-600 shrink-0" />
                                                        <span className="truncate max-w-[150px] font-medium">{att.name || 'Tệp đính kèm'}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {/* Reactions & Actions */}
                                        <div className="flex items-center gap-3 pt-0.5">
                                            {/* Reaction Summary */}
                                            {Object.keys(reactionCounts).length > 0 && (
                                                <div className="flex gap-1">
                                                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                                                        <button
                                                            key={emoji}
                                                            onClick={() => handleToggleReaction(c.id, emoji)}
                                                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs cursor-pointer border ${
                                                                userReactions.includes(emoji)
                                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold'
                                                                    : 'bg-slate-100 border-transparent text-slate-600'
                                                            }`}
                                                        >
                                                            <span>{emoji}</span>
                                                            <span className="text-[10px]">{count as number}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Quick Emojis */}
                                            <div className="flex items-center gap-1.5 opacity-75 hover:opacity-100 transition-opacity">
                                                {EMOJIS.slice(0, 3).map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => handleToggleReaction(c.id, emoji)}
                                                        className="text-xs hover:scale-125 transition-transform cursor-pointer"
                                                        title="Thả cảm xúc"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}

                                                {!isReply && (
                                                    <button
                                                        onClick={() => {
                                                            if (replyTo !== c.id) {
                                                                setNewComment('@' + (c.user?.name || 'Người dùng') + ' ');
                                                                setAttachments([]);
                                                                setCommentImages([]);
                                                            }
                                                            setReplyTo(c.id);
                                                        }}
                                                        className="text-[11px] font-semibold text-slate-500 hover:text-emerald-600 cursor-pointer ml-1"
                                                    >
                                                        Trả lời
                                                    </button>
                                                )}

                                                {(isOwner || isAdmin) && (
                                                    <button
                                                        onClick={() => handleDeleteComment(c.id)}
                                                        className="text-[11px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                                                    >
                                                        Xóa
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Inline Reply Form */}
                                        {replyTo === c.id && !isReply && (
                                            <div className="rounded-xl border border-emerald-400 bg-white p-3 pb-11 relative mt-2.5 shadow-xs">
                                                <textarea
                                                    value={newComment}
                                                    onChange={(e) => setNewComment(e.target.value)}
                                                    onPaste={handlePaste}
                                                    placeholder="Viết câu trả lời của bạn..."
                                                    autoFocus
                                                    className="w-full min-h-[60px] border-none bg-transparent resize-y outline-none text-xs text-slate-800 placeholder:text-slate-400 leading-relaxed font-sans"
                                                />
                                                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex justify-between items-center">
                                                    <div className="flex items-center gap-1.5">
                                                        <label className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Thêm ảnh">
                                                            <ImageIcon size={15} />
                                                            <input type="file" hidden multiple accept="image/*" onChange={handleCommentImageSelect} disabled={isSaving} />
                                                        </label>
                                                        <label className="cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100" title="Đính kèm file">
                                                            <Paperclip size={15} />
                                                            <input type="file" hidden multiple onChange={handleFileUpload} disabled={isSaving} />
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setReplyTo(null)}
                                                            disabled={isSaving}
                                                            className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                                                        >
                                                            Hủy
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={handleAddComment}
                                                            disabled={isSaving || (!newComment.trim() && attachments.length === 0 && commentImages.length === 0)}
                                                            className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs cursor-pointer"
                                                        >
                                                            {isSaving ? <Loader2 size={12} className="animate-spin" /> : <><Send size={11} /> Gửi</>}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Nested Replies */}
                                        {!isReply && replies.length > 0 && (
                                            <div className="space-y-3 pl-3 border-l-2 border-slate-200/80 mt-2">
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

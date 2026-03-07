'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, BookOpen, Send, Trash2, PlayCircle, Clock } from 'lucide-react';
import { addDocumentComment, addDocumentNote, deleteDocumentNote } from '../../actions';
import { useRouter } from 'next/navigation';
import styles from '../../library.module.css';

export default function DocumentSidebar({ documentId, initialComments, initialNotes, currentUser }: any) {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'comments' | 'notes'>('comments');

    // Comment state
    const [commentText, setCommentText] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Note state
    const [noteText, setNoteText] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    // Auto-scroll chat to bottom
    const commentsEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (activeTab === 'comments') {
            commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [initialComments, activeTab]);

    const handleAddComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        setIsSubmittingComment(true);
        try {
            await addDocumentComment(documentId, commentText, replyTo || undefined);
            setCommentText('');
            setReplyTo(null);
            router.refresh();
        } catch (error) {
            alert('Lỗi gửi bình luận');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteText.trim()) return;
        setIsSubmittingNote(true);
        try {
            await addDocumentNote(documentId, noteText);
            setNoteText('');
            router.refresh();
        } catch (error) {
            alert('Lỗi lưu ghi chú');
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handleDeleteNote = async (id: string) => {
        if (!confirm('Xóa ghi chú này?')) return;
        try {
            await deleteDocumentNote(id);
            router.refresh();
        } catch (error) {
            alert('Lỗi xóa ghi chú');
        }
    };

    return (
        <div className={styles.viewerSidebar}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexShrink: 0 }}>
                <button
                    onClick={() => setActiveTab('comments')}
                    style={{ flex: 1, padding: '1rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', borderBottom: activeTab === 'comments' ? '3px solid #2563eb' : '3px solid transparent', color: activeTab === 'comments' ? '#2563eb' : '#64748b', background: activeTab === 'comments' ? '#ffffff' : 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
                >
                    <MessageSquare size={16} /> Thảo luận ({initialComments.length})
                </button>
                <button
                    onClick={() => setActiveTab('notes')}
                    style={{ flex: 1, padding: '1rem', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'all 0.2s', borderBottom: activeTab === 'notes' ? '3px solid #10b981' : '3px solid transparent', color: activeTab === 'notes' ? '#10b981' : '#64748b', background: activeTab === 'notes' ? '#ffffff' : 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: 'pointer' }}
                >
                    <BookOpen size={16} /> Ghi chú ({initialNotes.length})
                </button>
            </div>

            {/* Tab Content: COMMENTS */}
            {activeTab === 'comments' && (
                <>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
                        {initialComments.length === 0 ? (
                            <div className={styles.emptyState}>
                                <MessageSquare size={32} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                                <p style={{ margin: 0 }}>Chưa có thảo luận nào.</p>
                            </div>
                        ) : (
                            initialComments.map((comment: any) => (
                                <div key={comment.id} className={styles.chatMessage} style={{ flexDirection: 'column', gap: '0.25rem', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <img src={comment.user.avatar || `https://ui-avatars.com/api/?name=${comment.user.name}&background=random`} alt="avatar" className={styles.chatAvatar} />
                                        <div style={{ flex: 1 }}>
                                            <div className={styles.chatBubble}>
                                                <div className={styles.chatMeta} style={{ justifyContent: 'space-between' }}>
                                                    <span className={styles.chatAuthor}>{comment.user.name}</span>
                                                    <span className={styles.chatTime}>{new Date(comment.createdAt).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{comment.content}</div>
                                            </div>

                                            <button onClick={() => setReplyTo(comment.id)} style={{ padding: '0.25rem 0.5rem', background: 'transparent', border: 'none', color: '#64748b', fontSize: '0.75rem', fontWeight: 600, marginTop: '0.25rem', cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#2563eb'} onMouseOut={e => e.currentTarget.style.color = '#64748b'}>
                                                Trả lời
                                            </button>

                                            {/* Replies */}
                                            {comment.replies?.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '2px solid #e2e8f0', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                                                    {comment.replies.map((reply: any) => (
                                                        <div key={reply.id} style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <img src={reply.user.avatar || `https://ui-avatars.com/api/?name=${reply.user.name}&background=random`} alt="avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} />
                                                            <div style={{ flex: 1, background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '12px', borderTopLeftRadius: '2px', fontSize: '0.8rem', color: '#334155' }}>
                                                                <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.125rem' }}>{reply.user.name}</div>
                                                                <div style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{reply.content}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={commentsEndRef} />
                    </div>
                    {/* Comment Input */}
                    <div style={{ padding: '1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                        {replyTo && (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#dbeafe', color: '#1e40af', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><MessageSquare size={14} /> Trả lời bình luận...</span>
                                <button onClick={() => setReplyTo(null)} style={{ background: 'transparent', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0' }}><X size={14} /></button>
                            </div>
                        )}
                        <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <textarea
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                placeholder="Viết thảo luận..."
                                style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.875rem', resize: 'none', height: '80px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = '#3b82f6'}
                                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                            />
                            <button
                                type="submit"
                                disabled={!commentText.trim() || isSubmittingComment}
                                style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: commentText.trim() ? '#2563eb' : '#94a3b8', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: commentText.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
                            >
                                <Send size={14} style={{ transform: commentText.trim() ? 'translate(1px, -1px)' : 'none' }} />
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* Tab Content: PERSONAL NOTES */}
            {activeTab === 'notes' && (
                <>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: '#f8fafc' }}>
                        {initialNotes.length === 0 ? (
                            <div className={styles.emptyState}>
                                <BookOpen size={32} style={{ marginBottom: '1rem', color: '#cbd5e1' }} />
                                <p style={{ margin: 0 }}>Ghi chú không gian riêng.</p>
                            </div>
                        ) : (
                            initialNotes.map((note: any) => (
                                <div key={note.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 500 }}>
                                            <Clock size={12} /> {new Date(note.createdAt).toLocaleString('vi-VN')}
                                        </div>
                                        <button onClick={() => handleDeleteNote(note.id)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.25rem' }} onMouseOver={e => e.currentTarget.style.color = '#ef4444'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{note.content}</p>

                                    {note.videoTime !== null && note.videoTime !== undefined && (
                                        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#10b981', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', background: '#d1fae5', padding: '0.25rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                                            <PlayCircle size={12} /> Tại đoạn: {Math.floor(note.videoTime / 60)}:{(note.videoTime % 60).toString().padStart(2, '0')}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                    {/* Note Input */}
                    <div style={{ padding: '1rem', background: '#ffffff', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
                        <form onSubmit={handleAddNote} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <textarea
                                value={noteText}
                                onChange={e => setNoteText(e.target.value)}
                                placeholder="Ghi chú cá nhân..."
                                style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', resize: 'none', height: '80px', fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.2s' }}
                                onFocus={e => e.target.style.borderColor = '#10b981'}
                                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <button
                                type="submit"
                                disabled={!noteText.trim() || isSubmittingNote}
                                style={{ position: 'absolute', bottom: '0.5rem', right: '0.5rem', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: noteText.trim() ? '#10b981' : '#94a3b8', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: noteText.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}
                            >
                                <Send size={14} style={{ transform: noteText.trim() ? 'translate(1px, -1px)' : 'none' }} />
                            </button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
}

// Quick component
const X = ({ size }: { size: number }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;

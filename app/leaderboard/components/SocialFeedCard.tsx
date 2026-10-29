'use client';

import { toast } from '@/app/components/providers/ToastProvider';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
    Heart,
    Sparkles,
    MessageCircle,
    Pin,
    MoreVertical,
    Trash2,
    Send,
    CornerDownRight,
    Image as ImageIcon,
    X,
    AtSign,
    ChevronLeft,
    ChevronRight,
    ZoomIn
} from 'lucide-react';
import {
    ReactionEmoji,
    togglePostReaction,
    addPostComment,
    deleteSocialPost,
    pinSocialPost,
    searchMentionUsers
} from '../actions';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Props {
    post: any;
    currentUserId?: string;
    currentUserRole?: string;
    onPostUpdated: () => void;
    onViewProfile?: (userId: string) => void;
}

const EMOJI_MAP: Record<ReactionEmoji, { icon: string; label: string }> = {
    HEART: { icon: '❤️', label: 'Yêu thích' },
    FIRE: { icon: '🔥', label: 'Nhiệt huyết' },
    CLAP: { icon: '👏', label: 'Vỗ tay' },
    CELEBRATE: { icon: '🎉', label: 'Chúc mừng' },
    ROCKET: { icon: '🚀', label: 'Bứt phá' },
    TROPHY: { icon: '🏆', label: 'Vô địch' }
};

export function SocialFeedCard({
    post,
    currentUserId,
    currentUserRole,
    onPostUpdated,
    onViewProfile
}: Props) {
    const [showComments, setShowComments] = useState(post.commentsCount > 0);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);

    // Lightbox Carousel state (index into post.images)
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
    const touchStartXRef = useRef<number | null>(null);

    // Comment Reply & @Mention state
    const [replyingTo, setReplyingTo] = useState<{
        parentId: string;
        targetCommentId: string;
        authorId?: string;
        authorName: string;
    } | null>(null);
    const [commentTaggedUsers, setCommentTaggedUsers] = useState<{ id: string; name: string }[]>([]);
    const [showCommentMentionDropdown, setShowCommentMentionDropdown] = useState(false);
    const [commentMentionUsers, setCommentMentionUsers] = useState<any[]>([]);
    const [isLoadingCommentMentions, setIsLoadingCommentMentions] = useState(false);

    const commentInputRef = useRef<HTMLInputElement>(null);

    const isAuthor = currentUserId === post.authorId;
    const isAdmin = currentUserRole === 'ADMIN';

    const postImages: string[] = Array.isArray(post.images) ? post.images : [];

    // Auto expand comments if URL targets this post or a comment within it
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const targetPostId = params.get('postId');
            const targetCommentId = params.get('commentId');
            if (targetPostId === post.id || (targetCommentId && post.comments?.some((c: any) => c.id === targetCommentId))) {
                setShowComments(true);
            }
        }
    }, [post.id, post.comments]);

    // Keyboard navigation for Lightbox Carousel
    useEffect(() => {
        if (lightboxIndex === null) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setLightboxIndex(null);
            } else if (e.key === 'ArrowLeft' && postImages.length > 1) {
                setLightboxIndex(prev => (prev !== null ? (prev - 1 + postImages.length) % postImages.length : null));
            } else if (e.key === 'ArrowRight' && postImages.length > 1) {
                setLightboxIndex(prev => (prev !== null ? (prev + 1) % postImages.length : null));
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, postImages.length]);

    const handlePrevImage = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (postImages.length <= 1) return;
        setLightboxIndex(prev => (prev !== null ? (prev - 1 + postImages.length) % postImages.length : 0));
    };

    const handleNextImage = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (postImages.length <= 1) return;
        setLightboxIndex(prev => (prev !== null ? (prev + 1) % postImages.length : 0));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartXRef.current = e.touches[0]?.clientX ?? null;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartXRef.current === null || postImages.length <= 1) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
        const diff = touchStartXRef.current - endX;
        if (Math.abs(diff) > 40) {
            if (diff > 0) handleNextImage();
            else handlePrevImage();
        }
        touchStartXRef.current = null;
    };

    // Format content with highlighted @mentions (supports full multi-word Vietnamese names)
    const renderFormattedContent = (content: string, mentionsList?: any[]) => {
        if (!content) return null;

        // Build list of known mentioned users sorted by longest name first
        const knownMentions: { id?: string; name: string }[] = [];
        if (Array.isArray(mentionsList)) {
            mentionsList.forEach(m => {
                const u = m?.mentionedUser || m;
                if (u?.name && !knownMentions.some(k => k.name === u.name)) {
                    knownMentions.push({ id: u.id, name: u.name });
                }
            });
        }
        // Also include post-level mentions and comment authors so any @Name in the thread is recognized accurately
        if (Array.isArray(post.mentions)) {
            post.mentions.forEach((m: any) => {
                const u = m?.mentionedUser;
                if (u?.name && !knownMentions.some(k => k.name === u.name)) {
                    knownMentions.push({ id: u.id, name: u.name });
                }
            });
        }
        if (Array.isArray(post.comments)) {
            post.comments.forEach((c: any) => {
                if (c?.author?.name && !knownMentions.some(k => k.name === c.author.name)) {
                    knownMentions.push({ id: c.author.id, name: c.author.name });
                }
            });
        }

        knownMentions.sort((a, b) => b.name.length - a.name.length);

        const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const knownPatterns = knownMentions.map(k => `@${escapeRegex(k.name)}`);
        const fallbackPattern = `@[A-ZÀ-Ỹa-zà-ỹ0-9_]+(?:\\s+[A-ZÀ-Ỹ][a-zà-ỹ0-9_]*){0,4}`;
        const combinedRegex = new RegExp(`(${[...knownPatterns, fallbackPattern].join('|')})`, 'g');

        const parts = content.split(combinedRegex);
        return parts.map((part, index) => {
            if (part.startsWith('@') && part.length > 1) {
                const rawName = part.slice(1).trim();
                const matchedUser = knownMentions.find(
                    k => k.name.toLowerCase() === rawName.toLowerCase()
                );
                return (
                    <span
                        key={index}
                        onClick={() => matchedUser?.id && onViewProfile && onViewProfile(matchedUser.id)}
                        className="font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-1.5 py-0.5 rounded-md mx-0.5 inline-block cursor-pointer hover:bg-emerald-100 transition-colors"
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    // Organize comments into top-level comments and nested replies
    const { rootComments, repliesMap } = useMemo(() => {
        const allComments: any[] = Array.isArray(post.comments) ? post.comments : [];
        const commentIdSet = new Set(allComments.map(c => c.id));
        const roots: any[] = [];
        const map: Record<string, any[]> = {};

        allComments.forEach(c => {
            if (c.parentId && commentIdSet.has(c.parentId)) {
                if (!map[c.parentId]) map[c.parentId] = [];
                map[c.parentId].push(c);
            } else {
                roots.push(c);
            }
        });

        return { rootComments: roots, repliesMap: map };
    }, [post.comments]);

    const handleReaction = async (emoji: ReactionEmoji) => {
        try {
            setShowReactionPicker(false);
            await togglePostReaction(post.id, emoji);
            onPostUpdated();
        } catch (err) {
            console.error('Reaction error:', err);
        }
    };

    // Click "Trả lời" on a comment -> default auto-tag that comment's author
    const handleReplyToComment = (comment: any) => {
        const rootParentId = comment.parentId || comment.id;
        const authorName = comment.author?.name || 'Đồng nghiệp';
        const authorId = comment.author?.id || comment.authorId;

        setShowComments(true);
        setReplyingTo({
            parentId: rootParentId,
            targetCommentId: comment.id,
            authorId,
            authorName
        });

        if (authorId && authorName) {
            setCommentTaggedUsers(prev => {
                if (prev.some(u => u.id === authorId)) return prev;
                return [...prev, { id: authorId, name: authorName }];
            });
        }

        const mentionPrefix = `@${authorName} `;
        setCommentText(prev => {
            if (prev.includes(`@${authorName}`)) return prev;
            return mentionPrefix + prev;
        });

        setTimeout(() => {
            if (commentInputRef.current) {
                commentInputRef.current.focus();
                const len = commentInputRef.current.value.length;
                commentInputRef.current.setSelectionRange(len, len);
            }
        }, 50);
    };

    // Handle typing in comment input (detect '@')
    const handleCommentInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setCommentText(val);

        const cursorPos = e.target.selectionStart || val.length;
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]))) {
            const query = textBeforeCursor.slice(lastAtIndex + 1);
            if (!query.includes('\n') && query.split(' ').length <= 3 && query.length <= 30) {
                setShowCommentMentionDropdown(true);
                setIsLoadingCommentMentions(true);
                try {
                    const results = await searchMentionUsers(query.trim());
                    setCommentMentionUsers(results);
                } finally {
                    setIsLoadingCommentMentions(false);
                }
                return;
            }
        }
        setShowCommentMentionDropdown(false);
    };

    const triggerCommentMentionDropdown = async () => {
        setShowComments(true);
        const nextText =
            commentText.length === 0 || commentText.endsWith(' ')
                ? `${commentText}@`
                : `${commentText} @`;
        setCommentText(nextText);
        setShowCommentMentionDropdown(true);
        setIsLoadingCommentMentions(true);
        setTimeout(() => {
            if (commentInputRef.current) {
                commentInputRef.current.focus();
                const len = commentInputRef.current.value.length;
                commentInputRef.current.setSelectionRange(len, len);
            }
        }, 30);
        try {
            const results = await searchMentionUsers('');
            setCommentMentionUsers(results);
        } finally {
            setIsLoadingCommentMentions(false);
        }
    };

    const selectCommentMentionUser = (user: any) => {
        const inputEl = commentInputRef.current;
        const cursorPos = inputEl?.selectionStart || commentText.length;
        const textBeforeCursor = commentText.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = commentText.slice(cursorPos);

        const newText =
            lastAtIndex !== -1
                ? textBeforeCursor.slice(0, lastAtIndex) + `@${user.name} ` + textAfterCursor
                : `${commentText}@${user.name} `;

        setCommentText(newText);
        setCommentTaggedUsers(prev => {
            if (prev.some(u => u.id === user.id)) return prev;
            return [...prev, { id: user.id, name: user.name }];
        });
        setShowCommentMentionDropdown(false);
        setTimeout(() => {
            inputEl?.focus();
        }, 30);
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        setIsSubmittingComment(true);
        try {
            const activeMentionIds = commentTaggedUsers
                .filter(u => commentText.includes(`@${u.name}`))
                .map(u => u.id);

            await addPostComment({
                postId: post.id,
                content: commentText.trim(),
                parentId: replyingTo?.parentId || undefined,
                mentionedUserIds: activeMentionIds
            });
            setCommentText('');
            setReplyingTo(null);
            setCommentTaggedUsers([]);
            setShowCommentMentionDropdown(false);
            setShowComments(true);
            onPostUpdated();
        } catch (err: any) {
            toast.error(err.message || 'Lỗi gửi bình luận.');
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Bạn có chắc muốn xóa bài viết này?')) return;
        try {
            await deleteSocialPost(post.id);
            onPostUpdated();
        } catch (err: any) {
            toast.error(err.message || 'Lỗi khi xóa bài viết.');
        }
    };

    const handlePin = async () => {
        try {
            await pinSocialPost(post.id, !post.isPinned);
            onPostUpdated();
        } catch (err: any) {
            toast.error(err.message || 'Lỗi ghim bài viết.');
        }
    };

    const getUserReactionEmoji = () => {
        if (!currentUserId || !post.reactions) return null;
        const userReaction = post.reactions.find((r: any) => r.userId === currentUserId);
        return userReaction ? userReaction.emoji : null;
    };

    const myReactionEmoji = getUserReactionEmoji();

    return (
        <div
            id={`post-${post.id}`}
            className="rounded-3xl p-4 sm:p-5 shadow-sm border transition-all hover:shadow-md relative space-y-3"
            style={{
                background: post.isPinned ? '#fffdf7' : '#ffffff',
                borderColor: post.isPinned ? '#fde68a' : '#e2e8f0'
            }}
        >
            {/* Pinned Badge */}
            {post.isPinned && (
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 pb-2 border-b border-amber-200/60 dark:border-amber-900/40">
                    <Pin className="w-3.5 h-3.5 rotate-45 text-amber-500 fill-amber-500" />
                    <span>Bài viết được Ban Giám Đốc ghim nổi bật</span>
                </div>
            )}

            {/* Post Header */}
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    <img
                        src={post.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'U')}&background=059669&color=fff&size=80`}
                        alt={post.author?.name || 'User'}
                        onError={(e: any) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author?.name || 'U')}&background=059669&color=fff&size=80`; }}
                        onClick={() => post.author?.id && onViewProfile && onViewProfile(post.author.id)}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                    />
                    <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span
                                onClick={() => post.author?.id && onViewProfile && onViewProfile(post.author.id)}
                                className="hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                            >
                                {post.author?.name || 'Thành viên TSOL'}
                            </span>
                            {post.type === 'ACHIEVEMENT_ANNOUNCEMENT' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black">
                                    🏆 Vinh danh
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span>{post.author?.employeeProfile?.department || post.author?.role || ''}</span>
                            <span>•</span>
                            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: vi })}</span>
                        </div>
                    </div>
                </div>

                {/* Options Menu (Pin / Delete) */}
                <div className="relative">
                    {(isAdmin || isAuthor) && (
                        <button
                            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                    )}

                    {showOptionsMenu && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-20 text-xs font-semibold">
                            {isAdmin && (
                                <button
                                    onClick={() => {
                                        setShowOptionsMenu(false);
                                        handlePin();
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 text-slate-700 dark:text-slate-200 cursor-pointer"
                                >
                                    <Pin className="w-3.5 h-3.5" />
                                    <span>{post.isPinned ? 'Bỏ ghim bài' : 'Ghim bài viết'}</span>
                                </button>
                            )}
                            {(isAdmin || isAuthor) && (
                                <button
                                    onClick={() => {
                                        setShowOptionsMenu(false);
                                        handleDelete();
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 flex items-center gap-2 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Xóa bài viết</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Team Honor Banner (if post is for a competition group) */}
            {post.group && (
                <div
                    className="p-2.5 rounded-2xl border flex items-center gap-2.5 text-xs"
                    style={{
                        backgroundColor: `${post.group.color || '#059669'}15`,
                        borderColor: `${post.group.color || '#059669'}40`
                    }}
                >
                    <div className="text-xl">{post.group.avatar || '🛡️'}</div>
                    <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>Vinh danh Đội Thi Đua: {post.group.name}</span>
                        </div>
                        {post.group.slogan && (
                            <div className="text-[11px] text-slate-500 italic truncate">
                                &ldquo;{post.group.slogan}&rdquo;
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Honorary Badge if attached */}
            {post.metadata?.badge && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-black shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>{post.metadata.badge}</span>
                </div>
            )}

            {/* Content text */}
            {post.content && (
                <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {renderFormattedContent(post.content, post.mentions)}
                </div>
            )}

            {/* Compact, Balanced Image Thumbnails */}
            {postImages.length > 0 && (
                <div className="pt-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                        {postImages.slice(0, 4).map((img: string, idx: number) => {
                            const isSingle = postImages.length === 1;
                            const extraCount = postImages.length - 4;
                            const showMoreOverlay = idx === 3 && extraCount > 0;

                            return (
                                <div
                                    key={idx}
                                    onClick={() => setLightboxIndex(idx)}
                                    className="relative rounded-2xl overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-800 group border border-slate-200/90 dark:border-slate-700 shadow-2xs shrink-0"
                                    style={
                                        isSingle
                                            ? { width: '240px', height: '155px', maxWidth: '100%' }
                                            : { width: '130px', height: '110px' }
                                    }
                                    title="Nhấn để phóng to ảnh"
                                >
                                    <img
                                        src={img}
                                        alt={`Hình đính kèm ${idx + 1}`}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 text-white p-1.5 rounded-full shadow-md">
                                            <ZoomIn className="w-4 h-4" />
                                        </span>
                                    </div>

                                    {showMoreOverlay && (
                                        <div className="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white font-bold">
                                            <span className="text-base leading-none">+{extraCount}</span>
                                            <span className="text-[10px] font-medium opacity-90 mt-0.5">hình ảnh</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {postImages.length > 1 && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" />
                            <span>{postImages.length} hình ảnh • Nhấn vào ảnh để phóng to &amp; trượt qua lại</span>
                        </div>
                    )}
                </div>
            )}

            {/* Reaction counts summary row */}
            {post.reactionCounts && Object.keys(post.reactionCounts).length > 0 && (
                <div className="flex items-center justify-between text-xs text-slate-400 pt-1 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1">
                        {Object.entries(post.reactionCounts).map(([emoji, data]: any) => (
                            <span
                                key={emoji}
                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold"
                                title={(data?.users || []).map((u: any) => u.name).join(', ')}
                            >
                                <span>{EMOJI_MAP[emoji as ReactionEmoji]?.icon || '❤️'}</span>
                                <span className="text-slate-600 dark:text-slate-300">{data?.count || 0}</span>
                            </span>
                        ))}
                    </div>

                    {post.commentsCount > 0 && (
                        <button
                            onClick={() => setShowComments(!showComments)}
                            className="hover:underline text-[11px] text-slate-400 font-semibold cursor-pointer"
                        >
                            {post.commentsCount} bình luận
                        </button>
                    )}
                </div>
            )}

            {/* Action Bar (Reactions & Comments) */}
            <div className="flex items-center justify-between pt-1 relative">
                {/* Reactions Picker Flyout */}
                {showReactionPicker && (
                    <div
                        onMouseLeave={() => setShowReactionPicker(false)}
                        className="absolute bottom-full left-0 mb-2 p-1.5 bg-white dark:bg-slate-800 rounded-full shadow-2xl border border-slate-200 dark:border-slate-700 flex items-center gap-1 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150"
                    >
                        {(Object.keys(EMOJI_MAP) as ReactionEmoji[]).map(emoji => (
                            <button
                                key={emoji}
                                onClick={() => handleReaction(emoji)}
                                className="w-9 h-9 text-xl hover:scale-125 transition-transform flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
                                title={EMOJI_MAP[emoji].label}
                            >
                                {EMOJI_MAP[emoji].icon}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => handleReaction(myReactionEmoji || 'HEART')}
                        onMouseEnter={() => setShowReactionPicker(true)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${myReactionEmoji ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        {myReactionEmoji ? (
                            <span>{EMOJI_MAP[myReactionEmoji as ReactionEmoji]?.icon || '❤️'}</span>
                        ) : (
                            <Heart className="w-4 h-4 text-slate-400 hover:text-rose-500" />
                        )}
                        <span>{myReactionEmoji ? EMOJI_MAP[myReactionEmoji as ReactionEmoji]?.label : 'Cổ vũ'}</span>
                    </button>

                    <button
                        onClick={() => {
                            setShowComments(true);
                            setTimeout(() => commentInputRef.current?.focus(), 50);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <MessageCircle className="w-4 h-4 text-slate-400" />
                        <span>Bình luận {post.commentsCount > 0 ? `(${post.commentsCount})` : ''}</span>
                    </button>
                </div>
            </div>

            {/* Comments Thread Section */}
            {showComments && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {/* Threaded Comments List */}
                    {rootComments.length > 0 && (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {rootComments.map((comment: any) => {
                                const replies = repliesMap[comment.id] || [];
                                return (
                                    <div key={comment.id} id={`comment-${comment.id}`} className="space-y-2">
                                        {/* Root Comment */}
                                        <div className="flex items-start gap-2.5 text-xs">
                                            <img
                                                src={comment.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author?.name || 'U')}&background=059669&color=fff&size=64`}
                                                alt={comment.author?.name || 'User'}
                                                onClick={() => comment.author?.id && onViewProfile && onViewProfile(comment.author.id)}
                                                className="w-7 h-7 rounded-xl object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 mt-0.5"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="bg-slate-50 dark:bg-slate-800/70 rounded-2xl px-3 py-2 border border-slate-200/70 dark:border-slate-700/60">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span
                                                            onClick={() => comment.author?.id && onViewProfile && onViewProfile(comment.author.id)}
                                                            className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 hover:underline cursor-pointer"
                                                        >
                                                            {comment.author?.name || 'Đồng nghiệp'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 shrink-0">
                                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                                        {renderFormattedContent(comment.content, comment.mentions)}
                                                    </p>
                                                </div>

                                                {/* Comment Actions: Reply button */}
                                                <div className="flex items-center gap-3 mt-1 pl-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleReplyToComment(comment)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                                                    >
                                                        <CornerDownRight className="w-3 h-3" />
                                                        <span>Trả lời</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Nested Replies */}
                                        {replies.length > 0 && (
                                            <div className="ml-8 pl-3 border-l-2 border-emerald-200/80 dark:border-emerald-800/50 space-y-2">
                                                {replies.map((reply: any) => (
                                                    <div key={reply.id} id={`comment-${reply.id}`} className="flex items-start gap-2 text-xs">
                                                        <img
                                                            src={reply.author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(reply.author?.name || 'U')}&background=059669&color=fff&size=64`}
                                                            alt={reply.author?.name || 'User'}
                                                            onClick={() => reply.author?.id && onViewProfile && onViewProfile(reply.author.id)}
                                                            className="w-6 h-6 rounded-lg object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 mt-0.5"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="bg-emerald-50/40 dark:bg-slate-800/50 rounded-2xl px-3 py-2 border border-emerald-200/60 dark:border-slate-700/60">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <span
                                                                        onClick={() => reply.author?.id && onViewProfile && onViewProfile(reply.author.id)}
                                                                        className="font-bold text-slate-900 dark:text-slate-100 hover:text-emerald-600 hover:underline cursor-pointer"
                                                                    >
                                                                        {reply.author?.name || 'Đồng nghiệp'}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400 shrink-0">
                                                                        {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true, locale: vi })}
                                                                    </span>
                                                                </div>
                                                                <p className="text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap leading-relaxed">
                                                                    {renderFormattedContent(reply.content, reply.mentions)}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1 pl-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleReplyToComment(reply)}
                                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-emerald-600 transition-colors cursor-pointer"
                                                                >
                                                                    <CornerDownRight className="w-3 h-3" />
                                                                    <span>Trả lời</span>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Replying indicator & Tagged Users Banner */}
                    {(replyingTo || commentTaggedUsers.length > 0) && (
                        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-[11px]">
                            <div className="flex flex-wrap items-center gap-1.5">
                                {replyingTo && (
                                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300">
                                        <CornerDownRight className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Đang trả lời</span>
                                        <strong className="font-bold">@{replyingTo.authorName}</strong>
                                    </span>
                                )}
                                {commentTaggedUsers.length > 0 && (
                                    <div className="flex flex-wrap items-center gap-1 ml-1">
                                        {commentTaggedUsers.map(u => (
                                            <span
                                                key={u.id}
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-700"
                                            >
                                                <span>@{u.name}</span>
                                                <X
                                                    className="w-3 h-3 hover:text-rose-500 cursor-pointer"
                                                    onClick={() => {
                                                        setCommentTaggedUsers(prev => prev.filter(item => item.id !== u.id));
                                                        setCommentText(prev => prev.replace(`@${u.name} `, '').replace(`@${u.name}`, ''));
                                                    }}
                                                />
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {replyingTo && (
                                <button
                                    type="button"
                                    onClick={() => setReplyingTo(null)}
                                    className="text-slate-500 hover:text-rose-600 font-semibold inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Hủy trả lời</span>
                                </button>
                            )}
                        </div>
                    )}

                    {/* New Comment Input with @Mention Autocomplete */}
                    <div className="relative">
                        {showCommentMentionDropdown && (
                            <div className="absolute left-0 bottom-full mb-1.5 w-72 max-h-52 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 p-1.5 space-y-1">
                                <div className="flex items-center justify-between px-2 py-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Tag người dùng ({commentMentionUsers.length})
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setShowCommentMentionDropdown(false)}
                                        className="text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                {isLoadingCommentMentions ? (
                                    <div className="text-center py-2.5 text-slate-400 text-xs">Đang tìm đồng nghiệp...</div>
                                ) : commentMentionUsers.length > 0 ? (
                                    commentMentionUsers.map(user => (
                                        <div
                                            key={user.id}
                                            onClick={() => selectCommentMentionUser(user)}
                                            className="p-2 rounded-xl flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                                        >
                                            <img
                                                src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=059669&color=fff&size=64`}
                                                alt={user.name}
                                                className="w-6 h-6 rounded-lg object-cover shrink-0"
                                            />
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                                    {user.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate">
                                                    {user.employeeProfile?.department || user.email}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-2 text-slate-400 text-xs">Không tìm thấy người phù hợp.</div>
                                )}
                            </div>
                        )}

                        <form onSubmit={handleCommentSubmit} className="pt-1">
                            <div className="flex items-center gap-1.5 bg-slate-50/90 hover:bg-slate-50 focus-within:bg-white dark:bg-slate-800/80 dark:focus-within:bg-slate-800 rounded-2xl border border-slate-200/90 dark:border-slate-700 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 pl-3.5 pr-1.5 py-1 transition-all shadow-2xs">
                                <input
                                    ref={commentInputRef}
                                    type="text"
                                    value={commentText}
                                    onChange={handleCommentInputChange}
                                    placeholder={
                                        replyingTo
                                            ? `Trả lời @${replyingTo.authorName}... (Gõ @ để tag thêm người)`
                                            : 'Viết bình luận... (Gõ @ để tag tên đồng nghiệp)'
                                    }
                                    style={{ border: 'none', outline: 'none', boxShadow: 'none', background: 'transparent' }}
                                    className="flex-1 min-w-0 bg-transparent border-none outline-none py-1.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                                />
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        type="button"
                                        onClick={triggerCommentMentionDropdown}
                                        className="w-7 h-7 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                        title="Tag người dùng (@mention)"
                                    >
                                        <AtSign className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingComment || !commentText.trim()}
                                        className={`h-7 px-2.5 rounded-xl inline-flex items-center justify-center gap-1 text-[11px] font-bold transition-all cursor-pointer ${
                                            commentText.trim()
                                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95'
                                                : 'bg-slate-200/70 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                        }`}
                                        title="Gửi bình luận"
                                    >
                                        <Send className="w-3 h-3" />
                                        <span className="hidden sm:inline">Gửi</span>
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Fullscreen Lightbox Carousel for Post Images */}
            {lightboxIndex !== null && postImages[lightboxIndex] && (
                <div
                    onClick={() => setLightboxIndex(null)}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-between p-4 sm:p-6 bg-black/90 backdrop-blur-md select-none"
                >
                    {/* Top Bar: Counter & Close Button */}
                    <div
                        onClick={e => e.stopPropagation()}
                        className="w-full max-w-5xl flex items-center justify-between text-white z-10"
                    >
                        <div className="px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold tracking-wide">
                            Ảnh {lightboxIndex + 1} / {postImages.length}
                        </div>
                        <button
                            type="button"
                            onClick={() => setLightboxIndex(null)}
                            className="p-2 rounded-full bg-white/15 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                            title="Đóng (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Center Image Viewport + Prev/Next Buttons */}
                    <div
                        onClick={e => e.stopPropagation()}
                        className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-2 min-h-0"
                    >
                        {postImages.length > 1 && (
                            <button
                                type="button"
                                onClick={handlePrevImage}
                                className="absolute left-1 sm:left-3 z-20 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-emerald-600 text-white border border-white/20 shadow-lg transition-all cursor-pointer active:scale-95"
                                title="Ảnh trước ( phím ← )"
                            >
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                        )}

                        <img
                            src={postImages[lightboxIndex]}
                            alt={`Ảnh ${lightboxIndex + 1}`}
                            className="max-w-full max-h-[75vh] rounded-2xl shadow-2xl object-contain transition-all duration-200"
                        />

                        {postImages.length > 1 && (
                            <button
                                type="button"
                                onClick={handleNextImage}
                                className="absolute right-1 sm:right-3 z-20 p-2.5 sm:p-3 rounded-full bg-black/50 hover:bg-emerald-600 text-white border border-white/20 shadow-lg transition-all cursor-pointer active:scale-95"
                                title="Ảnh tiếp theo ( phím → )"
                            >
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        )}
                    </div>

                    {/* Bottom Thumbnail Strip */}
                    {postImages.length > 1 ? (
                        <div
                            onClick={e => e.stopPropagation()}
                            className="flex items-center justify-center gap-2 max-w-3xl overflow-x-auto py-2 px-3 rounded-2xl bg-white/10 backdrop-blur-md z-10"
                        >
                            {postImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setLightboxIndex(idx)}
                                    className={`relative rounded-xl overflow-hidden transition-all cursor-pointer shrink-0 ${
                                        idx === lightboxIndex
                                            ? 'ring-2 ring-emerald-400 scale-105 opacity-100'
                                            : 'opacity-50 hover:opacity-85'
                                    }`}
                                    style={{ width: '52px', height: '52px' }}
                                >
                                    <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div />
                    )}
                </div>
            )}
        </div>
    );
}

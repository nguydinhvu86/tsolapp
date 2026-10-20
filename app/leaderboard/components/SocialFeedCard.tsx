'use client';

import React, { useState } from 'react';
import { Heart, Flame, Sparkles, MessageCircle, Pin, MoreVertical, Trash2, Send, CornerDownRight, Image as ImageIcon, X, Check, Shield, Trophy } from 'lucide-react';
import { ReactionEmoji, togglePostReaction, addPostComment, deleteSocialPost, pinSocialPost } from '../actions';
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
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const isAuthor = currentUserId === post.authorId;
    const isAdmin = currentUserRole === 'ADMIN';

    // Format content with highlighted @mentions
    const renderFormattedContent = (content: string) => {
        const parts = content.split(/(@[a-zA-Z0-9_\u00C0-\u1EF9\s]+?)(?=[.,!?\s]|$)/g);
        return parts.map((part, index) => {
            if (part.startsWith('@')) {
                return (
                    <span
                        key={index}
                        className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md mx-0.5 inline-block cursor-pointer hover:underline"
                    >
                        {part}
                    </span>
                );
            }
            return part;
        });
    };

    const handleReaction = async (emoji: ReactionEmoji) => {
        try {
            setShowReactionPicker(false);
            await togglePostReaction(post.id, emoji);
            onPostUpdated();
        } catch (err) {
            console.error('Reaction error:', err);
        }
    };

    const handleCommentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        setIsSubmittingComment(true);
        try {
            await addPostComment({
                postId: post.id,
                content: commentText
            });
            setCommentText('');
            setShowComments(true);
            onPostUpdated();
        } catch (err: any) {
            alert(err.message || 'Lỗi gửi bình luận.');
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
            alert(err.message || 'Lỗi khi xóa bài viết.');
        }
    };

    const handlePin = async () => {
        try {
            await pinSocialPost(post.id, !post.isPinned);
            onPostUpdated();
        } catch (err: any) {
            alert(err.message || 'Lỗi ghim bài viết.');
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
            className="rounded-3xl p-4 sm:p-5 shadow-sm border transition-all hover:shadow-md relative space-y-3.5"
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
                        src={post.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name || 'U')}&background=059669&color=fff&size=80`}
                        alt={post.author.name}
                        onClick={() => onViewProfile && onViewProfile(post.author.id)}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500 transition-all"
                    />
                    <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span 
                                onClick={() => onViewProfile && onViewProfile(post.author.id)}
                                className="hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                            >
                                {post.author.name}
                            </span>
                            {post.type === 'ACHIEVEMENT_ANNOUNCEMENT' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black">
                                    🏆 Vinh danh
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <span>{post.author.employeeProfile?.department || post.author.role}</span>
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
                    className="p-3 rounded-2xl border flex items-center gap-3 text-xs"
                    style={{ 
                        backgroundColor: `${post.group.color || '#059669'}15`, 
                        borderColor: `${post.group.color || '#059669'}40` 
                    }}
                >
                    <div className="text-2xl">{post.group.avatar || '🛡️'}</div>
                    <div className="min-w-0">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <span>Vinh danh Đội Thi Đua: {post.group.name}</span>
                        </div>
                        {post.group.slogan && (
                            <div className="text-[11px] text-slate-500 italic truncate">
                                "{post.group.slogan}"
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
            <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {renderFormattedContent(post.content)}
            </div>

            {/* Images Grid */}
            {post.images && post.images.length > 0 && (
                <div className={`grid gap-2 rounded-2xl overflow-hidden ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {post.images.map((img: string, idx: number) => (
                        <div 
                            key={idx}
                            onClick={() => setSelectedImage(img)}
                            className="relative aspect-video rounded-xl overflow-hidden cursor-pointer bg-slate-100 dark:bg-slate-800 group"
                        >
                            <img 
                                src={img} 
                                alt="Post attachment" 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                            />
                        </div>
                    ))}
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
                                title={data.users.map((u: any) => u.name).join(', ')}
                            >
                                <span>{EMOJI_MAP[emoji as ReactionEmoji]?.icon || '❤️'}</span>
                                <span className="text-slate-600 dark:text-slate-300">{data.count}</span>
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
                        onClick={() => setShowComments(!showComments)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                        <MessageCircle className="w-4 h-4 text-slate-400" />
                        <span>Bình luận</span>
                    </button>
                </div>
            </div>

            {/* Comments Thread Section */}
            {showComments && (
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {/* Comments List */}
                    {post.comments && post.comments.length > 0 && (
                        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                            {post.comments.map((comment: any) => (
                                <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                                    <img
                                        src={comment.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.name || 'U')}&background=059669&color=fff&size=64`}
                                        alt={comment.author.name}
                                        onClick={() => onViewProfile && onViewProfile(comment.author.id)}
                                        className="w-7 h-7 rounded-xl object-cover shrink-0 cursor-pointer hover:ring-2 hover:ring-emerald-500"
                                    />
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 border border-slate-200/60 dark:border-slate-700/60">
                                        <div className="flex items-center justify-between">
                                            <span 
                                                onClick={() => onViewProfile && onViewProfile(comment.author.id)}
                                                className="font-bold text-slate-900 dark:text-slate-100 hover:underline cursor-pointer"
                                            >
                                                {comment.author.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 mt-0.5 whitespace-pre-wrap">
                                            {comment.content}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* New Comment Input */}
                    <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-1">
                        <input
                            type="text"
                            value={commentText}
                            onChange={e => setCommentText(e.target.value)}
                            placeholder="Viết lời chúc mừng hoặc bình luận..."
                            className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                            type="submit"
                            disabled={isSubmittingComment || !commentText.trim()}
                            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40 transition-all cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </div>
            )}

            {/* Lightbox Modal for enlarged image preview */}
            {selectedImage && (
                <div 
                    onClick={() => setSelectedImage(null)}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
                >
                    <img 
                        src={selectedImage} 
                        alt="Enlarged preview" 
                        className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl object-contain" 
                    />
                </div>
            )}
        </div>
    );
}

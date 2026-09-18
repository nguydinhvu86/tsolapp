'use client';

import React, { useState } from 'react';
import { Heart, Flame, Sparkles, MessageCircle, Pin, MoreVertical, Trash2, Send, CornerDownRight, Image as ImageIcon, X, Check } from 'lucide-react';
import { ReactionEmoji, togglePostReaction, addPostComment, deleteSocialPost, pinSocialPost } from '../actions';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

interface Props {
    post: any;
    currentUserId?: string;
    currentUserRole?: string;
    onPostUpdated: () => void;
}

const EMOJI_MAP: Record<ReactionEmoji, { icon: string; label: string; bg: string }> = {
    HEART: { icon: '❤️', label: 'Yêu thích', bg: 'hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40' },
    FIRE: { icon: '🔥', label: 'Nhiệt huyết', bg: 'hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/40' },
    CLAP: { icon: '👏', label: 'Vỗ tay', bg: 'hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40' },
    CELEBRATE: { icon: '🎉', label: 'Chúc mừng', bg: 'hover:bg-purple-50 hover:text-purple-600 dark:hover:bg-purple-950/40' },
    ROCKET: { icon: '🚀', label: 'Bứt phá', bg: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40' },
    TROPHY: { icon: '🏆', label: 'Vô địch', bg: 'hover:bg-yellow-50 hover:text-yellow-600 dark:hover:bg-yellow-950/40' }
};

export function SocialFeedCard({ post, currentUserId, currentUserRole, onPostUpdated }: Props) {
    const [showComments, setShowComments] = useState(post.commentsCount > 0);
    const [commentText, setCommentText] = useState('');
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
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
                        className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md mx-0.5 inline-block"
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

    // Calculate if current user reacted with an emoji
    const getUserReactionEmoji = () => {
        if (!currentUserId || !post.reactions) return null;
        const userReaction = post.reactions.find((r: any) => r.userId === currentUserId);
        return userReaction ? userReaction.emoji : null;
    };

    const myReactionEmoji = getUserReactionEmoji();

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-sm transition-all hover:shadow-md relative">
            {/* Pinned Badge */}
            {post.isPinned && (
                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-3 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <Pin className="w-3.5 h-3.5 rotate-45 text-amber-500 fill-amber-500" />
                    <span>Bài viết được ghim bởi Ban Giám Đốc</span>
                </div>
            )}

            {/* Post Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <img
                        src={post.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name || 'U')}&background=059669&color=fff&size=80`}
                        alt={post.author.name}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />
                    <div className="min-w-0">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span>{post.author.name}</span>
                            {post.type === 'ACHIEVEMENT_ANNOUNCEMENT' && (
                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black">
                                    🏆 Thành tích
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

                {/* Options Dropdown */}
                {(isAuthor || isAdmin) && (
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <MoreVertical className="w-4 h-4" />
                        </button>
                        {showOptionsMenu && (
                            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-30">
                                {isAdmin && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowOptionsMenu(false);
                                            handlePin();
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 cursor-pointer"
                                    >
                                        <Pin className="w-3.5 h-3.5" />
                                        <span>{post.isPinned ? 'Bỏ ghim' : 'Ghim bài'}</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowOptionsMenu(false);
                                        handleDelete();
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center gap-2 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Xóa bài viết</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Post Content */}
            <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed my-3 whitespace-pre-wrap">
                {renderFormattedContent(post.content)}
            </div>

            {/* Image Gallery */}
            {post.images && post.images.length > 0 && (
                <div
                    className={`grid gap-2 my-3 rounded-2xl overflow-hidden ${
                        post.images.length === 1
                            ? 'grid-cols-1'
                            : post.images.length === 2
                            ? 'grid-cols-2'
                            : post.images.length === 3
                            ? 'grid-cols-3'
                            : 'grid-cols-2'
                    }`}
                >
                    {post.images.map((img: string, idx: number) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedImage(img)}
                            className="relative group bg-slate-100 dark:bg-slate-800 aspect-video rounded-xl overflow-hidden cursor-pointer"
                        >
                            <img
                                src={img}
                                alt="Post attachment"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 text-white bg-slate-800 rounded-full hover:bg-slate-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <img src={selectedImage} alt="Enlarged" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" />
                </div>
            )}

            {/* Reactions Summary & Count */}
            {post.reactions && post.reactions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 pb-1 border-t border-slate-100 dark:border-slate-800/80">
                    {Object.entries(post.reactionCounts || {}).map(([emojiKey, data]: [string, any]) => {
                        const emojiConfig = EMOJI_MAP[emojiKey as ReactionEmoji] || { icon: '👏' };
                        return (
                            <button
                                key={emojiKey}
                                onClick={() => handleReaction(emojiKey as ReactionEmoji)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-transform active:scale-95 cursor-pointer ${
                                    myReactionEmoji === emojiKey
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                }`}
                                title={data.users.map((u: any) => u.name).join(', ')}
                            >
                                <span>{emojiConfig.icon}</span>
                                <span>{data.count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Quick Action Bar (6 Reaction Emojis + Comment toggle) */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-100 dark:border-slate-800">
                {/* 6 Emoji Buttons */}
                <div className="flex items-center gap-1">
                    {(Object.keys(EMOJI_MAP) as ReactionEmoji[]).map(key => {
                        const cfg = EMOJI_MAP[key];
                        const isSelected = myReactionEmoji === key;
                        return (
                            <button
                                key={key}
                                onClick={() => handleReaction(key)}
                                className={`p-1.5 sm:p-2 rounded-xl text-sm transition-all transform active:scale-125 cursor-pointer ${
                                    isSelected
                                        ? 'bg-emerald-100 scale-110 shadow-xs'
                                        : cfg.bg
                                }`}
                                title={cfg.label}
                            >
                                <span>{cfg.icon}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Comments Toggle Button */}
                <button
                    type="button"
                    onClick={() => setShowComments(!showComments)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.commentsCount || 0} Bình luận</span>
                </button>
            </div>

            {/* Comment Section */}
            {showComments && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {/* List of comments */}
                    {post.comments && post.comments.length > 0 && (
                        <div className="space-y-2.5">
                            {post.comments.map((comment: any) => (
                                <div key={comment.id} className="flex items-start gap-2.5 text-xs">
                                    <img
                                        src={comment.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.author.name || 'U')}&background=059669&color=fff&size=64`}
                                        alt={comment.author.name}
                                        className="w-7 h-7 rounded-xl object-cover shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-2.5 border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <span className="font-bold text-slate-900 dark:text-slate-100">
                                                {comment.author.name}
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                                            </span>
                                        </div>
                                        <div className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                            {renderFormattedContent(comment.content)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Write comment input */}
                    <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 mt-2">
                        <input
                            type="text"
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Viết bình luận, chúc mừng đồng đội..."
                            className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <button
                            type="submit"
                            disabled={isSubmittingComment || !commentText.trim()}
                            className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-40 cursor-pointer"
                        >
                            <Send className="w-3.5 h-3.5" />
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

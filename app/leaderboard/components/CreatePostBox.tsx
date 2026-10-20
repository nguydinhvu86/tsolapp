'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, AtSign, Sparkles, X, Loader2, Trophy, Shield, Users, Flame, CheckCircle2 } from 'lucide-react';
import { createSocialPost, searchMentionUsers } from '../actions';

interface Props {
    currentUser: {
        id: string;
        name?: string | null;
        avatar?: string | null;
    };
    competitionGroups?: any[];
    onPostCreated: () => void;
    initialMention?: { name: string; id: string; type?: 'USER' | 'TEAM' } | null;
    onClearInitialMention?: () => void;
}

const CELEBRATION_BADGES = [
    { label: '👑 Quán Quân Tuần', icon: '👑' },
    { label: '🎯 Chốt Hợp Đồng Khủng', icon: '🎯' },
    { label: '💎 Vượt Chỉ Tiêu 200%', icon: '💎' },
    { label: '🔥 Chiến Binh Bất Bại', icon: '🔥' },
    { label: '🚀 Đội Nhóm Bứt Phá', icon: '🚀' },
    { label: '🌟 Tinh Thần Đồng Đội', icon: '🌟' }
];

export function CreatePostBox({
    currentUser,
    competitionGroups = [],
    onPostCreated,
    initialMention,
    onClearInitialMention
}: Props) {
    const [postType, setPostType] = useState<'USER_POST' | 'INDIVIDUAL_HONOR' | 'TEAM_HONOR'>('USER_POST');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string }[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [selectedBadge, setSelectedBadge] = useState<string>('');

    // Mention Autocomplete state
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionUsers, setMentionUsers] = useState<any[]>([]);
    const [isLoadingMentions, setIsLoadingMentions] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle initial mention from Podium or Table
    useEffect(() => {
        if (initialMention) {
            if (initialMention.type === 'TEAM') {
                setPostType('TEAM_HONOR');
                setSelectedGroupId(initialMention.id);
                setContent(`Chúc mừng đội thi đua "${initialMention.name}" đã đạt thành tích xuất sắc và dẫn đầu bảng xếp hạng! Cùng cố gắng giữ vững phong độ nhé cả đội! 🔥🚀 `);
            } else {
                setPostType('INDIVIDUAL_HONOR');
                setContent(prev => {
                    if (prev.includes(`@${initialMention.name}`)) return prev;
                    return `Chúc mừng @${initialMention.name} đã đạt thành tích rực rỡ! Chiến binh xuất sắc của đại gia đình TSOL! 🎉🔥 `;
                });
                setTaggedUsers(prev => {
                    if (prev.some(u => u.id === initialMention.id)) return prev;
                    return [...prev, { id: initialMention.id, name: initialMention.name }];
                });
            }
            textareaRef.current?.focus();
            if (onClearInitialMention) onClearInitialMention();
        }
    }, [initialMention, onClearInitialMention]);

    // Handle typing '@'
    const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setContent(val);

        const cursorPos = e.target.selectionStart;
        const textBeforeCursor = val.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');

        if (lastAtIndex !== -1 && (lastAtIndex === 0 || /\s/.test(textBeforeCursor[lastAtIndex - 1]))) {
            const query = textBeforeCursor.slice(lastAtIndex + 1);
            if (!query.includes(' ')) {
                setShowMentionDropdown(true);
                setMentionSearch(query);
                setIsLoadingMentions(true);
                const results = await searchMentionUsers(query);
                setMentionUsers(results);
                setIsLoadingMentions(false);
                return;
            }
        }
        setShowMentionDropdown(false);
    };

    const selectMentionUser = (user: any) => {
        const cursorPos = textareaRef.current?.selectionStart || content.length;
        const textBeforeCursor = content.slice(0, cursorPos);
        const lastAtIndex = textBeforeCursor.lastIndexOf('@');
        const textAfterCursor = content.slice(cursorPos);

        const newText = textBeforeCursor.slice(0, lastAtIndex) + `@${user.name} ` + textAfterCursor;
        setContent(newText);
        setTaggedUsers(prev => {
            if (prev.some(u => u.id === user.id)) return prev;
            return [...prev, { id: user.id, name: user.name }];
        });
        setShowMentionDropdown(false);
        textareaRef.current?.focus();
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setIsUploading(true);
        try {
            const uploadedUrls: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                formData.append('file', files[i]);
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.url) {
                    uploadedUrls.push(data.url);
                }
            }
            setImages(prev => [...prev, ...uploadedUrls]);
        } catch (err) {
            alert('Lỗi tải ảnh lên. Vui lòng thử lại.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() && images.length === 0) return;

        setIsSubmitting(true);
        try {
            const mentionedIds = taggedUsers.map(u => u.id);
            const metadata: any = {};
            if (selectedBadge) metadata.badge = selectedBadge;

            await createSocialPost({
                content,
                images,
                type: postType === 'USER_POST' ? 'USER_POST' : 'ACHIEVEMENT_ANNOUNCEMENT',
                groupId: postType === 'TEAM_HONOR' && selectedGroupId ? selectedGroupId : undefined,
                mentionedUserIds: mentionedIds,
                metadata: Object.keys(metadata).length > 0 ? metadata : undefined
            });

            setContent('');
            setImages([]);
            setTaggedUsers([]);
            setSelectedBadge('');
            onPostCreated();
        } catch (err: any) {
            alert(err.message || 'Lỗi khi đăng bài.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            className="rounded-3xl p-4 sm:p-5 shadow-sm border relative space-y-3"
            style={{ background: '#ffffff', borderColor: '#e2e8f0' }}
        >
            {/* Header: User avatar & Post Type Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                    <img
                        src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'U')}&background=059669&color=fff&size=80`}
                        alt={currentUser.name || 'User'}
                        className="w-9 h-9 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                    />
                    <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {currentUser.name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                            Chia sẻ trên Mạng Xã Hội Nội Bộ TSOL
                        </div>
                    </div>
                </div>

                {/* Post Type Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setPostType('USER_POST')}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${postType === 'USER_POST' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        💬 Chia sẻ
                    </button>
                    <button
                        type="button"
                        onClick={() => setPostType('INDIVIDUAL_HONOR')}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${postType === 'INDIVIDUAL_HONOR' ? 'bg-amber-400 text-amber-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        🏆 Vinh danh bạn
                    </button>
                    <button
                        type="button"
                        onClick={() => setPostType('TEAM_HONOR')}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${postType === 'TEAM_HONOR' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        🛡️ Vinh danh đội
                    </button>
                </div>
            </div>

            {/* If Team Honor: Select Group dropdown */}
            {postType === 'TEAM_HONOR' && competitionGroups.length > 0 && (
                <div className="p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 shrink-0">Chọn đội:</span>
                    <select
                        value={selectedGroupId}
                        onChange={e => setSelectedGroupId(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
                    >
                        <option value="">-- Chọn đội nhóm thi đua muốn vinh danh --</option>
                        {competitionGroups.map(g => (
                            <option key={g.id} value={g.id}>
                                {g.avatar || '🛡️'} {g.name} - ({g.slogan || 'Đội thi đua'})
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Badges Selector (Optional honorary stickers) */}
            {(postType === 'INDIVIDUAL_HONOR' || postType === 'TEAM_HONOR') && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-bold text-slate-400 mr-1">Tặng danh hiệu:</span>
                    {CELEBRATION_BADGES.map(b => (
                        <button
                            key={b.label}
                            type="button"
                            onClick={() => setSelectedBadge(selectedBadge === b.label ? '' : b.label)}
                            className={`px-2 py-0.5 rounded-xl text-[11px] font-bold transition-all border ${selectedBadge === b.label ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                        >
                            {b.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Textarea */}
            <div className="relative">
                <textarea
                    ref={textareaRef}
                    rows={3}
                    value={content}
                    onChange={handleTextChange}
                    placeholder={
                        postType === 'INDIVIDUAL_HONOR' 
                            ? "Viết lời khen ngợi, tuyên dương đồng nghiệp xuất sắc... (Gõ @ để tag tên)"
                            : postType === 'TEAM_HONOR'
                            ? "Chúc mừng và tiếp thêm lửa cho các thành viên trong đội nhóm..."
                            : "Bạn muốn chia sẻ cảm xúc, tin vui chốt sale hoặc kinh nghiệm gì hôm nay? (Gõ @ để tag tên đồng nghiệp)"
                    }
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />

                {/* Mention Autocomplete Dropdown */}
                {showMentionDropdown && (
                    <div className="absolute left-0 bottom-full mb-1 w-72 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 z-30 p-1.5 space-y-1">
                        <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                            Gợi ý đồng nghiệp ({mentionUsers.length})
                        </div>
                        {isLoadingMentions ? (
                            <div className="text-center py-3 text-slate-400 text-xs">Đang tìm...</div>
                        ) : mentionUsers.length > 0 ? (
                            mentionUsers.map(user => (
                                <div
                                    key={user.id}
                                    onClick={() => selectMentionUser(user)}
                                    className="p-2 rounded-xl flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer transition-colors"
                                >
                                    <img
                                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=059669&color=fff&size=64`}
                                        alt={user.name}
                                        className="w-7 h-7 rounded-lg object-cover"
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
            </div>

            {/* Tagged users pills */}
            {taggedUsers.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400">Đã tag:</span>
                    {taggedUsers.map(u => (
                        <span 
                            key={u.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800"
                        >
                            <span>@{u.name}</span>
                            <X 
                                className="w-3 h-3 hover:text-rose-500 cursor-pointer" 
                                onClick={() => setTaggedUsers(prev => prev.filter(item => item.id !== u.id))} 
                            />
                        </span>
                    ))}
                </div>
            )}

            {/* Image Preview Grid */}
            {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {images.map((img, idx) => (
                        <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 h-20 sm:h-24">
                            <img src={img} alt="Upload" className="w-full h-full object-cover" />
                            <button
                                type="button"
                                onClick={() => removeImage(idx)}
                                className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Footer Action Bar */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-1.5">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                    />

                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Đính kèm hình ảnh"
                    >
                        {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                        ) : (
                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                        )}
                        <span className="hidden sm:inline">Ảnh</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setContent(prev => prev + '@');
                            textareaRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Nhắc đến đồng nghiệp (@mention)"
                    >
                        <AtSign className="w-4 h-4 text-blue-600" />
                        <span className="hidden sm:inline">Tag tên</span>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!content.trim() && images.length === 0)}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Đang đăng...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Đăng bài</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

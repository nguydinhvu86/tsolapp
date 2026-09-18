'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, AtSign, Sparkles, X, Loader2, Smile, Trophy, Flame, CheckCircle2 } from 'lucide-react';
import { createSocialPost, searchMentionUsers } from '../actions';

interface Props {
    currentUser: {
        id: string;
        name?: string | null;
        avatar?: string | null;
    };
    onPostCreated: () => void;
    initialMention?: { name: string; id: string } | null;
    onClearInitialMention?: () => void;
}

export function CreatePostBox({ currentUser, onPostCreated, initialMention, onClearInitialMention }: Props) {
    const [content, setContent] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [taggedUsers, setTaggedUsers] = useState<{ id: string; name: string }[]>([]);

    // Mention Autocomplete state
    const [showMentionDropdown, setShowMentionDropdown] = useState(false);
    const [mentionSearch, setMentionSearch] = useState('');
    const [mentionUsers, setMentionUsers] = useState<any[]>([]);
    const [isLoadingMentions, setIsLoadingMentions] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle initial mention passed from parent (e.g. when clicking "Chúc mừng" on podium or rank list)
    useEffect(() => {
        if (initialMention) {
            setContent(prev => {
                if (prev.includes(`@${initialMention.name}`)) return prev;
                return prev ? `${prev} @${initialMention.name} ` : `Chúc mừng @${initialMention.name} đã đạt thành tích xuất sắc! 🎉 `;
            });
            setTaggedUsers(prev => {
                if (prev.some(u => u.id === initialMention.id)) return prev;
                return [...prev, initialMention];
            });
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
            await createSocialPost({
                content,
                images,
                mentionedUserIds: taggedUsers.map(u => u.id)
            });
            setContent('');
            setImages([]);
            setTaggedUsers([]);
            onPostCreated();
        } catch (err: any) {
            alert(err.message || 'Lỗi đăng bài.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-4 sm:p-5 shadow-sm relative">
            <form onSubmit={handleSubmit}>
                <div className="flex items-start gap-3">
                    <img
                        src={currentUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name || 'Me')}&background=059669&color=fff&size=80`}
                        alt={currentUser.name || 'User'}
                        className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                    />

                    <div className="flex-1 min-w-0 relative">
                        <textarea
                            ref={textareaRef}
                            value={content}
                            onChange={handleTextChange}
                            placeholder="Chia sẻ niềm vui, chúc mừng đồng đội, gõ @ để tag tên..."
                            rows={3}
                            className="w-full bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        />

                        {/* Mention Dropdown */}
                        {showMentionDropdown && (
                            <div className="absolute top-full left-0 mt-1 w-72 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 py-1.5 z-50 max-h-56 overflow-y-auto">
                                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    Gợi ý đồng nghiệp
                                </div>
                                {isLoadingMentions ? (
                                    <div className="p-3 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Đang tìm...</span>
                                    </div>
                                ) : mentionUsers.length > 0 ? (
                                    mentionUsers.map(u => (
                                        <button
                                            key={u.id}
                                            type="button"
                                            onClick={() => selectMentionUser(u)}
                                            className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-emerald-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                        >
                                            <img
                                                src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'U')}&background=059669&color=fff&size=64`}
                                                alt={u.name}
                                                className="w-6 h-6 rounded-lg object-cover"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                                                    {u.name}
                                                </div>
                                                <div className="text-[10px] text-slate-400 truncate">
                                                    {u.employeeProfile?.department || u.email}
                                                </div>
                                            </div>
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-2.5 text-center text-xs text-slate-400">
                                        Không tìm thấy đồng nghiệp
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Uploaded Images Preview */}
                {images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3 pl-13">
                        {images.map((img, idx) => (
                            <div key={idx} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xs">
                                <img src={img} alt="Upload" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => removeImage(idx)}
                                    className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tagged users chips */}
                {taggedUsers.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 pl-13">
                        <span className="text-[11px] text-slate-400 font-medium">Đã tag:</span>
                        {taggedUsers.map(u => (
                            <span
                                key={u.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
                            >
                                @{u.name}
                                <button
                                    type="button"
                                    onClick={() => setTaggedUsers(prev => prev.filter(item => item.id !== u.id))}
                                    className="text-emerald-600 hover:text-emerald-900"
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 pl-13">
                    <div className="flex items-center gap-1">
                        {/* Image Upload Button */}
                        <label
                            className={`p-2 rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold ${
                                isUploading ? 'opacity-50 pointer-events-none' : ''
                            }`}
                            title="Tải ảnh lên"
                        >
                            <ImageIcon className="w-4 h-4 text-emerald-600" />
                            <span className="hidden sm:inline">{isUploading ? 'Đang tải...' : 'Thêm ảnh'}</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </label>

                        {/* Tag colleague shortcut */}
                        <button
                            type="button"
                            onClick={() => {
                                setContent(prev => prev + '@');
                                setShowMentionDropdown(true);
                                textareaRef.current?.focus();
                            }}
                            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Nhắc đến đồng nghiệp"
                        >
                            <AtSign className="w-4 h-4 text-blue-600" />
                            <span className="hidden sm:inline">Tag tên</span>
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting || (!content.trim() && images.length === 0)}
                        style={{ background: '#059669', color: '#ffffff' }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Send className="w-3.5 h-3.5" />
                        )}
                        <span>Đăng Bài</span>
                    </button>
                </div>
            </form>
        </div>
    );
}

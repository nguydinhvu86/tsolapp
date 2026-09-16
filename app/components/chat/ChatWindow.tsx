'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    Send, X, Plus, Search, Users, UserRound, ArrowLeft,
    MessageCircle, Paperclip, Reply, SmilePlus, ThumbsUp, Heart,
    Maximize2, Minimize2, Image as ImageIcon, FileText, Download,
    Trash2, Copy, Check, Info, FileSpreadsheet, FileCode, Archive,
    MoreVertical, Phone, Video as VideoIcon, Sparkles, Folder
} from 'lucide-react';
import {
    getChatRooms, getChatMessages, sendMessage, createDirectChat,
    createGroupChat, getActiveUsersForChat, toggleReaction,
    deleteChatMessage, getRoomMedia
} from '@/app/chat/actions';

// Vibrant Gradient Palettes for Avatars without Images
const AVATAR_GRADIENTS = [
    'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',
    'from-violet-500 to-purple-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-cyan-500 to-blue-600',
    'from-fuchsia-500 to-rose-600',
];

function getInitials(name?: string) {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getGradientByName(name?: string) {
    if (!name) return AVATAR_GRADIENTS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[index];
}

// User Avatar Component
function UserAvatar({
    user,
    size = 'md',
    showOnline = false,
    isOnline = false,
    isGroup = false,
    name = ''
}: {
    user?: { name?: string; avatar?: string | null; email?: string } | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    showOnline?: boolean;
    isOnline?: boolean;
    isGroup?: boolean;
    name?: string;
}) {
    const displayName = user?.name || name || 'Người dùng';
    const avatarUrl = user?.avatar;
    const [imgError, setImgError] = useState(false);

    const sizeClasses = {
        xs: 'w-6 h-6 text-[10px]',
        sm: 'w-8 h-8 text-xs',
        md: 'w-10 h-10 text-sm',
        lg: 'w-12 h-12 text-base',
        xl: 'w-14 h-14 text-lg'
    }[size];

    const onlineDotSize = {
        xs: 'w-2 h-2 ring-1',
        sm: 'w-2.5 h-2.5 ring-2',
        md: 'w-3 h-3 ring-2',
        lg: 'w-3.5 h-3.5 ring-2',
        xl: 'w-4 h-4 ring-2'
    }[size];

    if (isGroup) {
        return (
            <div className="relative shrink-0">
                <div className={`${sizeClasses} rounded-full bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white font-bold flex items-center justify-center shadow-sm`}>
                    <Users size={size === 'xs' ? 12 : size === 'sm' ? 16 : size === 'lg' ? 22 : 18} />
                </div>
            </div>
        );
    }

    return (
        <div className="relative shrink-0 select-none">
            {avatarUrl && !imgError ? (
                <img
                    src={avatarUrl}
                    alt={displayName}
                    onError={() => setImgError(true)}
                    className={`${sizeClasses} rounded-full object-cover shadow-xs border border-slate-200/80 bg-white`}
                />
            ) : (
                <div className={`${sizeClasses} rounded-full bg-gradient-to-tr ${getGradientByName(displayName)} text-white font-bold flex items-center justify-center shadow-xs tracking-wider`}>
                    {getInitials(displayName)}
                </div>
            )}
            {showOnline && (
                <span
                    className={`absolute bottom-0 right-0 ${onlineDotSize} rounded-full ring-white ${isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    title={isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
                />
            )}
        </div>
    );
}

// Format friendly chat timestamp
function formatChatTime(dateInput: string | Date) {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins}p`;
    if (diffHours < 24 && date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1 || (diffDays < 2 && date.getDate() === now.getDate() - 1)) {
        return `Hôm qua ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// Common Emoji list for Quick Reaction & Picker
const EMOJI_CATEGORIES = [
    { name: 'Cảm xúc', emojis: ['👍', '❤️', '😄', '😍', '🥰', '😂', '😮', '😢', '🔥', '🎉', '👏', '🙏'] },
    { name: 'Công việc', emojis: ['💼', '📊', '📈', '📝', '📌', '💡', '⚠️', '✅', '❌', '🚀', '⭐', '🤝'] },
    { name: 'Giao tiếp', emojis: ['👋', '🙌', '💯', '👌', '💪', '🎯', '☕', '⚡', '🌟', '🔔', '💬', '📞'] }
];

export default function ChatWindow({
    currentUser,
    onClose,
    initialTargetUserId
}: {
    currentUser: any;
    onClose: () => void;
    initialTargetUserId?: string | null;
}) {
    const [rooms, setRooms] = useState<any[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

    // Layout Controls
    const [isExpanded, setIsExpanded] = useState(false);
    const [showMediaDrawer, setShowMediaDrawer] = useState(false);
    const [mediaItems, setMediaItems] = useState<any[]>([]);
    const [isLoadingMedia, setIsLoadingMedia] = useState(false);

    // Search in Chat
    const [showChatSearch, setShowChatSearch] = useState(false);
    const [chatSearchQuery, setChatSearchQuery] = useState('');

    // Emoji Popover State
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Copy Notification
    const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

    // New Chat State
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [activeTab, setActiveTab] = useState<'rooms' | 'users'>('rooms');
    const [searchTerm, setSearchTerm] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLTextAreaElement>(null);

    // Fetch rooms
    const fetchRooms = async () => {
        try {
            const data = await getChatRooms();
            setRooms(data);
        } catch (e) {
            console.error('Error fetching rooms', e);
        }
    };

    // Fetch messages for active room
    const fetchMessages = async (keepScroll = false) => {
        if (!activeRoomId) return;
        try {
            const data = await getChatMessages(activeRoomId);
            setMessages(data);
            if (!keepScroll) {
                scrollToBottom();
            }
        } catch (e) {
            console.error('Error fetching messages', e);
        }
    };

    // Fetch room media
    const fetchMedia = async (roomId: string) => {
        setIsLoadingMedia(true);
        try {
            const data = await getRoomMedia(roomId);
            setMediaItems(data);
        } catch (e) {
            console.error('Error fetching media', e);
        } finally {
            setIsLoadingMedia(false);
        }
    };

    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeRoomId) {
            fetchMessages();
            const interval = setInterval(() => fetchMessages(true), 2000);
            if (showMediaDrawer) {
                fetchMedia(activeRoomId);
            }
            return () => clearInterval(interval);
        }
    }, [activeRoomId, showMediaDrawer]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 80);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image/') !== -1 || items[i].kind === 'file') {
                e.preventDefault();
                const file = items[i].getAsFile();
                if (file) {
                    setAttachment(file);
                }
                break;
            }
        }
    };

    const handleToggleReaction = async (msgId: string, emoji: string) => {
        try {
            const res = await toggleReaction(msgId, emoji);
            setMessages(prev => prev.map(m => {
                if (m.id !== msgId) return m;
                let currentReactions = m.reactions || [];
                if (res.action === 'added') {
                    currentReactions = [...currentReactions, res.reaction];
                } else {
                    currentReactions = currentReactions.filter((r: any) => !(r.userId === currentUser.id && r.emoji === emoji));
                }
                return { ...m, reactions: currentReactions };
            }));
        } catch (err) {
            console.error('Reaction error', err);
        }
    };

    const handleDeleteMessage = async (msgId: string) => {
        if (!confirm('Bạn có chắc muốn thu hồi tin nhắn này?')) return;
        try {
            await deleteChatMessage(msgId);
            setMessages(prev => prev.filter(m => m.id !== msgId));
            await fetchRooms();
        } catch (err: any) {
            alert(err.message || 'Lỗi khi xóa tin nhắn');
        }
    };

    const handleCopyText = (content: string, msgId: string) => {
        navigator.clipboard.writeText(content);
        setCopiedMsgId(msgId);
        setTimeout(() => setCopiedMsgId(null), 2000);
    };

    const handleSend = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!activeRoomId || (!newMessage.trim() && !attachment) || isSending) return;
        setIsSending(true);
        try {
            let attachmentUrl;
            if (attachment) {
                const formData = new FormData();
                formData.append('file', attachment);
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) throw new Error('Lỗi tải tệp lên');
                const data = await res.json();
                attachmentUrl = data.url;
            }

            await sendMessage(activeRoomId, newMessage, attachmentUrl, replyingTo?.id);
            setNewMessage('');
            setAttachment(null);
            setReplyingTo(null);
            setShowEmojiPicker(false);
            await fetchMessages();
            await fetchRooms();
            scrollToBottom();
            if (chatInputRef.current) {
                chatInputRef.current.focus();
            }
        } catch (e: any) {
            alert(e.message || 'Lỗi gửi tin nhắn');
            console.error('Send error', e);
        } finally {
            setIsSending(false);
        }
    };

    const handleCreateChat = async () => {
        if (selectedUsers.length === 0) return;
        setIsSending(true);
        try {
            let roomId;
            if (selectedUsers.length === 1) {
                roomId = await createDirectChat(selectedUsers[0]);
            } else {
                roomId = await createGroupChat(groupName, selectedUsers);
            }
            await fetchRooms();
            setIsCreatingChat(false);
            setSelectedUsers([]);
            setGroupName('');
            setActiveRoomId(roomId);
        } catch (e) {
            alert(e instanceof Error ? e.message : 'Lỗi tạo nhóm');
        } finally {
            setIsSending(false);
        }
    };

    // Load all users for directory
    useEffect(() => {
        let isMounted = true;
        if (allUsers.length === 0) {
            getActiveUsersForChat().then(users => {
                if (isMounted) {
                    const activeMembers = users.filter((u: any) => u.id !== currentUser.id);
                    setAllUsers(activeMembers);

                    if (initialTargetUserId) {
                        setIsSending(true);
                        createDirectChat(initialTargetUserId).then(roomId => {
                            if (isMounted) {
                                setActiveRoomId(roomId);
                                setActiveTab('rooms');
                                setIsCreatingChat(false);
                            }
                        }).catch(e => console.error('Error auto-opening direct chat:', e))
                          .finally(() => { if (isMounted) setIsSending(false); });
                    }
                }
            }).catch(e => console.error('Failed to load users:', e));
        }
        return () => { isMounted = false; };
    }, [initialTargetUserId]);

    // Active room object
    const activeRoom = useMemo(() => {
        return rooms.find(r => r.id === activeRoomId) || null;
    }, [rooms, activeRoomId]);

    // Room display info
    const getRoomDisplayName = (room: any) => {
        if (!room) return 'Đang tải...';
        if (room.isGroup) return room.name || 'Nhóm Chat';
        const otherParticipant = room.participants?.find((p: any) => p.userId !== currentUser.id);
        return otherParticipant?.user?.name || 'Vô danh';
    };

    const getRoomOtherUser = (room: any) => {
        if (!room || room.isGroup) return null;
        const otherParticipant = room.participants?.find((p: any) => p.userId !== currentUser.id);
        return otherParticipant?.user || null;
    };

    const filteredRooms = rooms.filter(r => getRoomDisplayName(r).toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredUsers = allUsers.filter(u => (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()));

    // Filter messages if search inside chat is active
    const displayedMessages = useMemo(() => {
        if (!chatSearchQuery.trim()) return messages;
        const q = chatSearchQuery.toLowerCase();
        return messages.filter(m => (m.content || '').toLowerCase().includes(q) || (m.sender?.name || '').toLowerCase().includes(q));
    }, [messages, chatSearchQuery]);

    // Helper to render attachment preview
    const renderAttachmentPreview = (url: string) => {
        const ext = url.split('.').pop()?.toLowerCase() || '';
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext);

        if (isImage) {
            return (
                <div className="relative group/img overflow-hidden rounded-xl border border-slate-200/90 max-w-sm mt-1 bg-slate-900/5">
                    <img
                        src={url}
                        alt="attachment"
                        onClick={() => setZoomedImage(url)}
                        className="max-h-60 w-auto rounded-xl object-contain cursor-zoom-in hover:scale-102 transition-transform duration-200"
                    />
                </div>
            );
        }

        // Document File Card
        let icon = <FileText className="text-blue-600" size={24} />;
        let fileTypeLabel = 'Tài liệu';

        if (['pdf'].includes(ext)) {
            icon = <FileText className="text-red-500" size={24} />;
            fileTypeLabel = 'Tập tin PDF';
        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
            icon = <FileSpreadsheet className="text-emerald-600" size={24} />;
            fileTypeLabel = 'Bảng tính Excel';
        } else if (['doc', 'docx'].includes(ext)) {
            icon = <FileText className="text-blue-600" size={24} />;
            fileTypeLabel = 'Văn bản Word';
        } else if (['zip', 'rar', '7z'].includes(ext)) {
            icon = <Archive className="text-purple-600" size={24} />;
            fileTypeLabel = 'Tệp nén Zip';
        }

        const fileName = decodeURIComponent(url.split('/').pop() || 'Tập tin đính kèm');

        return (
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="flex items-center gap-3 p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl max-w-xs transition-colors shadow-xs group/file mt-1 text-slate-800 no-underline"
            >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover/file:bg-blue-50 transition-colors">
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate" title={fileName}>
                        {fileName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium">{fileTypeLabel}</div>
                </div>
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover/file:bg-blue-600 group-hover/file:text-white transition-colors shrink-0">
                    <Download size={14} />
                </div>
            </a>
        );
    };

    return (
        <div
            className={`transition-all duration-300 ease-in-out font-sans flex overflow-hidden bg-white border border-slate-200/90 shadow-2xl ${
                isExpanded
                    ? 'fixed inset-3 sm:inset-6 z-[999999] rounded-2xl'
                    : 'w-full h-full sm:w-[720px] sm:h-[620px] sm:rounded-2xl'
            }`}
            style={{ resize: isExpanded ? 'none' : 'both', minWidth: '380px', minHeight: '440px' }}
        >
            {/* ========================================================= */}
            {/* LEFT SIDEBAR: CONVERSATIONS & DIRECTORY */}
            {/* ========================================================= */}
            <div className={`${activeRoomId || isCreatingChat ? 'hidden sm:flex' : 'flex'} w-full sm:w-[280px] flex-col border-r border-slate-200/80 bg-slate-50/70 shrink-0 select-none`}>
                {/* Header Toolbar */}
                <div className="p-3.5 pb-2 border-b border-slate-200/80 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                                <MessageCircle size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm leading-tight">Chat Nội Bộ</h3>
                                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span>Trực tuyến</span>
                                </div>
                            </div>
                        </div>

                        {/* New Chat Button */}
                        <button
                            onClick={() => { setIsCreatingChat(true); setActiveRoomId(null); setActiveTab('users'); }}
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-xs"
                            title="Tạo cuộc hội thoại mới"
                        >
                            <Plus size={18} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Segmented Tabs */}
                    <div className="grid grid-cols-2 p-1 bg-slate-100/90 rounded-xl text-xs font-semibold">
                        <button
                            onClick={() => setActiveTab('rooms')}
                            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'rooms'
                                    ? 'bg-white text-blue-600 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <MessageCircle size={14} />
                            <span>Tin nhắn</span>
                            {rooms.some(r => {
                                const myP = r.participants?.find((p: any) => p.userId === currentUser.id);
                                const lastMsg = r.messages?.[0];
                                return myP && lastMsg && new Date(lastMsg.createdAt) > new Date(myP.lastRead);
                            }) && (
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                activeTab === 'users'
                                    ? 'bg-white text-blue-600 shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            <UserRound size={14} />
                            <span>Danh bạ</span>
                            <span className="text-[10px] text-slate-400 font-normal">({allUsers.length})</span>
                        </button>
                    </div>
                </div>

                {/* Search Input */}
                <div className="p-2.5">
                    <div className="relative">
                        <Search size={15} className="text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                        <input
                            type="text"
                            placeholder={activeTab === 'rooms' ? 'Tìm đoạn chat...' : 'Tìm đồng nghiệp...'}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Conversations / Users List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 px-2 space-y-1">
                    {activeTab === 'rooms' ? (
                        filteredRooms.length === 0 ? (
                            <div className="py-12 px-4 text-center">
                                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-2">
                                    <MessageCircle size={24} />
                                </div>
                                <div className="text-xs font-semibold text-slate-700">Chưa có cuộc hội thoại</div>
                                <div className="text-[11px] text-slate-400 mt-1">Bấm nút (+) ở trên để bắt đầu nhắn tin</div>
                            </div>
                        ) : (
                            filteredRooms.map((room: any) => {
                                const myParticipant = room.participants?.find((p: any) => p.userId === currentUser.id);
                                const lastMsg = room.messages?.[0];
                                const isUnread = myParticipant && lastMsg && new Date(lastMsg.createdAt) > new Date(myParticipant.lastRead);
                                const otherUser = getRoomOtherUser(room);
                                const isSelected = activeRoomId === room.id && !isCreatingChat;

                                return (
                                    <div
                                        key={room.id}
                                        onClick={() => {
                                            setActiveRoomId(room.id);
                                            setIsCreatingChat(false);
                                            setShowMediaDrawer(false);
                                        }}
                                        className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-3 relative ${
                                            isSelected
                                                ? 'bg-blue-50/90 text-blue-950 font-semibold shadow-2xs'
                                                : 'hover:bg-white text-slate-700'
                                        }`}
                                    >
                                        <UserAvatar
                                            user={otherUser}
                                            isGroup={room.isGroup}
                                            name={getRoomDisplayName(room)}
                                            size="md"
                                            showOnline={!room.isGroup}
                                            isOnline={true}
                                        />

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                                <span className={`text-xs truncate ${isUnread ? 'font-bold text-slate-950' : 'font-medium text-slate-800'}`}>
                                                    {getRoomDisplayName(room)}
                                                </span>
                                                {lastMsg && (
                                                    <span className={`text-[10px] shrink-0 ${isUnread ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                                                        {formatChatTime(lastMsg.createdAt)}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <p className={`text-[11px] truncate leading-tight ${isUnread ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                                                    {lastMsg ? (
                                                        <>
                                                            {lastMsg.senderId === currentUser.id && <span className="text-slate-400">Bạn: </span>}
                                                            {lastMsg.attachmentUrl ? (
                                                                <span className="inline-flex items-center gap-1 text-blue-600">
                                                                    <Paperclip size={11} /> Tập tin đính kèm
                                                                </span>
                                                            ) : (
                                                                lastMsg.content
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Bắt đầu trò chuyện</span>
                                                    )}
                                                </p>
                                                {isUnread && (
                                                    <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )
                    ) : (
                        // DIRECTORY TAB
                        <div className="space-y-1">
                            <div
                                onClick={() => { setIsCreatingChat(true); setActiveRoomId(null); }}
                                className="p-2.5 rounded-xl cursor-pointer bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:from-blue-100 hover:to-indigo-100 transition-all flex items-center gap-3 text-blue-700 font-semibold text-xs shadow-2xs"
                            >
                                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                    <Users size={16} />
                                </div>
                                <div>
                                    <div className="font-bold">Tạo nhóm chat mới</div>
                                    <div className="text-[10px] text-blue-500 font-normal">Trò chuyện cùng nhiều đồng nghiệp</div>
                                </div>
                            </div>

                            {filteredUsers.map((u: any) => (
                                <div
                                    key={u.id}
                                    onClick={async () => {
                                        setIsSending(true);
                                        try {
                                            const roomId = await createDirectChat(u.id);
                                            await fetchRooms();
                                            setActiveRoomId(roomId);
                                            setActiveTab('rooms');
                                            setIsCreatingChat(false);
                                        } catch (e) {
                                            alert('Lỗi tạo chat');
                                        } finally {
                                            setIsSending(false);
                                        }
                                    }}
                                    className="p-2.5 rounded-xl cursor-pointer hover:bg-white transition-all flex items-center gap-3"
                                >
                                    <UserAvatar user={u} size="md" showOnline isOnline={true} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-semibold text-slate-800 truncate">{u.name}</div>
                                        <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                                    </div>
                                    <button className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white px-2.5 py-1 rounded-lg font-semibold transition-all">
                                        Nhắn tin
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================= */}
            {/* RIGHT MAIN AREA: ACTIVE CHAT / NEW CHAT / EMPTY STATE */}
            {/* ========================================================= */}
            <div className={`${activeRoomId || isCreatingChat ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-white relative min-w-0`}>
                {isCreatingChat ? (
                    // --- CREATE GROUP CHAT VIEW ---
                    <div className="flex flex-col h-full bg-white">
                        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <button
                                    className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors"
                                    onClick={() => { setIsCreatingChat(false); if (rooms.length > 0) setActiveRoomId(rooms[0].id); }}
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Tạo nhóm hội thoại</h3>
                                    <p className="text-[11px] text-slate-500">Chọn các thành viên để trò chuyện nhóm</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 flex-1 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                    Tên nhóm trò chuyện <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="VD: Dự án T-Solutions, Nhóm Kỹ thuật..."
                                    value={groupName}
                                    onChange={e => setGroupName(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-slate-700">
                                        Chọn thành viên ({selectedUsers.length} đã chọn)
                                    </label>
                                    {selectedUsers.length > 0 && (
                                        <button
                                            onClick={() => setSelectedUsers([])}
                                            className="text-[11px] text-blue-600 hover:underline font-medium"
                                        >
                                            Bỏ chọn tất cả
                                        </button>
                                    )}
                                </div>

                                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-72 overflow-y-auto bg-white shadow-2xs">
                                    {allUsers.map((u: any) => {
                                        const isChecked = selectedUsers.includes(u.id);
                                        return (
                                            <label
                                                key={u.id}
                                                className={`flex items-center gap-3 p-2.5 cursor-pointer transition-colors ${
                                                    isChecked ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                                                        else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                                    }}
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 rounded-md border-slate-300"
                                                />
                                                <UserAvatar user={u} size="sm" />
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-semibold text-slate-800 truncate">{u.name}</div>
                                                    <div className="text-[11px] text-slate-400 truncate">{u.email}</div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end gap-2.5">
                            <button
                                onClick={() => setIsCreatingChat(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateChat}
                                disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName.trim()) || isSending}
                                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {isSending ? 'Đang tạo...' : 'Tạo nhóm ngay'}
                            </button>
                        </div>
                    </div>

                ) : !activeRoom ? (
                    // --- EMPTY STATE ---
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-50/40">
                        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                            <Sparkles size={32} />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">Chào mừng bạn đến với Chat Nội Bộ</h3>
                        <p className="text-xs text-slate-500 max-w-xs leading-relaxed mb-4">
                            Chọn một cuộc hội thoại từ danh sách bên trái hoặc bắt đầu cuộc trò chuyện mới để kết nối ngay.
                        </p>
                        <button
                            onClick={() => { setActiveTab('users'); }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2"
                        >
                            <UserRound size={15} /> Xem danh bạ đồng nghiệp
                        </button>
                    </div>

                ) : (
                    // --- ACTIVE CONVERSATION VIEW ---
                    <>
                        {/* Conversation Header */}
                        <div className="px-4 py-3 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3 shadow-2xs z-10 select-none">
                            <div className="flex items-center gap-3 min-w-0">
                                <button
                                    className="sm:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                                    onClick={() => { setActiveRoomId(null); setIsCreatingChat(false); }}
                                >
                                    <ArrowLeft size={18} />
                                </button>

                                <UserAvatar
                                    user={getRoomOtherUser(activeRoom)}
                                    isGroup={activeRoom.isGroup}
                                    name={getRoomDisplayName(activeRoom)}
                                    size="md"
                                    showOnline={!activeRoom.isGroup}
                                    isOnline={true}
                                />

                                <div className="min-w-0">
                                    <h2 className="text-sm font-bold text-slate-900 truncate leading-tight flex items-center gap-1.5">
                                        {getRoomDisplayName(activeRoom)}
                                    </h2>
                                    <p className="text-[11px] text-slate-400 truncate mt-0.5 font-medium">
                                        {activeRoom.isGroup ? (
                                            <span>{activeRoom.participants?.length || 0} thành viên: {activeRoom.participants?.map((p: any) => p.user.name).join(', ')}</span>
                                        ) : (
                                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đang trực tuyến
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>

                            {/* Header Action Tools */}
                            <div className="flex items-center gap-1 shrink-0 text-slate-500">
                                <button
                                    onClick={() => setShowChatSearch(!showChatSearch)}
                                    className={`p-2 rounded-xl hover:bg-slate-100 transition-colors ${showChatSearch ? 'text-blue-600 bg-blue-50' : ''}`}
                                    title="Tìm kiếm trong cuộc trò chuyện"
                                >
                                    <Search size={17} />
                                </button>

                                <button
                                    onClick={() => {
                                        setShowMediaDrawer(!showMediaDrawer);
                                        if (!showMediaDrawer && activeRoomId) {
                                            fetchMedia(activeRoomId);
                                        }
                                    }}
                                    className={`p-2 rounded-xl hover:bg-slate-100 transition-colors ${showMediaDrawer ? 'text-blue-600 bg-blue-50' : ''}`}
                                    title="Kho lưu trữ file & hình ảnh"
                                >
                                    <Folder size={17} />
                                </button>

                                <button
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 rounded-xl hover:bg-slate-100 transition-colors hidden sm:inline-flex"
                                    title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
                                >
                                    {isExpanded ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
                                </button>

                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                    title="Đóng cửa sổ"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Search Inside Chat Bar */}
                        {showChatSearch && (
                            <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2 animate-fadeIn">
                                <Search size={14} className="text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm nội dung tin nhắn..."
                                    value={chatSearchQuery}
                                    onChange={e => setChatSearchQuery(e.target.value)}
                                    autoFocus
                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                                {chatSearchQuery && (
                                    <span className="text-[11px] text-slate-500 font-medium">
                                        {displayedMessages.length} kết quả
                                    </span>
                                )}
                                <button
                                    onClick={() => { setShowChatSearch(false); setChatSearchQuery(''); }}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        )}

                        {/* Main Conversation Feed + Media Drawer Layout */}
                        <div className="flex-1 flex overflow-hidden relative">
                            {/* Message Feed Area */}
                            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-4 bg-[#f8fafc]">
                                {displayedMessages.length === 0 ? (
                                    <div className="my-auto text-center py-12">
                                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto mb-2">
                                            <MessageCircle size={24} />
                                        </div>
                                        <p className="text-xs font-semibold text-slate-700">Chưa có tin nhắn nào</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện!</p>
                                    </div>
                                ) : (
                                    displayedMessages.map((msg: any, index: number) => {
                                        const msgDate = new Date(msg.createdAt);
                                        const prevMsg = index > 0 ? displayedMessages[index - 1] : null;
                                        const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
                                        const isNewDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                                        const isMine = msg.senderId === currentUser.id;
                                        const showAvatar = !isMine && (index === displayedMessages.length - 1 || displayedMessages[index + 1]?.senderId !== msg.senderId);
                                        const showName = !isMine && (index === 0 || displayedMessages[index - 1]?.senderId !== msg.senderId);

                                        return (
                                            <React.Fragment key={msg.id}>
                                                {/* Date Separator Pill */}
                                                {isNewDay && (
                                                    <div className="flex justify-center my-2">
                                                        <span className="px-3 py-1 bg-slate-200/80 text-slate-600 text-[11px] font-semibold rounded-full shadow-2xs">
                                                            {msgDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Message Bubble Item */}
                                                <div
                                                    className={`flex gap-2 items-end group ${isMine ? 'justify-end' : 'justify-start'}`}
                                                    onMouseEnter={() => setHoveredMessageId(msg.id)}
                                                    onMouseLeave={() => setHoveredMessageId(null)}
                                                >
                                                    {/* Other Person's Avatar */}
                                                    {!isMine && (
                                                        <div className="w-7 h-7 shrink-0 mb-1">
                                                            {showAvatar ? (
                                                                <UserAvatar user={msg.sender} size="xs" />
                                                            ) : (
                                                                <div className="w-7 h-7" />
                                                            )}
                                                        </div>
                                                    )}

                                                    <div className={`flex flex-col max-w-[78%] relative ${isMine ? 'items-end' : 'items-start'}`}>
                                                        {/* Sender Name in Group Chat */}
                                                        {showName && activeRoom.isGroup && (
                                                            <span className="text-[11px] text-slate-500 font-semibold mb-1 ml-1">
                                                                {msg.sender?.name}
                                                            </span>
                                                        )}

                                                        {/* Hover Quick Actions Bar */}
                                                        {hoveredMessageId === msg.id && (
                                                            <div
                                                                className={`absolute -top-7 z-20 flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-0.5 shadow-md animate-fadeIn ${
                                                                    isMine ? 'right-0' : 'left-0'
                                                                }`}
                                                            >
                                                                <button
                                                                    onClick={() => handleToggleReaction(msg.id, '👍')}
                                                                    className="hover:scale-125 transition-transform p-0.5 text-xs"
                                                                    title="Thích"
                                                                >
                                                                    👍
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleReaction(msg.id, '❤️')}
                                                                    className="hover:scale-125 transition-transform p-0.5 text-xs"
                                                                    title="Yêu thích"
                                                                >
                                                                    ❤️
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleReaction(msg.id, '😄')}
                                                                    className="hover:scale-125 transition-transform p-0.5 text-xs"
                                                                    title="Cười"
                                                                >
                                                                    😄
                                                                </button>
                                                                <button
                                                                    onClick={() => handleToggleReaction(msg.id, '🔥')}
                                                                    className="hover:scale-125 transition-transform p-0.5 text-xs"
                                                                    title="Tuyệt vời"
                                                                >
                                                                    🔥
                                                                </button>
                                                                <div className="w-[1px] h-3 bg-slate-200 mx-0.5" />
                                                                <button
                                                                    onClick={() => { setReplyingTo(msg); chatInputRef.current?.focus(); }}
                                                                    className="p-1 text-slate-500 hover:text-blue-600 rounded-full hover:bg-slate-100"
                                                                    title="Trả lời"
                                                                >
                                                                    <Reply size={13} />
                                                                </button>
                                                                {msg.content && (
                                                                    <button
                                                                        onClick={() => handleCopyText(msg.content, msg.id)}
                                                                        className="p-1 text-slate-500 hover:text-blue-600 rounded-full hover:bg-slate-100"
                                                                        title="Sao chép nội dung"
                                                                    >
                                                                        {copiedMsgId === msg.id ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                                                                    </button>
                                                                )}
                                                                {isMine && (
                                                                    <button
                                                                        onClick={() => handleDeleteMessage(msg.id)}
                                                                        className="p-1 text-slate-400 hover:text-rose-600 rounded-full hover:bg-rose-50"
                                                                        title="Thu hồi tin nhắn"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Main Bubble Content */}
                                                        <div
                                                            className={`p-3 rounded-2xl text-[13.5px] leading-relaxed break-words shadow-2xs ${
                                                                isMine
                                                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-xs'
                                                                    : 'bg-white border border-slate-200/90 text-slate-900 rounded-bl-xs'
                                                            }`}
                                                        >
                                                            {/* Quoted Message Preview if replying */}
                                                            {msg.replyTo && (
                                                                <div
                                                                    className={`p-2 mb-2 rounded-lg text-xs border-l-3 ${
                                                                        isMine
                                                                            ? 'bg-black/15 border-white/80 text-white/90'
                                                                            : 'bg-slate-100/90 border-blue-600 text-slate-700'
                                                                    }`}
                                                                >
                                                                    <div className="font-bold text-[11px] mb-0.5">
                                                                        {msg.replyTo.sender?.name || 'Ai đó'}
                                                                    </div>
                                                                    <div className="truncate opacity-80 text-[11px]">
                                                                        {msg.replyTo.content || '[Tập tin đính kèm]'}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Attachment View */}
                                                            {msg.attachmentUrl && renderAttachmentPreview(msg.attachmentUrl)}

                                                            {/* Text Content */}
                                                            {msg.content && (
                                                                <div className="whitespace-pre-wrap">
                                                                    {msg.content}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Reactions Pill Display */}
                                                        {msg.reactions && msg.reactions.length > 0 && (
                                                            <div className={`flex flex-wrap gap-1 mt-1 z-10 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                                {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => {
                                                                    const count = msg.reactions.filter((r: any) => r.emoji === emoji).length;
                                                                    const iReacted = msg.reactions.some((r: any) => r.emoji === emoji && r.userId === currentUser.id);
                                                                    return (
                                                                        <button
                                                                            key={emoji}
                                                                            onClick={() => handleToggleReaction(msg.id, emoji)}
                                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all shadow-2xs ${
                                                                                iReacted
                                                                                    ? 'bg-blue-100 border border-blue-300 text-blue-800 font-bold'
                                                                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                                                                            }`}
                                                                        >
                                                                            <span>{emoji}</span>
                                                                            {count > 1 && <span className="text-[10px]">{count}</span>}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}

                                                        {/* Timestamp */}
                                                        <span className={`text-[10px] text-slate-400 mt-1 ${isMine ? 'mr-1' : 'ml-1'}`}>
                                                            {msgDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </React.Fragment>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Shared Media & Files Drawer */}
                            {showMediaDrawer && (
                                <div className="w-72 border-l border-slate-200 bg-white flex flex-col p-4 z-20 shadow-lg animate-slideLeft">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2 font-bold text-xs text-slate-800">
                                            <Folder size={16} className="text-blue-600" />
                                            <span>Tệp & Ảnh đã chia sẻ</span>
                                        </div>
                                        <button
                                            onClick={() => setShowMediaDrawer(false)}
                                            className="text-slate-400 hover:text-slate-600 p-1"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto py-3 space-y-2">
                                        {isLoadingMedia ? (
                                            <div className="text-center py-8 text-xs text-slate-400">Đang tải tệp...</div>
                                        ) : mediaItems.length === 0 ? (
                                            <div className="text-center py-12 text-xs text-slate-400">
                                                Chưa có ảnh hoặc tập tin nào được gửi trong đoạn chat này.
                                            </div>
                                        ) : (
                                            mediaItems.map((item: any) => {
                                                const ext = item.attachmentUrl.split('.').pop()?.toLowerCase() || '';
                                                const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
                                                const fileName = decodeURIComponent(item.attachmentUrl.split('/').pop() || 'Tập tin');

                                                return (
                                                    <div key={item.id} className="p-2 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                                                        {isImage ? (
                                                            <div className="flex items-center gap-2.5">
                                                                <img
                                                                    src={item.attachmentUrl}
                                                                    alt={fileName}
                                                                    onClick={() => setZoomedImage(item.attachmentUrl)}
                                                                    className="w-12 h-12 rounded-lg object-cover cursor-pointer border border-slate-200 shrink-0"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-semibold text-slate-800 truncate">{fileName}</div>
                                                                    <div className="text-[10px] text-slate-400">{formatChatTime(item.createdAt)}</div>
                                                                </div>
                                                                <a href={item.attachmentUrl} download target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600">
                                                                    <Download size={15} />
                                                                </a>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                                                    <FileText size={20} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-xs font-semibold text-slate-800 truncate">{fileName}</div>
                                                                    <div className="text-[10px] text-slate-400">{formatChatTime(item.createdAt)}</div>
                                                                </div>
                                                                <a href={item.attachmentUrl} download target="_blank" rel="noopener noreferrer" className="p-1.5 text-slate-400 hover:text-blue-600">
                                                                    <Download size={15} />
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-3 border-t border-slate-200/80 bg-white relative">
                            {/* Replying Banner */}
                            {replyingTo && (
                                <div className="flex items-center justify-between p-2 mb-2 bg-blue-50/80 border-l-3 border-blue-600 rounded-r-xl text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Reply size={14} className="text-blue-600 shrink-0" />
                                        <div className="truncate">
                                            <span className="font-bold text-blue-900">Trả lời {replyingTo.sender?.name}: </span>
                                            <span className="text-slate-600">{replyingTo.content || '[Tập tin đính kèm]'}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-700 p-1">
                                        <X size={15} />
                                    </button>
                                </div>
                            )}

                            {/* Attachment Staged Preview */}
                            {attachment && (
                                <div className="flex items-center justify-between p-2 mb-2 bg-slate-100 rounded-xl text-xs border border-slate-200">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <Paperclip size={15} className="text-blue-600 shrink-0" />
                                        <span className="font-medium text-slate-800 truncate">{attachment.name}</span>
                                        <span className="text-[10px] text-slate-400">({(attachment.size / 1024).toFixed(1)} KB)</span>
                                    </div>
                                    <button onClick={() => setAttachment(null)} className="text-slate-400 hover:text-rose-600 p-1">
                                        <X size={15} />
                                    </button>
                                </div>
                            )}

                            {/* Emoji Picker Popover */}
                            {showEmojiPicker && (
                                <div className="absolute bottom-16 right-4 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 animate-fadeIn">
                                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                        <span className="text-xs font-bold text-slate-700">Biểu tượng cảm xúc</span>
                                        <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-slate-600">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                                        {EMOJI_CATEGORIES.map(cat => (
                                            <div key={cat.name}>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{cat.name}</div>
                                                <div className="grid grid-cols-6 gap-1.5">
                                                    {cat.emojis.map(e => (
                                                        <button
                                                            key={e}
                                                            type="button"
                                                            onClick={() => {
                                                                setNewMessage(prev => prev + e);
                                                                chatInputRef.current?.focus();
                                                            }}
                                                            className="text-lg hover:scale-125 transition-transform p-1 rounded-lg hover:bg-slate-100 text-center"
                                                        >
                                                            {e}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Main Input Form */}
                            <form onSubmit={handleSend} className="flex items-end gap-2">
                                <input
                                    type="file"
                                    id="chat-file-input"
                                    hidden
                                    onChange={e => {
                                        if (e.target.files?.[0]) setAttachment(e.target.files[0]);
                                        e.target.value = '';
                                    }}
                                />

                                {/* Attach File Button */}
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('chat-file-input')?.click()}
                                    className="p-2.5 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all shrink-0 border border-slate-200 bg-slate-50/50"
                                    title="Gửi hình ảnh hoặc tài liệu"
                                >
                                    <Paperclip size={18} />
                                </button>

                                {/* Emoji Button */}
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className={`p-2.5 rounded-xl transition-all shrink-0 border border-slate-200 ${
                                        showEmojiPicker ? 'bg-amber-50 text-amber-600 border-amber-200' : 'text-slate-500 hover:text-amber-500 hover:bg-amber-50 bg-slate-50/50'
                                    }`}
                                    title="Chọn biểu tượng cảm xúc"
                                >
                                    <SmilePlus size={18} />
                                </button>

                                {/* Textarea Input */}
                                <div className="flex-1 min-w-0 relative">
                                    <textarea
                                        ref={chatInputRef}
                                        value={newMessage}
                                        onChange={e => setNewMessage(e.target.value)}
                                        onPaste={handlePaste}
                                        placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                                        rows={1}
                                        style={{ minHeight: '40px', maxHeight: '120px' }}
                                        className="w-full px-3.5 py-2 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white resize-none transition-all shadow-2xs"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSend();
                                            }
                                        }}
                                    />
                                </div>

                                {/* Send Button */}
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !attachment) || isSending}
                                    className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition-all shrink-0 font-bold"
                                    title="Gửi tin nhắn"
                                >
                                    <Send size={18} className="translate-x-0.5" />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>

            {/* ========================================================= */}
            {/* FULLSCREEN IMAGE LIGHTBOX MODAL */}
            {/* ========================================================= */}
            {zoomedImage && (
                <div
                    className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[999999] flex items-center justify-center p-6 animate-fadeIn cursor-zoom-out"
                    onClick={() => setZoomedImage(null)}
                >
                    <div className="absolute top-4 right-4 flex items-center gap-3">
                        <a
                            href={zoomedImage}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Tải ảnh gốc"
                        >
                            <Download size={20} />
                        </a>
                        <button
                            onClick={() => setZoomedImage(null)}
                            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                        >
                            <X size={22} />
                        </button>
                    </div>
                    <img
                        src={zoomedImage}
                        alt="Zoomed attachment"
                        onClick={(e) => e.stopPropagation()}
                        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
}

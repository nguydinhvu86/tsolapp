'use client'

import React, { useState, useEffect, useRef } from 'react';
import { Send, X, Plus, Search, Users, UserRound, ArrowLeft, MessageCircle, Paperclip, Reply, SmilePlus, ThumbsUp, Heart } from 'lucide-react';
import { getChatRooms, getChatMessages, sendMessage, createDirectChat, createGroupChat, getActiveUsersForChat, toggleReaction } from '@/app/chat/actions';

export default function ChatWindow({ currentUser, onClose }: { currentUser: any, onClose: () => void }) {
    const [rooms, setRooms] = useState<any[]>([]);
    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [attachment, setAttachment] = useState<File | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);

    // New Chat State
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [groupName, setGroupName] = useState('');
    const [activeTab, setActiveTab] = useState<'rooms' | 'users'>('rooms');

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch rooms
    const fetchRooms = async () => {
        try {
            const data = await getChatRooms();
            setRooms(data);
        } catch (e) { console.error('Error fetching rooms', e); }
    };

    // Fetch messages for active room
    const fetchMessages = async () => {
        if (!activeRoomId) return;
        try {
            const data = await getChatMessages(activeRoomId);
            setMessages(data);
            scrollToBottom();
        } catch (e) { console.error('Error fetching messages', e); }
    };

    useEffect(() => {
        fetchRooms();
        const interval = setInterval(fetchRooms, 3000); // Poll rooms every 3s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeRoomId) {
            fetchMessages();
            const interval = setInterval(fetchMessages, 1500); // Poll active messages every 1.5s
            return () => clearInterval(interval);
        }
    }, [activeRoomId]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image/') !== -1) {
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
        } catch (err) { console.error('Reaction error', err); }
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeRoomId || (!newMessage.trim() && !attachment)) return;
        setIsSending(true);
        try {
            let attachmentUrl;
            if (attachment) {
                const formData = new FormData();
                formData.append('file', attachment);
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!res.ok) throw new Error('Lỗi tải ảnh lên');
                const data = await res.json();
                attachmentUrl = data.url;
            }

            await sendMessage(activeRoomId, newMessage, attachmentUrl, replyingTo?.id);
            setNewMessage('');
            setAttachment(null);
            setReplyingTo(null);
            await fetchMessages();
            await fetchRooms();
            scrollToBottom();
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

    // Load all users
    useEffect(() => {
        let isMounted = true;
        if (allUsers.length === 0) {
            getActiveUsersForChat().then(users => {
                if (isMounted) {
                    const activeMembers = users.filter((u: any) => u.id !== currentUser.id);
                    setAllUsers(activeMembers);
                }
            }).catch(e => console.error('Failed to load users:', e));
        }
        return () => { isMounted = false; };
    }, []);

    // Helpers
    const getRoomName = (room: any) => {
        if (!room) return 'Đang tải...';
        if (room.isGroup) return room.name || 'Nhóm Chat';
        const otherParticipant = room.participants.find((p: any) => p.userId !== currentUser.id);
        return otherParticipant?.user?.name || 'Vô danh';
    };

    const userMap = allUsers.reduce((acc, u) => ({ ...acc, [u.id]: u.name }), {});

    const filteredRooms = rooms.filter(r => getRoomName(r).toLowerCase().includes(searchTerm.toLowerCase()));
    const filteredUsers = allUsers.filter(u => (u.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div style={{
            width: '600px',
            minWidth: '400px',
            height: '560px',
            minHeight: '400px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            overflow: 'hidden',
            fontFamily: 'Inter, sans-serif',
            resize: 'both' // Allow user to resize the popover
        }}>
            {/* LEFT SIDEBAR - ROOMS */}
            <div style={{
                width: '240px',
                borderRight: '1px solid #e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#f8fafc'
            }}>
                {/* Header Tabs */}
                <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', backgroundColor: 'white' }}>
                    <button
                        onClick={() => setActiveTab('rooms')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: activeTab === 'rooms' ? 700 : 500, color: activeTab === 'rooms' ? '#3b82f6' : '#64748b', paddingBottom: '4px', borderBottom: activeTab === 'rooms' ? '2px solid #3b82f6' : '2px solid transparent' }}
                    >
                        Tin nhắn
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', fontWeight: activeTab === 'users' ? 700 : 500, color: activeTab === 'users' ? '#3b82f6' : '#64748b', paddingBottom: '4px', borderBottom: activeTab === 'users' ? '2px solid #3b82f6' : '2px solid transparent' }}
                    >
                        Danh bạ
                    </button>
                </div>

                {/* Search */}
                <div style={{ padding: '12px' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                        />
                    </div>
                </div>

                {/* List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'rooms' ? (
                        filteredRooms.length === 0 ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                                Chưa có cuộc hội thoại nào.
                            </div>
                        ) : (
                            filteredRooms.map((room: any) => {
                                const myParticipant = room.participants.find((p: any) => p.userId === currentUser.id);
                                const lastMsg = room.messages[0];
                                const isUnread = myParticipant && lastMsg && new Date(lastMsg.createdAt) > new Date(myParticipant.lastRead);

                                return (
                                    <div
                                        key={room.id}
                                        onClick={() => { setActiveRoomId(room.id); setIsCreatingChat(false); }}
                                        style={{
                                            padding: '12px 16px',
                                            cursor: 'pointer',
                                            borderBottom: '1px solid #f1f5f9',
                                            backgroundColor: activeRoomId === room.id ? '#eef2ff' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            transition: 'background-color 0.2s'
                                        }}
                                        className="hover:bg-slate-100"
                                    >
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: room.isGroup ? '#e2e8f0' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', color: room.isGroup ? '#64748b' : '#3b82f6', flexShrink: 0 }}>
                                            {room.isGroup ? <Users size={20} /> : <UserRound size={20} />}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                                                <div style={{ fontWeight: isUnread ? 700 : 600, fontSize: '14px', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {getRoomName(room)}
                                                </div>
                                                {lastMsg && (() => {
                                                    const msgDate = new Date(lastMsg.createdAt);
                                                    const isToday = msgDate.toDateString() === new Date().toDateString();
                                                    const timeStr = msgDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                                                    const dateStr = msgDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                                                    return (
                                                        <div style={{ fontSize: '11px', color: isUnread ? '#3b82f6' : '#94a3b8', fontWeight: isUnread ? 600 : 400 }}>
                                                            {isToday ? timeStr : `${timeStr} ${dateStr}`}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                            {lastMsg && (
                                                <div style={{ fontSize: '13px', color: isUnread ? '#1e293b' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: isUnread ? 500 : 400 }}>
                                                    {lastMsg.senderId === currentUser.id ? 'Bạn: ' : ''}{lastMsg.content}
                                                </div>
                                            )}
                                        </div>
                                        {isUnread && (
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
                                        )}
                                    </div>
                                );
                            })
                        )
                    ) : (
                        <>
                            <div
                                onClick={() => { setIsCreatingChat(true); setActiveRoomId(null); setActiveTab('rooms'); }}
                                style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', color: '#3b82f6', fontWeight: 600 }}
                                className="hover:bg-slate-50"
                            >
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={20} />
                                </div>
                                Tạo nhóm chat mới
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
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        borderBottom: '1px solid #f1f5f9',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        transition: 'background-color 0.2s'
                                    }}
                                    className="hover:bg-slate-100"
                                >
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', flexShrink: 0 }}>
                                        <UserRound size={20} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0, fontWeight: 500, fontSize: '14px', color: '#0f172a' }}>
                                        {u.name || 'Người dùng ẩn danh'}
                                        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 400 }}>{u.email}</div>
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
            </div>

            {/* RIGHT MAIN AREA */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'white', position: 'relative' }}>
                {/* Close Button Top Right */}
                <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }} className="hover:text-slate-700">
                    <X size={20} />
                </button>

                {isCreatingChat ? (
                    // --- CREATE CHAT VIEW ---
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '24px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MessageCircle size={24} color="#3b82f6" /> Tin nhắn mới
                        </h2>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Chọn người nhận</label>
                                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px' }}>
                                    {allUsers.map((u: any) => (
                                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', cursor: 'pointer', borderRadius: '6px' }} className="hover:bg-slate-50">
                                            <input
                                                type="checkbox"
                                                checked={selectedUsers.includes(u.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedUsers([...selectedUsers, u.id]);
                                                    else setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                                                }}
                                                style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                                            />
                                            <span style={{ fontSize: '14px', color: '#334155' }}>{u.name} <span style={{ color: '#94a3b8', fontSize: '12px' }}>({u.email})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {selectedUsers.length > 1 && (
                                <div>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Tên nhóm chat <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Nhập tên nhóm..."
                                        value={groupName}
                                        onChange={e => setGroupName(e.target.value)}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ marginTop: 'auto', borderTop: '1px solid #e2e8f0', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button onClick={() => setIsCreatingChat(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
                                Hủy
                            </button>
                            <button
                                onClick={handleCreateChat}
                                disabled={selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName.trim()) || isSending}
                                style={{
                                    padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: 600, opacity: (selectedUsers.length === 0 || (selectedUsers.length > 1 && !groupName.trim()) || isSending) ? 0.5 : 1
                                }}
                            >
                                Bắt đầu chat
                            </button>
                        </div>
                    </div>

                ) : !activeRoomId ? (
                    // --- EMPTY STATE ---
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', padding: '32px', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                            <MessageCircle size={40} color="#cbd5e1" />
                        </div>
                        <h3 style={{ fontSize: '1.25rem', color: '#475569', fontWeight: 600, marginBottom: '8px' }}>Chọn một cuộc hội thoại</h3>
                        <p style={{ fontSize: '14px', maxWidth: '300px', lineHeight: 1.5 }}>
                            Bấm vào danh sách bên trái để xem tin nhắn, hoặc tạo cuộc trò chuyện mới với đồng nghiệp.
                        </p>
                    </div>

                ) : (
                    // --- ACTIVE CHAT VIEW ---
                    <>
                        {/* Chat Header */}
                        <div style={{ padding: '16px 48px 16px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                {rooms.find(r => r.id === activeRoomId)?.isGroup ? <Users size={20} /> : <UserRound size={20} />}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                                    {getRoomName(rooms.find(r => r.id === activeRoomId))}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                    {rooms.find(r => r.id === activeRoomId)?.participants?.map((p: any) => p.user.name).join(', ')}
                                </div>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: '#f8fafc' }}>
                            {messages.length === 0 ? (
                                <div style={{ margin: 'auto', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                    Chưa có tin nhắn nào. Hãy gửi lời chào!
                                </div>
                            ) : (
                                messages.map((msg: any, index: number) => {
                                    const msgDate = new Date(msg.createdAt);
                                    const prevMsg = index > 0 ? messages[index - 1] : null;
                                    const prevDate = prevMsg ? new Date(prevMsg.createdAt) : null;
                                    const isNewDay = !prevDate || msgDate.toDateString() !== prevDate.toDateString();

                                    const isMine = msg.senderId === currentUser.id;
                                    const showName = !isMine && (index === 0 || messages[index - 1].senderId !== msg.senderId);

                                    return (
                                        <React.Fragment key={msg.id}>
                                            {isNewDay && (
                                                <div style={{ alignSelf: 'center', margin: '8px 0', padding: '4px 12px', backgroundColor: '#e2e8f0', color: '#64748b', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
                                                    {msgDate.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' })}
                                                </div>
                                            )}
                                            <div
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', position: 'relative' }}
                                                className="group"
                                                onMouseEnter={() => setHoveredMessageId(msg.id)}
                                                onMouseLeave={() => setHoveredMessageId(null)}
                                            >
                                                {hoveredMessageId === msg.id && (
                                                    <div style={{ position: 'absolute', top: '-16px', [isMine ? 'right' : 'left']: '50%', display: 'flex', gap: '4px', padding: '2px 6px', backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                                                        <button type="button" onClick={() => handleToggleReaction(msg.id, '👍')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Thích"><ThumbsUp size={14} color="#3b82f6" /></button>
                                                        <button type="button" onClick={() => handleToggleReaction(msg.id, '❤️')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Yêu thích"><Heart size={14} color="#ef4444" /></button>
                                                        <button type="button" onClick={() => handleToggleReaction(msg.id, '😄')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Cười"><SmilePlus size={14} color="#f59e0b" /></button>
                                                        <div style={{ width: '1px', backgroundColor: '#e2e8f0', margin: '0 2px' }}></div>
                                                        <button type="button" onClick={() => setReplyingTo(msg)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Trả lời"><Reply size={14} color="#64748b" /></button>
                                                    </div>
                                                )}
                                                {showName && <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', marginLeft: '12px' }}>{msg.sender.name}</div>}
                                                <div style={{
                                                    maxWidth: '75%',
                                                    padding: msg.content || msg.replyTo ? '10px 14px' : '4px',
                                                    borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                                    backgroundColor: msg.content || msg.replyTo ? (isMine ? '#3b82f6' : 'white') : 'transparent',
                                                    color: isMine ? 'white' : '#1e293b',
                                                    boxShadow: msg.content || msg.replyTo ? '0 1px 2px 0 rgba(0, 0, 0, 0.05)' : 'none',
                                                    border: (isMine || !(msg.content || msg.replyTo)) ? 'none' : '1px solid #e2e8f0',
                                                    fontSize: '14.5px',
                                                    lineHeight: 1.5,
                                                    wordBreak: 'break-word',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '8px'
                                                }}>
                                                    {msg.replyTo && (
                                                        <div style={{ borderLeft: `3px solid ${isMine ? 'rgba(255,255,255,0.4)' : '#3b82f6'}`, paddingLeft: '8px', marginBottom: '4px', fontSize: '12px', opacity: 0.9 }}>
                                                            <div style={{ fontWeight: 600, marginBottom: '2px' }}>{msg.replyTo.sender?.name || 'Ai đó'}</div>
                                                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{msg.replyTo.content || '[Hình ảnh]'}</div>
                                                        </div>
                                                    )}
                                                    {msg.attachmentUrl && (
                                                        <img
                                                            src={msg.attachmentUrl}
                                                            alt="attachment"
                                                            onClick={() => setZoomedImage(msg.attachmentUrl)}
                                                            className="hover:opacity-90"
                                                            style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '12px', border: '1px solid #e2e8f0', objectFit: 'contain', backgroundColor: 'white', cursor: 'zoom-in', transition: 'opacity 0.2s' }}
                                                        />
                                                    )}
                                                    {msg.content && msg.content.split('\n').map((line: string, i: number) => (
                                                        <React.Fragment key={i}>{line}<br /></React.Fragment>
                                                    ))}
                                                </div>
                                                {msg.reactions && msg.reactions.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '4px', alignSelf: isMine ? 'flex-end' : 'flex-start', marginTop: '-12px', zIndex: 1 }}>
                                                        {Array.from(new Set(msg.reactions.map((r: any) => r.emoji))).map((emoji: any) => {
                                                            const count = msg.reactions.filter((r: any) => r.emoji === emoji).length;
                                                            const iReacted = msg.reactions.some((r: any) => r.emoji === emoji && r.userId === currentUser.id);
                                                            return (
                                                                <div key={emoji} onClick={() => handleToggleReaction(msg.id, emoji)} style={{ display: 'flex', alignItems: 'center', gap: '2px', backgroundColor: iReacted ? '#bfdbfe' : 'white', border: `1px solid ${iReacted ? '#60a5fa' : '#e2e8f0'}`, borderRadius: '12px', padding: '0px 6px', fontSize: '11px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                                                                    <span>{emoji}</span>
                                                                    {count > 1 && <span style={{ color: '#475569', fontWeight: 600, marginLeft: '2px' }}>{count}</span>}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '10px', color: '#cbd5e1', marginTop: msg.reactions?.length ? '2px' : '4px', marginRight: isMine ? '4px' : '0', marginLeft: isMine ? '0' : '4px' }}>
                                                    {msgDate.toDateString() !== new Date().toDateString()
                                                        ? `${msgDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${msgDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
                                                        : msgDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{ padding: '16px', borderTop: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                            {attachment && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#f1f5f9', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>
                                    <Paperclip size={16} color="#64748b" />
                                    <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#334155' }}>
                                        {attachment.name}
                                    </span>
                                    <button type="button" onClick={() => setAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            {replyingTo && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', backgroundColor: '#f1f5f9', borderLeft: '3px solid #3b82f6', borderRadius: '4px 8px 8px 4px', marginBottom: '12px', fontSize: '13px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: '#3b82f6', fontWeight: 600, fontSize: '11px', marginBottom: '2px' }}>Đang trả lời {replyingTo.sender?.name}</div>
                                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: '#475569', maxWidth: '300px' }}>{replyingTo.content || '[Hình ảnh đính kèm]'}</div>
                                    </div>
                                    <button type="button" onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                                        <X size={16} />
                                    </button>
                                </div>
                            )}
                            <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <input
                                    type="file"
                                    id="chat-upload-img"
                                    accept="image/*"
                                    hidden
                                    onChange={e => {
                                        if (e.target.files?.[0]) setAttachment(e.target.files[0]);
                                        e.target.value = '';
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => document.getElementById('chat-upload-img')?.click()}
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '50%',
                                        backgroundColor: 'white',
                                        color: '#64748b',
                                        border: '1px solid #cbd5e1',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        flexShrink: 0
                                    }}
                                    className="hover:bg-slate-50"
                                >
                                    <Paperclip size={20} />
                                </button>
                                <textarea
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    onPaste={handlePaste}
                                    placeholder="Nhập tin nhắn..."
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: '24px',
                                        border: '1px solid #cbd5e1',
                                        backgroundColor: '#f8fafc',
                                        fontSize: '15px',
                                        resize: 'none',
                                        outline: 'none',
                                        fontFamily: 'inherit',
                                        height: '46px',
                                        lineHeight: '20px'
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSend(e);
                                        }
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={(!newMessage.trim() && !attachment) || isSending}
                                    style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '50%',
                                        backgroundColor: (!newMessage.trim() && !attachment) || isSending ? '#94a3b8' : '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: (!newMessage.trim() && !attachment) || isSending ? 'not-allowed' : 'pointer',
                                        flexShrink: 0
                                    }}
                                >
                                    <Send size={20} style={{ marginLeft: '2px' }} />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>

            {/* Zoomed Image Modal */}
            {zoomedImage && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'zoom-out',
                        padding: '24px'
                    }}
                    onClick={() => setZoomedImage(null)}
                >
                    <button
                        style={{ position: 'absolute', top: '24px', right: '24px', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={zoomedImage}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px' }}
                        alt="Zoomed attachment"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
                    />
                </div>
            )}
        </div>
    );
}

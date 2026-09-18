'use client'

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { getUnreadCount } from '@/app/chat/actions';
import { createPortal } from 'react-dom';
import ChatWindow from './ChatWindow';

export default function ChatWidget({ currentUser }: { currentUser: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [targetChatUserId, setTargetChatUserId] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevUnreadCountRef = React.useRef(-1);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        const handleOpenChatAction = (e: any) => {
            const userId = e.detail?.userId;
            if (userId) setTargetChatUserId(userId);
            setIsOpen(true);
        };
        window.addEventListener('open-chat', handleOpenChatAction);
        return () => window.removeEventListener('open-chat', handleOpenChatAction);
    }, []);

    const fetchUnread = async () => {
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);

            // Check for new incoming messages
            if (count > prevUnreadCountRef.current && prevUnreadCountRef.current !== -1) {
                triggerNewMessageAlert();
            }
            prevUnreadCountRef.current = count;
        } catch (e) {
            console.error('Failed to fetch unread count', e);
        }
    };

    const triggerNewMessageAlert = () => {
        // 1. Show Toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);

        // 2. Play Audio chime
        playAudioChime();

        // 3. Desktop Notification
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Tin nhắn mới', {
                body: 'Bạn có tin nhắn chưa đọc trong hệ thống ERP.',
                icon: '/icons/icon-192x192.png'
            });
        }
    };

    const playAudioChime = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1100, audioCtx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.error('Lỗi phát âm thanh', e);
        }
    };

    useEffect(() => {
        getUnreadCount().then(c => {
            setUnreadCount(c);
            prevUnreadCountRef.current = c;
        });

        const interval = setInterval(fetchUnread, 12000);
        return () => clearInterval(interval);
    }, []);

    const toggleWindow = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            setUnreadCount(0);
            prevUnreadCountRef.current = 0;

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
            try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }
            } catch (e) { }
        }
    };

    return (
        <div className="relative">
            <button
                onClick={toggleWindow}
                className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                    isOpen
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                        : 'text-slate-600 hover:text-blue-600 hover:bg-slate-100 bg-transparent'
                }`}
                title="Trò chuyện nội bộ"
            >
                <MessageCircle size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white shadow-xs animate-bounce">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Toast Notification */}
            {showToast && typeof window !== 'undefined' && createPortal(
                <div
                    onClick={() => { setShowToast(false); setIsOpen(true); }}
                    className="fixed bottom-20 right-6 bg-white/95 backdrop-blur-md px-4 py-3 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-3 z-[999999] cursor-pointer hover:scale-102 transition-all animate-bounce"
                >
                    <div
                        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
                        className="w-9 h-9 rounded-xl text-white flex items-center justify-center shadow-xs"
                    >
                        <MessageCircle size={18} />
                    </div>
                    <div>
                        <div className="font-bold text-xs text-slate-900">Tin nhắn mới</div>
                        <div className="text-[11px] text-slate-500">Bạn có tin nhắn chưa đọc trong hệ thống.</div>
                    </div>
                </div>,
                document.body
            )}

            {isOpen && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[99999] flex flex-col sm:block overflow-hidden bg-white sm:bg-transparent">
                    <ChatWindow
                        currentUser={currentUser}
                        onClose={() => { setIsOpen(false); setTargetChatUserId(null); }}
                        initialTargetUserId={targetChatUserId}
                    />
                </div>,
                document.body
            )}
        </div>
    );
}

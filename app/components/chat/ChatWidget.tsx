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

            // Kiểm tra có tin nhắn mới không
            if (count > prevUnreadCountRef.current && prevUnreadCountRef.current !== -1) {
                // Có tin nhắn mới tăng lên!
                triggerNewMessageAlert();
            }
            prevUnreadCountRef.current = count;
        } catch (e) {
            console.error('Failed to fetch unread count', e);
        }
    };

    const triggerNewMessageAlert = () => {
        // 1. Hiện Toast
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);

        // 2. Phát Âm Thanh (Ding!)
        playAudioChime();

        // 3. Desktop Notification (Nếu được cho phép)
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Tin nhắn mới', {
                body: 'Bạn có tin nhắn chưa đọc trong hệ thống ERP.',
                icon: '/icons/icon-192x192.png'
            });
        }
    };

    const playAudioChime = () => {
        try {
            // Sử dụng Web Audio API để tạo ra một tiếng 'Ding' đơn giản 
            // tranh việc phải dùng file âm thanh rời phức tạp
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // Note G5
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
        // Fetch ngay lần đầu để set prevUnreadCountRef (tránh báo tiếng ding khi mới vào trang)
        getUnreadCount().then(c => {
            setUnreadCount(c);
            prevUnreadCountRef.current = c;
        });

        const interval = setInterval(fetchUnread, 15000); // Poll every 15s for new unread status
        return () => clearInterval(interval);
    }, []);

    const toggleWindow = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // When opening window, optimistically clear unread count since they'll read it
            setUnreadCount(0);
            prevUnreadCountRef.current = 0;

            // browser policy requires user interaction before granting permission or audio
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
        <div style={{ position: 'relative' }}>
            <button
                onClick={toggleWindow}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: isOpen ? '#eef2ff' : 'transparent',
                    color: isOpen ? '#4f46e5' : '#64748b',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                }}
                className={`hover:bg-slate-100 ${isOpen ? 'bg-indigo-50 text-indigo-600' : ''}`}
            >
                <MessageCircle size={22} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        minWidth: '18px',
                        height: '18px',
                        padding: '0 4px',
                        borderRadius: '9px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white'
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Toast Notification */}
            {showToast && typeof window !== 'undefined' && createPortal(
                <div style={{
                    position: 'fixed',
                    bottom: '80px',
                    right: '24px',
                    width: 'max-content',
                    backgroundColor: 'white',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'slide-up-fade 0.3s ease-out forwards',
                    zIndex: 999999
                }}>
                    <style>{`
                        @keyframes slide-up-fade {
                            0% { opacity: 0; transform: translateY(10px); }
                            100% { opacity: 1; transform: translateY(0); }
                        }
                    `}</style>
                    <div style={{ backgroundColor: '#eff6ff', padding: '8px', borderRadius: '50%', color: '#3b82f6' }}>
                        <MessageCircle size={18} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>Tin nhắn mới</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Bạn có tin nhắn chưa đọc!</div>
                    </div>
                </div>,
                document.body
            )}

            {isOpen && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[99999] flex flex-col sm:block overflow-hidden bg-white sm:bg-transparent">
                    <ChatWindow currentUser={currentUser} onClose={() => { setIsOpen(false); setTargetChatUserId(null); }} initialTargetUserId={targetChatUserId} />
                </div>,
                document.body
            )}
        </div>
    );
}

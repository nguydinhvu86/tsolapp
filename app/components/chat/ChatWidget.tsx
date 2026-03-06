'use client'

import React, { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { getUnreadCount } from '@/app/chat/actions';
import ChatWindow from './ChatWindow';

export default function ChatWidget({ currentUser }: { currentUser: any }) {
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchUnread = async () => {
        try {
            const count = await getUnreadCount();
            setUnreadCount(count);
        } catch (e) {
            console.error('Failed to fetch unread count', e);
        }
    };

    useEffect(() => {
        fetchUnread();
        const interval = setInterval(fetchUnread, 15000); // Poll every 15s for new unread status
        return () => clearInterval(interval);
    }, []);

    const toggleWindow = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // When opening window, optimistically clear unread count since they'll read it
            setUnreadCount(0);
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

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 10px)',
                    right: 0, // Align right with the button
                    zIndex: 9999
                }}>
                    <ChatWindow currentUser={currentUser} onClose={() => setIsOpen(false)} />
                </div>
            )}
        </div>
    );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { getUnreadNotifications, markAsRead, markAllAsRead } from '@/app/notifications/actions';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function NotificationBell() {
    const { data: session } = useSession();
    const router = useRouter();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        if (!session?.user?.id) return;
        const data = await getUnreadNotifications(session.user.id);
        setNotifications(data);
    };

    useEffect(() => {
        if (!session?.user?.id) return;
        fetchNotifications();

        // Polling every 30 seconds
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [session?.user?.id]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notif: any) => {
        await markAsRead(notif.id);
        setNotifications(prev => prev.filter(n => n.id !== notif.id));
        setIsOpen(false);
        if (notif.link) {
            router.push(notif.link);
        }
    };

    const handleMarkAllRead = async () => {
        if (!session?.user?.id) return;
        await markAllAsRead(session.user.id);
        setNotifications([]);
        setIsOpen(false);
    };

    if (!session?.user?.id) return null;

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <style jsx>{`
                @keyframes pulse {
                    0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                    70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
                    100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }
                @keyframes ring {
                    0% { transform: rotate(0); }
                    10% { transform: rotate(15deg); }
                    20% { transform: rotate(-10deg); }
                    30% { transform: rotate(10deg); }
                    40% { transform: rotate(-10deg); }
                    50% { transform: rotate(5deg); }
                    60% { transform: rotate(-5deg); }
                    70% { transform: rotate(0); }
                    100% { transform: rotate(0); }
                }
                .bell-ring {
                    animation: ring 2s ease-in-out infinite;
                }
                .dot-pulse {
                    animation: pulse 2s infinite;
                }
            `}</style>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '40px', height: '40px', borderRadius: '50%',
                    position: 'relative',
                    transition: 'background 0.2s',
                    color: 'var(--text-main)'
                }}
                className="hover:bg-slate-100"
            >
                <div className={notifications.length > 0 ? "bell-ring" : ""}>
                    <Bell size={20} />
                </div>
                {notifications.length > 0 && (
                    <div className="dot-pulse" style={{
                        position: 'absolute', top: '6px', right: '8px',
                        width: '10px', height: '10px', borderRadius: '50%',
                        backgroundColor: 'var(--danger)', border: '2px solid white'
                    }} />
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                    width: '320px', backgroundColor: 'var(--surface)',
                    borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border)', zIndex: 50,
                    overflow: 'hidden'
                }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc' }}>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Thông báo</h4>
                        {notifications.length > 0 && (
                            <button onClick={handleMarkAllRead} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={14} /> Đọc tất cả
                            </button>
                        )}
                    </div>

                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Không có thông báo mới.
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n)}
                                    style={{ padding: '1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.2s' }}
                                    className="hover:bg-slate-50"
                                >
                                    <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem', lineHeight: 1.4, color: 'var(--text-main)' }}>
                                        {n.message}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: vi })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

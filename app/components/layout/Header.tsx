'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { NotificationBell } from '../ui/NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import ChatWidget from '../chat/ChatWidget';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const { data: session } = useSession();

    return (
        <header
            className="app-header"
            style={{
                height: '64px',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 2rem',
                position: 'sticky',
                top: 0,
                zIndex: 50
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '600px' }}>
                {onMenuToggle && (
                    <button
                        onClick={onMenuToggle}
                        className="show-on-mobile"
                        style={{ padding: '0.5rem', borderRadius: 'var(--radius)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        aria-label="Open menu"
                    >
                        <Menu size={20} />
                    </button>
                )}

                <GlobalSearch />

                {/* Mobile search placeholder if GlobalSearch hides on mobile */}
                <div style={{ marginLeft: '0.25rem', display: 'flex', flexDirection: 'column' }} className="hide-on-desktop">
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mừng trở lại,</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.2 }}>{session?.user?.name || 'Administrator'}</span>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {session?.user && <ChatWidget currentUser={session.user} />}
                <NotificationBell />
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }} className="hover:bg-slate-100">
                    {session?.user?.avatar ? (
                        <img src={session.user.avatar} alt="Avatar" style={{
                            width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover',
                            border: '1px solid rgba(79, 70, 229, 0.2)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }} />
                    ) : (
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: '700', fontSize: '1rem',
                            border: '1px solid rgba(79, 70, 229, 0.2)',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}>
                            {session?.user?.name ? session.user.name[0].toUpperCase() : "U"}
                        </div>
                    )}
                </Link>

                <div
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    style={{
                        cursor: 'pointer',
                        color: 'var(--danger)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#fee2e2'
                    }}
                    title="Đăng xuất"
                >
                    <LogOut size={18} />
                </div>
            </div>
        </header >
    );
}

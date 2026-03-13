'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { NotificationBell } from '../ui/NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import { HeaderAttendance } from '../hr/HeaderAttendance';
import ChatWidget from '../chat/ChatWidget';
import { AvatarImage } from '../ui/AvatarImage';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const { data: session } = useSession();

    return (
        <header
            className="app-header sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between border-b border-slate-200"
            style={{
                height: '64px',
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}
        >
            <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-[600px]">
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

                {/* Greeting on mobile */}
                <div className="hidden sm:flex md:hidden flex-col ml-1">
                    <span className="text-xs text-slate-500">Mừng trở lại,</span>
                    <span className="text-sm font-semibold text-slate-800 leading-tight">{session?.user?.name || 'Administrator'}</span>
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-3">
                {session?.user && <ChatWidget currentUser={session.user} />}
                <HeaderAttendance />
                <NotificationBell />
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s' }} className="hover:bg-slate-100">
                    <AvatarImage
                        src={session?.user?.avatar}
                        name={session?.user?.name}
                        size={40}
                        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                        fallbackStyle={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    />
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

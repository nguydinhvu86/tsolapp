'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { NotificationBell } from '../ui/NotificationBell';
import { GlobalSearch } from './GlobalSearch';
import { QuickCreateMenu } from './QuickCreateMenu';
import { HeaderAttendance } from '../hr/HeaderAttendance';
import ChatWidget from '../chat/ChatWidget';
import { AvatarImage } from '../ui/AvatarImage';
import { PushPermissionToggle } from '../ui/PushPermissionToggle';
import LanguageSwitcher from '../LanguageSwitcher';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
    const { data: session } = useSession();

    return (
        <header
            className="app-header sticky top-0 z-50 px-3 sm:px-4 md:px-8 flex items-center justify-between border-b border-slate-200"
            style={{
                height: '64px',
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}
        >
            {/* Left section */}
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 flex-1 max-w-[600px] min-w-0">
                {onMenuToggle && (
                    <button
                        onClick={onMenuToggle}
                        className="show-on-mobile shrink-0"
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        aria-label="Open menu"
                    >
                        <Menu size={20} />
                    </button>
                )}

                <div className="flex items-center gap-1 sm:gap-2 flex-grow max-w-[500px] min-w-0">
                    <GlobalSearch />
                    <QuickCreateMenu />
                </div>

                {/* Greeting on large screens */}
                <div className="hidden lg:flex flex-col ml-1 shrink-0">
                    <span className="text-xs text-slate-500">Mừng trở lại,</span>
                    <span className="text-sm font-semibold text-slate-800 leading-tight">{session?.user?.name || 'Administrator'}</span>
                </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-2.5 shrink-0">
                {session?.user && (
                    <div className="hidden sm:flex">
                        <ChatWidget currentUser={session.user} />
                    </div>
                )}
                <div className="hidden md:flex">
                    <LanguageSwitcher />
                </div>
                <HeaderAttendance />
                <div className="hidden sm:flex">
                    <PushPermissionToggle />
                </div>
                <NotificationBell />
                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', cursor: 'pointer', padding: '0.2rem', borderRadius: '8px', transition: 'background 0.2s' }} className="hover:bg-slate-100 shrink-0">
                    <AvatarImage
                        src={session?.user?.avatar}
                        name={session?.user?.name}
                        size={34}
                        style={{ boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                        fallbackStyle={{ backgroundColor: 'rgba(79, 70, 229, 0.1)', color: 'var(--primary)', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
                    />
                </Link>

                <div
                    onClick={async () => {
                        try {
                            const { logUserLogout } = await import('@/app/actions/auth');
                            await logUserLogout();
                        } catch(e) { console.error('Logout error', e) }
                        signOut({ callbackUrl: '/login' });
                    }}
                    className="hidden md:flex"
                    style={{
                        cursor: 'pointer',
                        color: 'var(--danger)',
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
        </header>
    );
}

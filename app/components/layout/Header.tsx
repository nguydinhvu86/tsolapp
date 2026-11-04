'use client';

import React from 'react';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { confirmModal } from '../providers/ConfirmProvider';
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
            className="app-header sticky top-0 z-50 px-3.5 sm:px-5 lg:px-6 flex items-center justify-between border-b border-slate-200/90"
            style={{
                height: '52px',
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
            }}
        >
            {/* Left section */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 max-w-[600px] min-w-0">
                {onMenuToggle && (
                    <button
                        onClick={onMenuToggle}
                        className="show-on-mobile shrink-0"
                        style={{ padding: '0.4rem', borderRadius: 'var(--radius)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        aria-label="Open menu"
                    >
                        <Menu size={19} />
                    </button>
                )}

                <div className="flex items-center gap-1.5 sm:gap-2 flex-grow max-w-[480px] min-w-0">
                    <GlobalSearch />
                    <QuickCreateMenu />
                </div>

                {/* Greeting on large screens */}
                <div className="hidden xl:flex flex-col ml-2 pl-3 border-l border-slate-200/80 shrink-0">
                    <span className="text-[10.5px] font-medium text-slate-400">Xin chào,</span>
                    <span className="text-[12px] font-semibold text-slate-800 leading-tight truncate max-w-[140px]">{session?.user?.name || 'Administrator'}</span>
                </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
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

                <div className="hidden sm:block w-[1px] h-4 bg-slate-200 mx-1"></div>

                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', cursor: 'pointer', padding: '0.15rem', borderRadius: '8px', transition: 'background 0.2s' }} className="hover:bg-slate-100 shrink-0" title="Hồ sơ cá nhân">
                    <AvatarImage
                        src={session?.user?.avatar}
                        name={session?.user?.name}
                        size={30}
                        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
                        fallbackStyle={{ backgroundColor: 'rgba(5, 150, 105, 0.1)', color: 'var(--primary)', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
                    />
                </Link>

                <button
                    type="button"
                    onClick={async () => {
                        const confirmed = await confirmModal({
                            title: 'Xác nhận đăng xuất',
                            message: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống T-SOLUTION không?',
                            confirmText: 'Đăng xuất',
                            cancelText: 'Ở lại',
                            variant: 'danger'
                        });
                        if (!confirmed) return;

                        try {
                            const { logUserLogout } = await import('@/app/actions/auth');
                            await logUserLogout();
                        } catch(e) { console.error('Logout error', e) }
                        signOut({ callbackUrl: '/login' });
                    }}
                    className="hidden md:flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer"
                    title="Đăng xuất"
                    aria-label="Đăng xuất"
                >
                    <LogOut size={15} />
                </button>
            </div>
        </header>
    );
}

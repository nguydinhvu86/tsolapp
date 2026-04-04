'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ children, brandName, logoUrl, initialSidebarOrder }: { children: React.ReactNode, brandName: string, logoUrl?: string | null, initialSidebarOrder?: string[] }) {
    const pathname = usePathname();
    const isAuthPage = ['/login', '/forgot-password', '/reset-password'].includes(pathname || '');
    const isClientPortal = pathname?.startsWith('/portal') || pathname?.startsWith('/public');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (isAuthPage || isClientPortal) {
        return <>{children}</>;
    }

    return (
        <>
            {/* Sidebar acts as off-canvas on mobile, fixed left on desktop */}
            <Sidebar
                brandName={brandName}
                logoUrl={logoUrl}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                initialSidebarOrder={initialSidebarOrder}
            />

            {/* Main content wrapper pushes right on desktop, takes full width on mobile */}
            <div className="main-wrapper">
                <Header onMenuToggle={() => setIsMobileMenuOpen(true)} />
                <main className="p-4 md:p-8 flex-1 min-w-0" style={{ overflowX: 'hidden' }}>
                    {children}
                </main>
            </div>

            {/* Overlay for mobile when sidebar is open */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40
                    }}
                    className="hide-on-desktop show-on-mobile"
                />
            )}
        </>
    );
}

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout({ children, brandName }: { children: React.ReactNode, brandName: string }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login';

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <>
            <Sidebar brandName={brandName} />
            <div className="main-wrapper" style={{ flex: 1, marginLeft: '260px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Header />
                <main style={{ padding: '2rem', flex: 1, minWidth: 0, overflowX: 'hidden' }}>
                    {children}
                </main>
            </div>
        </>
    );
}

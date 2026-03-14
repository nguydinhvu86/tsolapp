import type { Metadata, Viewport } from 'next'
import './globals.css'

import { NextAuthProvider } from './components/providers/NextAuthProvider'
import { MainLayout } from './components/layout/MainLayout'
import { getLayoutSettings, getSidebarOrder } from './components/layout/actions'
import { PushNotificationListener } from './components/PushNotificationListener'

export async function generateMetadata(): Promise<Metadata> {
    const { name: brandName, logo: logoUrl } = await getLayoutSettings();
    return {
        title: 'ERP - Run Your Business',
        description: 'Manage Your Business Easily And Efficiently',
        manifest: '/manifest.json',
        icons: {
            icon: logoUrl || '/icons/icon-192x192.png',
            apple: logoUrl || '/icons/icon-192x192.png',
        },
        appleWebApp: {
            capable: true,
            statusBarStyle: 'default',
            title: brandName || 'ERP - Run Your Business',
        },
    };
}

export const viewport: Viewport = {
    themeColor: '#4f46e5',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { name: brandName, logo: logoUrl } = await getLayoutSettings();
    const initialSidebarOrder = await getSidebarOrder();

    return (
        <html lang="en">
            <body style={{ minHeight: '100vh', backgroundColor: 'var(--background)', margin: 0 }}>
                <NextAuthProvider>
                    <PushNotificationListener />
                    <MainLayout brandName={brandName} logoUrl={logoUrl} initialSidebarOrder={initialSidebarOrder}>
                        {children}
                    </MainLayout>
                </NextAuthProvider>
            </body>
        </html>
    )
}

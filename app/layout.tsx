import type { Metadata, Viewport } from 'next'
import './globals.css'

import { NextAuthProvider } from './components/providers/NextAuthProvider'
import { MainLayout } from './components/layout/MainLayout'
import { getLayoutSettings, getSidebarOrder } from './components/layout/actions'
import { PushNotificationListener } from './components/PushNotificationListener'

export const metadata: Metadata = {
    title: 'ERP System',
    description: 'Manage and generate contracts easily',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'ERP System',
    },
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

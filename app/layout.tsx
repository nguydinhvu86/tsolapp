import type { Metadata, Viewport } from 'next'
import './globals.css'

import { NextAuthProvider } from './components/providers/NextAuthProvider'
import { MainLayout } from './components/layout/MainLayout'
import { getLayoutSettings, getSidebarOrder } from './components/layout/actions'
import { PushNotificationListener } from './components/PushNotificationListener'
import { CallListener } from './components/CallListener'
import { WebRTCDialer } from './components/Softphone/WebRTCDialer'
import { LanguageProvider } from './i18n/LanguageContext'
import { getDictionary, getCurrentLocale } from './i18n/getDictionary'

export async function generateMetadata(): Promise<Metadata> {
    const { name: brandName, logo: logoUrl } = await getLayoutSettings();
    const title = 'ERP - Run Your Business';
    const description = 'Manage Your Business Easily And Efficiently';
    const finalLogo = logoUrl || '/icons/icon-192x192.png';

    return {
        title,
        description,
        manifest: '/manifest.json',
        metadataBase: new URL('https://inside.tsol.vn'),
        icons: {
            icon: finalLogo,
            apple: finalLogo,
        },
        openGraph: {
            title: brandName || title,
            description,
            url: 'https://inside.tsol.vn',
            siteName: brandName || title,
            images: [
                {
                    url: 'https://inside.tsol.vn/og-image.png',
                    width: 1200,
                    height: 630,
                },
            ],
            locale: 'vi_VN',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: brandName || title,
            description,
            images: ['https://inside.tsol.vn/og-image.png'],
        },
        appleWebApp: {
            statusBarStyle: 'default',
            title: brandName || title,
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
    const dictionary = await getDictionary();
    const locale = getCurrentLocale();

    return (
        <html lang={locale}>
            <head>
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body style={{ minHeight: '100vh', backgroundColor: 'var(--background)', margin: 0 }}>
                <NextAuthProvider>
                    <LanguageProvider dictionary={dictionary} locale={locale}>
                        <PushNotificationListener />
                        <CallListener />
                        <WebRTCDialer />
                        <MainLayout brandName={brandName} logoUrl={logoUrl} initialSidebarOrder={initialSidebarOrder}>
                            {children}
                        </MainLayout>
                    </LanguageProvider>
                </NextAuthProvider>
            </body>
        </html>
    )
}

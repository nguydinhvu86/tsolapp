import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
    subsets: ['latin', 'vietnamese'],
    display: 'swap',
    variable: '--font-sans',
})

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
    const siteTitle = brandName || 'T-SOLUTION';
    const description = 'Manage Your Business Easily And Efficiently - Nền tảng quản trị và cộng tác doanh nghiệp toàn diện';
    const finalLogo = logoUrl || '/icons/icon-192x192.png';

    return {
        title: {
            default: siteTitle,
            template: `%s | ${siteTitle}`,
        },
        description,
        manifest: '/manifest.json',
        metadataBase: new URL('https://inside.tsol.vn'),
        icons: {
            icon: finalLogo,
            apple: finalLogo,
        },
        openGraph: {
            title: siteTitle,
            description,
            url: 'https://inside.tsol.vn',
            siteName: siteTitle,
            images: [
                {
                    url: 'https://inside.tsol.vn/og-image.jpg',
                    secureUrl: 'https://inside.tsol.vn/og-image.jpg',
                    width: 1200,
                    height: 630,
                    type: 'image/jpeg',
                    alt: `${siteTitle} - Powering Growth & Collaboration`,
                },
            ],
            locale: 'vi_VN',
            type: 'website',
        },
        twitter: {
            card: 'summary_large_image',
            title: siteTitle,
            description,
            images: ['https://inside.tsol.vn/og-image.jpg'],
        },
        appleWebApp: {
            statusBarStyle: 'default',
            title: siteTitle,
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
            <body className={inter.className} style={{ minHeight: '100vh', backgroundColor: 'var(--background)', margin: 0 }}>
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

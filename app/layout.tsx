import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
    subsets: ['latin', 'vietnamese'],
    display: 'swap',
    variable: '--font-sans',
})

import { NextAuthProvider } from './components/providers/NextAuthProvider'
import { ToastProvider } from './components/providers/ToastProvider'
import { ConfirmProvider } from './components/providers/ConfirmProvider'
import { MainLayout } from './components/layout/MainLayout'
import { getLayoutSettings, getSidebarOrder } from './components/layout/actions'
import { PushNotificationListener } from './components/PushNotificationListener'
import { CallListener } from './components/CallListener'
import { WebRTCDialer } from './components/Softphone/WebRTCDialer'
import { LanguageProvider } from './i18n/LanguageContext'
import { getDictionary, getCurrentLocale } from './i18n/getDictionary'

export async function generateMetadata(): Promise<Metadata> {
    const { name: brandName, logo: logoUrl } = await getLayoutSettings();
    const siteTitle = brandName || 'INCALL VIỆT NAM';
    const description = 'Manage Your Business Easily And Efficiently - Nền tảng quản trị và cộng tác doanh nghiệp toàn diện';
    const finalLogo = logoUrl || '/icons/icon-192x192.png';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://erp.incall.vn';

    return {
        title: {
            default: siteTitle,
            template: `%s | ${siteTitle}`,
        },
        description,
        manifest: '/manifest.json',
        metadataBase: new URL(appUrl),
        icons: {
            icon: finalLogo,
            apple: finalLogo,
        },
        openGraph: {
            title: siteTitle,
            description,
            url: appUrl,
            siteName: siteTitle,
            images: [
                {
                    url: `${appUrl}/og-image.jpg`,
                    secureUrl: `${appUrl}/og-image.jpg`,
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
            images: [`${appUrl}/og-image.jpg`],
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
        <html lang={locale} className={inter.variable}>
            <head>
                <meta name="mobile-web-app-capable" content="yes" />
            </head>
            <body className={`${inter.className} ${inter.variable}`} style={{ minHeight: '100vh', backgroundColor: 'var(--background)', margin: 0 }}>
                <NextAuthProvider>
                    <LanguageProvider dictionary={dictionary} locale={locale}>
                        <ToastProvider>
                            <ConfirmProvider>
                                <PushNotificationListener />
                                <CallListener />
                                <WebRTCDialer />
                                <MainLayout brandName={brandName} logoUrl={logoUrl} initialSidebarOrder={initialSidebarOrder}>
                                    {children}
                                </MainLayout>
                            </ConfirmProvider>
                        </ToastProvider>
                    </LanguageProvider>
                </NextAuthProvider>
            </body>
        </html>
    )
}

import type { Metadata } from 'next'
import './globals.css'
import 'suneditor/dist/css/suneditor.min.css';
import { NextAuthProvider } from './components/providers/NextAuthProvider'
import { MainLayout } from './components/layout/MainLayout'
import { getBrandName } from './components/layout/actions'

export const metadata: Metadata = {
    title: 'Contract Management',
    description: 'Manage and generate contracts easily',
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const brandName = await getBrandName();

    return (
        <html lang="en">
            <body style={{ minHeight: '100vh', backgroundColor: 'var(--background)', margin: 0 }}>
                <NextAuthProvider>
                    <MainLayout brandName={brandName}>
                        {children}
                    </MainLayout>
                </NextAuthProvider>
            </body>
        </html>
    )
}

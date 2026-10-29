import { Box, Phone, Mail, Globe, Sparkles, User, Share2 } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import PublicEcatalogClient from './PublicEcatalogClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
    const ecatalog = await prisma.ecatalog.findFirst({
        where: {
            OR: [
                { id: params.id },
                { code: params.id }
            ]
        },
        select: { name: true, description: true }
    });

    return {
        title: ecatalog?.name ? `${ecatalog.name} | E-Catalog Trực Tuyến` : 'Product E-Catalog',
        description: ecatalog?.description || 'Bản xem trước E-Catalog sản phẩm trực tuyến công nghệ cao',
    };
}

export default async function PublicEcatalogPage({ params }: { params: { id: string } }) {
    const ecatalog = await prisma.ecatalog.findFirst({
        where: {
            OR: [
                { id: params.id },
                { code: params.id }
            ]
        },
        include: {
            creator: {
                select: { name: true, email: true, avatar: true }
            },
            items: {
                orderBy: { displayOrder: 'asc' },
                include: {
                    product: true
                }
            }
        }
    });

    if (!ecatalog || !ecatalog.isPublic) {
        notFound();
    }

    const companyConfig = await prisma.systemSetting.findMany({
        where: { key: { in: ['COMPANY_NAME', 'COMPANY_DISPLAY_NAME', 'COMPANY_FULL_NAME', 'COMPANY_LOGO', 'COMPANY_EMAIL', 'COMPANY_PHONE', 'COMPANY_WEBSITE'] } }
    });

    const getSetting = (key: string) => companyConfig.find(c => c.key === key)?.value || '';

    const companyName = getSetting('COMPANY_DISPLAY_NAME') || getSetting('COMPANY_NAME') || 'ContractMgr Enterprise';
    const companyFullName = getSetting('COMPANY_FULL_NAME') || getSetting('COMPANY_NAME') || 'ContractMgr Enterprise';
    const companyLogo = getSetting('COMPANY_LOGO');
    const companyEmail = getSetting('COMPANY_EMAIL');
    const companyPhone = getSetting('COMPANY_PHONE');
    const companyWebsite = getSetting('COMPANY_WEBSITE');

    const companyInfo = {
        name: companyName,
        fullName: companyFullName,
        logo: companyLogo,
        email: companyEmail,
        phone: companyPhone,
        website: companyWebsite
    };

    return (
        <div 
            className="ecatalog-public-wrapper w-full min-w-full flex-1 min-h-screen bg-slate-950 font-sans text-slate-100 pb-20 selection:bg-emerald-500 selection:text-white overflow-x-hidden relative flex flex-col"
            style={{ width: '100%', minWidth: '100%', flex: '1 1 100%', backgroundColor: '#020617' }}
        >
            {/* Global reset override to ensure full screen width and avoid global white background */}
            <style dangerouslySetInnerHTML={{ __html: `
                html, body {
                    background-color: #020617 !important;
                    width: 100% !important;
                    min-width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    overflow-x: hidden !important;
                }
                .ecatalog-public-wrapper {
                    width: 100% !important;
                    min-width: 100% !important;
                    flex: 1 1 100% !important;
                    background-color: #020617 !important;
                }
                .ecatalog-public-wrapper h1,
                .ecatalog-public-wrapper h2,
                .ecatalog-public-wrapper h3,
                .ecatalog-public-wrapper h4,
                .ecatalog-public-wrapper h5,
                .ecatalog-public-wrapper h6 {
                    color: #ffffff;
                }
                .ecatalog-public-wrapper button {
                    background-color: transparent;
                }
            ` }} />

            {/* Ambient Background Tech Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[140px]" />
                <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-[140px]" />
                {/* Tech Grid Pattern */}
                <div 
                    className="absolute inset-0 opacity-[0.03]" 
                    style={{ 
                        backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`, 
                        backgroundSize: '32px 32px' 
                    }} 
                />
            </div>

            {/* Top Enterprise Header */}
            <header className="w-full relative z-40 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 shadow-xl shadow-black/20">
                <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-center justify-between py-3.5 gap-3">
                        {/* Brand Logo & Name */}
                        <div className="flex items-center gap-3.5">
                            {companyLogo ? (
                                <img src={companyLogo} alt={companyName} className="h-10 w-auto object-contain drop-shadow" />
                            ) : (
                                <div className="h-10 w-10 bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-400 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-lg shadow-emerald-500/20">
                                    {companyName.charAt(0)}
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <h1 className="text-base font-extrabold text-white tracking-tight leading-none" style={{ color: '#ffffff' }}>{companyName}</h1>
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                        E-CATALOG v2.4
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-300 font-medium mt-0.5">Digital Interactive Product Experience</p>
                            </div>
                        </div>

                        {/* Direct Contacts & Consultant Quick Actions */}
                        <div className="flex items-center gap-2 sm:gap-3 text-xs font-semibold">
                            {companyPhone && (
                                <a 
                                    href={`tel:${companyPhone.replace(/\s+/g, '')}`}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all shadow-sm"
                                    style={{ color: '#e2e8f0' }}
                                >
                                    <Phone size={13} className="text-emerald-400" />
                                    <span className="hidden sm:inline">{companyPhone}</span>
                                    <span className="sm:hidden">Hotline</span>
                                </a>
                            )}
                            {companyEmail && (
                                <a 
                                    href={`mailto:${companyEmail}`}
                                    className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all shadow-sm"
                                    style={{ color: '#e2e8f0' }}
                                >
                                    <Mail size={13} className="text-teal-400" />
                                    <span>{companyEmail}</span>
                                </a>
                            )}
                            {companyWebsite && (
                                <a 
                                    href={companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-all shadow-sm"
                                    style={{ color: '#e2e8f0' }}
                                >
                                    <Globe size={13} className="text-cyan-400" />
                                    <span>Website</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* Interactive Catalog Workspace (Client Component) */}
            <main className="w-full flex-1 flex flex-col relative z-10">
                <PublicEcatalogClient 
                    ecatalog={ecatalog} 
                    companyInfo={companyInfo} 
                />
            </main>

            {/* Tech Footer */}
            <footer className="w-full mx-auto px-4 sm:px-6 lg:px-8 mt-16 border-t border-slate-800/80 pt-8 relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-medium">
                    <p>&copy; {new Date().getFullYear()} <span className="text-white font-bold">{companyFullName}</span>. Tất cả quyền được bảo lưu.</p>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <p className="text-slate-300">Hệ thống E-Catalog Trực Tuyến TsolApp 2.0</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

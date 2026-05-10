import { Box, CheckCircle, Phone, Mail, Globe, MapPin, Tag, ShieldCheck, User } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import PublicEcatalogClient from './PublicEcatalogClient';

export const metadata: Metadata = {
    title: 'Product E-Catalog',
    description: 'Bản xem trước E-Catalog sản phẩm trực tuyến',
};

export default async function PublicEcatalogPage({ params }: { params: { id: string } }) {
    const ecatalog = await prisma.ecatalog.findUnique({
        where: { id: params.id },
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
        where: { key: { in: ['COMPANY_NAME', 'COMPANY_LOGO', 'COMPANY_EMAIL', 'COMPANY_PHONE', 'COMPANY_WEBSITE'] } }
    });

    const getSetting = (key: string) => companyConfig.find(c => c.key === key)?.value || '';

    // If company name contains default or old names, you can handle it, but we rely on DB
    let companyName = getSetting('COMPANY_NAME') || 'ContractMgr Enterprise';
    if (companyName.toLowerCase().includes('trường thịnh')) {
        companyName = 'CÔNG TY TNHH CÔNG NGHỆ VÀ VIỄN THÔNG TSOL';
    }
    
    const companyLogo = getSetting('COMPANY_LOGO');
    const companyEmail = getSetting('COMPANY_EMAIL');
    const companyPhone = getSetting('COMPANY_PHONE');
    const companyWebsite = getSetting('COMPANY_WEBSITE');

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20 selection:bg-emerald-100 selection:text-emerald-900 overflow-x-hidden">
            {/* Top Navigation Bar */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12">
                    <div className="flex flex-col md:flex-row md:items-center justify-between py-4 gap-4">
                        {/* Logo & Company Name */}
                        <div className="flex items-center gap-4">
                            {companyLogo ? (
                                <img src={companyLogo} alt={companyName} className="h-12 w-auto object-contain drop-shadow-sm" />
                            ) : (
                                <div className="h-12 w-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
                                    {companyName.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h1 className="text-lg font-bold text-slate-800 leading-tight tracking-tight">{companyName}</h1>
                                <p className="text-xs font-medium text-emerald-600 tracking-wider uppercase">Official Partner</p>
                            </div>
                        </div>

                        {/* Contact Badges */}
                        <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs font-medium text-slate-600">
                            {companyPhone && (
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors">
                                    <Phone size={14} className="text-emerald-600" />
                                    <span>{companyPhone}</span>
                                </div>
                            )}
                            {companyEmail && (
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors">
                                    <Mail size={14} className="text-emerald-600" />
                                    <span>{companyEmail}</span>
                                </div>
                            )}
                            {companyWebsite && (
                                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 hover:bg-slate-100 transition-colors">
                                    <Globe size={14} className="text-emerald-600" />
                                    <span>{companyWebsite}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="relative bg-gradient-to-br from-emerald-900 via-teal-800 to-slate-900 overflow-hidden">
                {/* Decorative background shapes */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
                    <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-emerald-500 blur-3xl"></div>
                    <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-teal-400 blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                </div>

                <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 pt-16 pb-32 relative z-10">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-100 text-xs font-bold px-3 py-1.5 rounded-full mb-6 uppercase tracking-wider backdrop-blur-sm">
                            <Tag size={14} /> Product E-Catalog
                        </div>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight drop-shadow-md">
                            {ecatalog.name}
                        </h2>
                        <p className="text-lg text-emerald-50/80 mb-8 max-w-2xl leading-relaxed">
                            {ecatalog.description || 'Khám phá danh mục sản phẩm chính hãng với các thông tin chi tiết, xuất xứ rõ ràng và chính sách giá ưu đãi tốt nhất dành cho đối tác và khách hàng.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Floating Consultant Card */}
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 relative z-20 -mt-20 mb-8">
                <div className="flex flex-col lg:flex-row justify-between items-end gap-6">
                    {/* Consultant Card */}
                    <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 border border-slate-100 w-full lg:w-auto">
                        <div className="relative">
                            {ecatalog.creator.avatar ? (
                                <img src={ecatalog.creator.avatar} alt={ecatalog.creator.name || ''} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-emerald-50" />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-50 flex items-center justify-center text-emerald-600 font-bold text-xl border-2 border-white shadow-md ring-2 ring-emerald-50">
                                    {ecatalog.creator.name?.charAt(0) || 'U'}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-white"></div>
                        </div>
                        <div className="text-center sm:text-left">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1">
                                <User size={12} /> Phụ trách tư vấn
                            </p>
                            <h3 className="text-lg font-extrabold text-slate-800">{ecatalog.creator.name}</h3>
                            <p className="text-sm text-slate-500 mt-0.5">{ecatalog.creator.email}</p>
                            <button className="mt-3 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto shadow-sm">
                                Liên hệ ngay
                            </button>
                        </div>
                    </div>
                    {/* Consultant Card is now taking full focus here. The "Danh sách sản phẩm" badge is moved to the client component */}
                </div>
            </div>

            {/* Product Grid & Modals (Client Component) */}
            <PublicEcatalogClient ecatalog={ecatalog} />

            {/* Footer */}
            <footer className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 mt-8 border-t border-slate-200/60 pt-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500 font-medium">
                    <p>&copy; {new Date().getFullYear()} <span className="text-slate-800 font-bold">{companyName}</span>. All rights reserved.</p>
                    <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <p>Powered by ContractMgr E-Catalog System</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}

import { Box, CheckCircle, Phone, Mail, Globe, MapPin, Tag, ShieldCheck, User } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';

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
    const companyName = getSetting('COMPANY_NAME') || 'ContractMgr Enterprise';
    const companyLogo = getSetting('COMPANY_LOGO');
    const companyEmail = getSetting('COMPANY_EMAIL');
    const companyPhone = getSetting('COMPANY_PHONE');
    const companyWebsite = getSetting('COMPANY_WEBSITE');

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans pb-20 selection:bg-emerald-100 selection:text-emerald-900">
            {/* Top Navigation Bar */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-32 relative z-10">
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

            {/* Floating Consultant Card & Product Header */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-20 mb-8">
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

                    {/* Product Count Badge */}
                    <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-xl shadow-sm border border-slate-200 w-full lg:w-auto justify-center lg:justify-start">
                        <Box className="text-emerald-500" size={20} />
                        <span className="text-slate-700 font-semibold">Danh sách sản phẩm</span>
                        <div className="w-px h-5 bg-slate-200 mx-1"></div>
                        <span className="bg-slate-100 text-slate-600 text-sm font-bold px-3 py-1 rounded-md">{ecatalog.items.length} mục</span>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {ecatalog.items.map((item, index) => {
                        const name = item.customName || item.product?.name;
                        const desc = item.customDesc || item.product?.description;
                        const price = item.customPrice ?? item.product?.salePrice ?? 0;
                        const retailPrice = item.customRetailPrice ?? item.customPrice ?? item.product?.salePrice ?? 0;
                        const dealerPrice = item.customDealerPrice ?? 0;
                        const origin = item.customOrigin || '';
                        const note = item.customNote || '';
                        const image = item.imageUrl || item.product?.imageUrl;
                        const sku = item.customSku || item.product?.sku;

                        return (
                            <div key={index} className="bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-900/5 transition-all duration-300 group flex flex-col h-full transform hover:-translate-y-1">
                                {/* Image Box */}
                                <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100 p-4">
                                    {image ? (
                                        <img 
                                            src={image} 
                                            alt={name || ''} 
                                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out drop-shadow-sm"
                                        />
                                    ) : (
                                        <div className="text-slate-300 flex flex-col items-center">
                                            <Box size={48} className="mb-3 opacity-40 group-hover:scale-110 transition-transform duration-500" />
                                            <span className="text-xs font-medium tracking-wide">CHƯA CÓ HÌNH ẢNH</span>
                                        </div>
                                    )}
                                    
                                    {/* Top left badges */}
                                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                                        {sku && (
                                            <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-bold text-slate-700 shadow-sm border border-slate-200/50">
                                                SKU: {sku}
                                            </div>
                                        )}
                                    </div>

                                    {/* Top right badges */}
                                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                                        {origin && (
                                            <div className="bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white shadow-sm flex items-center gap-1 uppercase tracking-wider">
                                                <MapPin size={10} /> {origin}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Content Box */}
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="text-[17px] font-bold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
                                        {name}
                                    </h3>
                                    
                                    {note && (
                                        <div className="inline-flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg mb-3 border border-amber-100/50">
                                            <ShieldCheck size={14} className="mt-0.5 shrink-0" />
                                            <span className="leading-tight">{note}</span>
                                        </div>
                                    )}
                                    
                                    <p className="text-sm text-slate-500 mb-4 line-clamp-3 flex-1 pt-2 border-t border-slate-50">
                                        {desc || 'Chưa có thông tin mô tả chi tiết cho sản phẩm này.'}
                                    </p>
                                    
                                    {/* Footer attributes / Pricing */}
                                    <div className="pt-4 border-t border-slate-100 mt-auto bg-slate-50/50 -mx-5 -mb-5 p-5">
                                        <div className="space-y-3">
                                            {dealerPrice > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá đại lý</div>
                                                    <div className="text-base font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dealerPrice)}
                                                    </div>
                                                </div>
                                            )}
                                            {retailPrice > 0 ? (
                                                <div className="flex items-end justify-between">
                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giá bán lẻ</div>
                                                    <div className="text-xl font-black text-emerald-600 drop-shadow-sm">
                                                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(retailPrice)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Giá bán lẻ</div>
                                                    <div className="text-sm font-bold text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                                        <CheckCircle size={14} /> Liên hệ báo giá
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {ecatalog.items.length === 0 && (
                    <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-16 flex flex-col items-center justify-center text-slate-400 shadow-sm mt-8">
                        <div className="bg-slate-50 p-6 rounded-full mb-4">
                            <Box size={56} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">E-Catalog trống</h3>
                        <p className="text-base text-center max-w-md text-slate-500">
                            Danh mục này hiện chưa có sản phẩm nào được cập nhật. Vui lòng quay lại sau hoặc liên hệ với người phụ trách.
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 border-t border-slate-200/60 pt-8">
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

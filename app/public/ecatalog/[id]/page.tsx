import { Box, CheckCircle } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import Image from 'next/image';


export const metadata: Metadata = {
    title: 'Product E-Catalog',
    description: 'Bản xem trước E-Catalog sản phẩm trực tuyến',
};

export default async function PublicEcatalogPage({ params }: { params: { id: string } }) {
    const ecatalog = await prisma.ecatalog.findUnique({
        where: { id: params.id },
        include: {
            creator: {
                select: { name: true, email: true, phone: true, avatar: true }
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

    const companyName = getSetting('COMPANY_NAME') || 'ContractMgr Enterprise';
    const companyLogo = getSetting('COMPANY_LOGO');
    const companyEmail = getSetting('COMPANY_EMAIL');
    const companyPhone = getSetting('COMPANY_PHONE');
    const companyWebsite = getSetting('COMPANY_WEBSITE');

    return (
        <div className="min-h-screen bg-gray-50 pb-20 font-sans">
            {/* Header / Hero Section */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
                        
                        {/* Company Info */}
                        <div className="flex items-start gap-4 md:max-w-md">
                            {companyLogo ? (
                                <img src={companyLogo} alt={companyName} className="h-16 w-auto object-contain" />
                            ) : (
                                <div className="h-16 w-16 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-sm">
                                    {companyName.charAt(0)}
                                </div>
                            )}
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{companyName}</h2>
                                <div className="mt-2 space-y-1 text-sm text-gray-500">
                                    {companyPhone && <p>📞 {companyPhone}</p>}
                                    {companyEmail && <p>✉️ {companyEmail}</p>}
                                    {companyWebsite && <p>🌐 {companyWebsite}</p>}
                                </div>
                            </div>
                        </div>

                        {/* Catalog Info */}
                        <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 md:text-right flex-1 md:max-w-md">
                            <div className="inline-block bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                                Product E-Catalog
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2 leading-tight">
                                {ecatalog.name}
                            </h1>
                            <p className="text-gray-500 text-sm mb-4">
                                {ecatalog.description || 'Danh mục sản phẩm chính hãng.'}
                            </p>
                            
                            <div className="pt-4 border-t border-gray-200 mt-4 text-left">
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Phụ trách tư vấn</p>
                                <div className="flex items-center gap-3">
                                    {ecatalog.creator.avatar ? (
                                        <img src={ecatalog.creator.avatar} alt={ecatalog.creator.name || ''} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200">
                                            {ecatalog.creator.name?.charAt(0) || 'U'}
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-semibold text-gray-900">{ecatalog.creator.name}</div>
                                        <div className="text-sm text-blue-600">{ecatalog.creator.phone || ecatalog.creator.email}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Box className="text-blue-600" /> Danh Sách Sản Phẩm
                    </h2>
                    <div className="text-sm text-gray-500 font-medium bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
                        Tổng cộng: {ecatalog.items.length} sản phẩm
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {ecatalog.items.map((item, index) => {
                        const name = item.customName || item.product?.name;
                        const desc = item.customDesc || item.product?.description;
                        const price = item.customPrice ?? item.product?.salePrice ?? 0;
                        const image = item.imageUrl || item.product?.imageUrl;
                        const sku = item.product?.sku;

                        return (
                            <div key={index} className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
                                {/* Image Box */}
                                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden flex items-center justify-center border-b border-gray-100">
                                    {image ? (
                                        <img 
                                            src={image} 
                                            alt={name || ''} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="text-gray-400 flex flex-col items-center">
                                            <Box size={40} className="mb-2 opacity-50" />
                                            <span className="text-xs font-medium">Chưa có hình ảnh</span>
                                        </div>
                                    )}
                                    {/* SKU Badge */}
                                    {sku && (
                                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-xs font-bold text-gray-700 shadow-sm border border-gray-200/50">
                                            {sku}
                                        </div>
                                    )}
                                </div>

                                {/* Content Box */}
                                <div className="p-5 flex flex-col flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                        {name}
                                    </h3>
                                    
                                    <div className="text-sm text-gray-600 mb-3 space-y-1">
                                        {origin && (
                                            <p><span className="font-semibold text-gray-700">Xuất xứ:</span> {origin}</p>
                                        )}
                                        {note && (
                                            <p><span className="font-semibold text-gray-700">Ghi chú:</span> {note}</p>
                                        )}
                                    </div>
                                    
                                    <p className="text-sm text-gray-500 mb-4 line-clamp-3 flex-1 border-t border-gray-50 pt-3">
                                        {desc || 'Chưa có mô tả chi tiết.'}
                                    </p>
                                    
                                    {/* Footer attributes */}
                                    <div className="pt-4 border-t border-gray-100 mt-auto space-y-2">
                                        {dealerPrice > 0 && (
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 font-medium">Giá đại lý</div>
                                                <div className="text-md font-bold text-orange-600">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(dealerPrice)}
                                                </div>
                                            </div>
                                        )}
                                        {retailPrice > 0 ? (
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 font-medium">Giá bán lẻ</div>
                                                <div className="text-lg font-extrabold text-blue-600">
                                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(retailPrice)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <div className="text-xs text-gray-500 font-medium">Giá bán lẻ</div>
                                                <div className="text-sm font-medium text-blue-600 flex items-center gap-1">
                                                    <CheckCircle size={14} /> Liên hệ báo giá
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {ecatalog.items.length === 0 && (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-gray-500">
                        <Box size={48} className="text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">Catalog trống</h3>
                        <p className="text-sm text-center max-w-md">Catalog này hiện chưa có sản phẩm nào được cập nhật. Vui lòng liên hệ với người phụ trách để biết thêm chi tiết.</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 text-center text-sm text-gray-400">
                <p>&copy; {new Date().getFullYear()} {companyName}. All rights reserved.</p>
                <p className="mt-1">Powered by ContractMgr E-Catalog System</p>
            </div>
        </div>
    );
}

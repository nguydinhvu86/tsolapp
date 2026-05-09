import { formatDate } from '@/lib/utils/formatters';
import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { DocumentSignatureBlock } from '@/app/components/ui/DocumentSignatureBlock';
import { Calendar, User, UserCheck, Clock, FileText, LayoutGrid, Package, ShieldCheck, Tag, Info } from 'lucide-react';

export default async function PublicSalesEstimatePage({ params }: { params: { id: string } }) {
    const estimate = await prisma.salesEstimate.findUnique({
        where: { id: params.id },
        include: {
            customer: true,
            creator: true,
            items: { include: { product: true } }
        }
    });

    if (!estimate) {
        notFound();
    }

    // Lazy evaluate EXPIRED status
    const todayAtMidnight = new Date();
    todayAtMidnight.setHours(0, 0, 0, 0);

    if (estimate.status === 'SENT' && estimate.validUntil && new Date(estimate.validUntil).setHours(0, 0, 0, 0) < todayAtMidnight.getTime()) {
        await prisma.salesEstimate.update({
            where: { id: estimate.id },
            data: { status: 'EXPIRED' }
        });
        estimate.status = 'EXPIRED';
    }

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 pb-20">
            {/* Sleek Gradient Header Bar */}
            <div className="h-2 w-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600"></div>

            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
                
                {/* Top Info Bar - Glassmorphism */}
                <div className="bg-white/80 backdrop-blur-xl shadow-sm border border-slate-200 rounded-3xl p-6 md:p-8 flex flex-col xl:flex-row gap-8 items-start xl:items-center justify-between relative overflow-hidden">
                    
                    {/* Decorative Background Element */}
                    <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full blur-3xl opacity-70 pointer-events-none"></div>

                    <div className="flex-1 flex flex-wrap items-center gap-x-12 gap-y-6 relative z-10">
                        {/* Customer */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <User className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Khách Hàng</span>
                                <span className="text-base font-bold text-slate-900">{estimate.customer?.name}</span>
                            </div>
                        </div>

                        <div className="w-px h-10 bg-slate-200 hidden sm:block"></div>

                        {/* Salesperson */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                                <UserCheck className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Nhân Viên</span>
                                <span className="text-base font-bold text-slate-900">{estimate.creator?.name || '---'}</span>
                            </div>
                        </div>

                        <div className="w-px h-10 bg-slate-200 hidden md:block"></div>

                        {/* Date */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Ngày Báo Giá</span>
                                <span className="text-base font-bold text-slate-900">{formatDate(estimate.date)}</span>
                            </div>
                        </div>

                        <div className="w-px h-10 bg-slate-200 hidden lg:block"></div>

                        {/* Valid Until */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-1">Hiệu Lực Đến</span>
                                <span className="text-base font-bold text-slate-900">{formatDate(estimate.validUntil) || '---'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Total Amount Box */}
                    <div className="bg-slate-900 rounded-2xl px-8 py-5 shadow-xl relative z-10 w-full xl:w-auto shrink-0 flex items-center justify-between xl:flex-col xl:items-end gap-2 border border-slate-800">
                        <span className="text-sm tracking-widest text-slate-400 font-medium uppercase">Tổng Giá Trị</span>
                        <span className="text-3xl sm:text-4xl font-black text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                            {formatMoney(estimate.totalAmount)}
                        </span>
                    </div>
                </div>

                {/* E-Catalog Header Title */}
                <div className="flex items-center gap-3 py-4">
                    <LayoutGrid className="w-6 h-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Danh Sách Sản Phẩm</h2>
                    <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent ml-4"></div>
                </div>

                {/* E-Catalog Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                    {estimate.items?.map((item: any) => (
                        <div key={item.id} className="bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 overflow-hidden border border-slate-100 group flex flex-col transform hover:-translate-y-1">
                            {/* Image Section */}
                            <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center p-6 border-b border-slate-100">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.customName} className="object-contain w-full h-full group-hover:scale-110 transition-transform duration-700 ease-out" />
                                ) : (
                                    <div className="text-slate-300 flex flex-col items-center gap-3">
                                        <Package className="w-16 h-16 stroke-[1.5]" />
                                        <span className="text-sm font-medium">Chưa có hình ảnh</span>
                                    </div>
                                )}
                                {/* Badge */}
                                {item.isSubItem && (
                                    <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-sm flex items-center gap-1.5">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                        Sản phẩm phụ
                                    </div>
                                )}
                            </div>
                            
                            {/* Details Section */}
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-lg font-bold text-slate-900 line-clamp-2 mb-3 leading-snug group-hover:text-blue-600 transition-colors">
                                    {item.customName || item.product?.name || 'Sản phẩm'}
                                </h3>
                                
                                {item.description && (
                                    <p className="text-sm text-slate-500 line-clamp-3 mb-5 flex-1 leading-relaxed">
                                        {item.description}
                                    </p>
                                )}
                                
                                {/* Specs Grid */}
                                {(item.manufacture || item.origin || item.warranty || item.product?.sku) && (
                                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-600 mb-6 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                                        {item.manufacture && (
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate" title={item.manufacture}>Hãng: <span className="font-semibold text-slate-900">{item.manufacture}</span></span>
                                            </div>
                                        )}
                                        {item.origin && (
                                            <div className="flex items-center gap-2">
                                                <Info className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate" title={item.origin}>X.Xứ: <span className="font-semibold text-slate-900">{item.origin}</span></span>
                                            </div>
                                        )}
                                        {item.warranty && (
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate" title={item.warranty}>B.Hành: <span className="font-semibold text-slate-900">{item.warranty}</span></span>
                                            </div>
                                        )}
                                        {item.product?.sku && (
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-3.5 h-3.5 text-slate-400" />
                                                <span className="truncate" title={item.product.sku}>SKU: <span className="font-semibold text-slate-900">{item.product.sku}</span></span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {/* Price Section */}
                                <div className="mt-auto pt-5 border-t border-slate-100 flex flex-col gap-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Số lượng</span>
                                        <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg">{item.quantity} {item.unit || item.product?.unit}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Đơn giá</span>
                                        <span className="font-semibold text-slate-700">{formatMoney(item.unitPrice)}</span>
                                    </div>
                                    <div className="flex justify-between items-end mt-2 pt-3 border-t border-slate-50 border-dashed">
                                        <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Thành Tiền</span>
                                        <span className="text-xl font-black text-blue-600">{formatMoney(item.totalPrice)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                
                {/* Notes Section */}
                {estimate.notes && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/50 rounded-3xl p-6 md:p-8 text-amber-900 shadow-sm relative overflow-hidden mt-8">
                        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-400 to-orange-400"></div>
                        <h4 className="font-bold mb-3 flex items-center gap-2 text-lg">
                            <Info className="w-6 h-6 text-amber-500" />
                            Ghi chú & Điều khoản
                        </h4>
                        <div className="whitespace-pre-line text-sm md:text-base leading-relaxed opacity-90">{estimate.notes}</div>
                    </div>
                )}

                {/* Signatures */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 mt-8">
                    <div className="flex flex-col md:flex-row justify-between gap-12">
                        <DocumentSignatureBlock 
                            entityType="SALES_ESTIMATE" 
                            entityId={estimate.id} 
                            role="CUSTOMER" 
                            title="XÁC NHẬN CỦA KHÁCH HÀNG" 
                            subtitle="(Ký tên)" 
                            canSign={true} 
                            initialSignature={estimate.customerSignature} 
                            initialSignedAt={estimate.customerSignedAt}
                            metadata={{
                                ip: estimate.customerSignIP,
                                device: estimate.customerSignDevice,
                                location: estimate.customerSignLocation
                            }} 
                        />
                        <DocumentSignatureBlock 
                            entityType="SALES_ESTIMATE" 
                            entityId={estimate.id} 
                            role="COMPANY" 
                            title="NGƯỜI LẬP BÁO GIÁ" 
                            subtitle="(Ký tên)" 
                            canSign={false} 
                            initialSignature={estimate.companySignature} 
                            initialSignedAt={estimate.companySignedAt} 
                            signerName={estimate.creator?.name} 
                        />
                    </div>
                </div>
                
                {/* Minimal Footer */}
                <div className="text-center text-slate-400 text-sm font-medium py-8 pb-12">
                    E-Catalog generated securely • {formatDate(new Date())}
                </div>
            </div>
        </div>
    );
}

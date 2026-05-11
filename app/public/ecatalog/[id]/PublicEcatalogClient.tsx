'use client';

import React, { useState } from 'react';
import { Box, CheckCircle, Phone, Mail, Globe, MapPin, Tag, ShieldCheck, User, ChevronLeft, ChevronRight, X, Info, Search } from 'lucide-react';

interface PublicEcatalogClientProps {
    ecatalog: any;
}

export default function PublicEcatalogClient({ ecatalog }: PublicEcatalogClientProps) {
    const itemsPerPage = 8;
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredItems = ecatalog.items.filter((item: any) => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();
        const name = (item.customName || item.product?.name || '').toLowerCase();
        const sku = (item.customSku || item.product?.sku || '').toLowerCase();
        return name.includes(searchLower) || sku.includes(searchLower);
    });

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage) || 1;
    const currentItems = filteredItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleNextPage = () => {
        if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) setCurrentPage(prev => prev - 1);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="relative z-20">
            {/* Toolbar / Pagination Header */}
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-5 py-3 rounded-2xl shadow-sm border border-slate-200 shrink-0">
                    <Box className="text-emerald-500" size={24} />
                    <div>
                        <span className="text-slate-800 font-bold block leading-none">Danh sách sản phẩm</span>
                        <span className="text-slate-500 text-xs font-medium">Tổng cộng: {filteredItems.length} mục</span>
                    </div>
                </div>

                <div className="flex-1 max-w-md w-full relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Tìm kiếm theo tên hoặc mã sản phẩm..." 
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/80 backdrop-blur-md border border-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all text-sm text-slate-700 font-medium placeholder:text-slate-400"
                    />
                </div>

                {totalPages > 1 && (
                    <div className="flex items-center gap-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm border border-slate-200 shrink-0">
                        <button 
                            onClick={handlePrevPage} 
                            disabled={currentPage === 1}
                            className={`p-2 rounded-full transition-all ${currentPage === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-600 shadow-sm bg-white'}`}
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="text-sm font-bold text-slate-700 font-mono tracking-widest">
                            {currentPage} <span className="text-slate-400 font-medium">/</span> {totalPages}
                        </div>
                        <button 
                            onClick={handleNextPage} 
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-full transition-all ${currentPage === totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100 hover:text-emerald-600 shadow-sm bg-white'}`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>

            {/* Product Grid - Full Width */}
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pb-12 transition-opacity duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6 xl:gap-8">
                    {currentItems.map((item: any, index: number) => {
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
                            <div key={index} className="bg-white rounded-[24px] overflow-hidden border border-slate-200/80 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-900/10 transition-all duration-300 group flex flex-col h-full transform hover:-translate-y-1.5 relative">
                                {/* Image Box */}
                                <div className="aspect-[4/3] bg-gradient-to-b from-slate-50 to-white relative overflow-hidden flex items-center justify-center p-6 border-b border-slate-100 cursor-pointer" onClick={() => setSelectedItem(item)}>
                                    {image ? (
                                        <img 
                                            src={image} 
                                            alt={name || ''} 
                                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out drop-shadow-sm mix-blend-multiply"
                                        />
                                    ) : (
                                        <div className="text-slate-300 flex flex-col items-center">
                                            <Box size={56} className="mb-3 opacity-40 group-hover:scale-110 transition-transform duration-500" />
                                            <span className="text-xs font-bold tracking-widest text-slate-400">NO IMAGE</span>
                                        </div>
                                    )}
                                    
                                    {/* Top left badges */}
                                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                                        {sku && (
                                            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg text-[11px] font-black text-slate-700 shadow-sm border border-slate-200/50 uppercase tracking-wide">
                                                {sku}
                                            </div>
                                        )}
                                    </div>

                                    {/* Top right badges */}
                                    <div className="absolute top-4 right-4 flex flex-col gap-2">
                                        {origin && (
                                            <div className="bg-emerald-500/95 backdrop-blur-md px-3 py-1.5 rounded-lg text-[10px] font-black text-white shadow-sm flex items-center gap-1.5 uppercase tracking-wider">
                                                <MapPin size={12} /> {origin}
                                            </div>
                                        )}
                                    </div>

                                    {/* View details overlay */}
                                    <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                                        <div className="bg-white text-emerald-700 font-bold px-4 py-2 rounded-full shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 text-sm">
                                            <Info size={16} /> Xem chi tiết
                                        </div>
                                    </div>
                                </div>

                                {/* Content Box */}
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 
                                        className="text-[18px] font-bold text-slate-900 mb-3 line-clamp-2 leading-snug group-hover:text-emerald-600 transition-colors cursor-pointer"
                                        onClick={() => setSelectedItem(item)}
                                    >
                                        {name}
                                    </h3>
                                    
                                    {note && (
                                        <div className="inline-flex items-start gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl mb-4 border border-amber-100/50">
                                            <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-500" />
                                            <span className="leading-relaxed">{note}</span>
                                        </div>
                                    )}
                                    
                                    {/* Footer attributes / Pricing */}
                                    <div className="mt-auto bg-slate-50/80 -mx-6 -mb-6 p-6 pt-5 border-t border-slate-100">
                                        <div className="space-y-3.5">
                                            {ecatalog.showDealerPrice && dealerPrice > 0 && (
                                                <div className="flex items-center justify-between">
                                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Giá đại lý</div>
                                                    <div className="text-base font-black text-amber-600">
                                                        {formatCurrency(dealerPrice)}
                                                    </div>
                                                </div>
                                            )}
                                            {retailPrice > 0 ? (
                                                <div className="flex items-end justify-between">
                                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Giá bán lẻ</div>
                                                    <div className="text-2xl font-black text-emerald-600 drop-shadow-sm">
                                                        {formatCurrency(retailPrice)}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Giá bán lẻ</div>
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

                {filteredItems.length === 0 && (
                    <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 flex flex-col items-center justify-center text-slate-400 shadow-sm mt-8">
                        <div className="bg-slate-50 p-6 rounded-full mb-5">
                            {searchQuery ? <Search size={64} className="text-slate-300" /> : <Box size={64} className="text-slate-300" />}
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-3">
                            {searchQuery ? 'Không tìm thấy kết quả' : 'E-Catalog trống'}
                        </h3>
                        <p className="text-lg text-center max-w-lg text-slate-500">
                            {searchQuery 
                                ? `Không có sản phẩm nào khớp với từ khóa "${searchQuery}". Vui lòng thử lại với từ khóa khác.` 
                                : 'Danh mục này hiện chưa có sản phẩm nào được cập nhật. Vui lòng quay lại sau hoặc liên hệ với người phụ trách.'}
                        </p>
                        {searchQuery && (
                            <button 
                                onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
                                className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                            >
                                Xóa tìm kiếm
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16 flex justify-center">
                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }).map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentPage(idx + 1)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${currentPage === idx + 1 ? 'w-10 bg-emerald-500' : 'bg-slate-300 hover:bg-emerald-300'}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)}></div>
                    <div className="relative bg-white w-full max-w-5xl max-h-[90vh] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row transform transition-all">
                        <button 
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/80 backdrop-blur-md text-slate-800 hover:bg-slate-100 hover:text-red-500 rounded-full flex items-center justify-center transition-colors shadow-sm"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="md:w-2/5 bg-slate-50 p-8 flex items-center justify-center border-r border-slate-100">
                            {selectedItem.imageUrl || selectedItem.product?.imageUrl ? (
                                <img 
                                    src={selectedItem.imageUrl || selectedItem.product?.imageUrl} 
                                    alt={selectedItem.customName || selectedItem.product?.name} 
                                    className="w-full max-h-[40vh] md:max-h-full object-contain drop-shadow-lg mix-blend-multiply"
                                />
                            ) : (
                                <Box size={100} className="text-slate-300" />
                            )}
                        </div>
                        
                        <div className="md:w-3/5 p-8 md:p-12 overflow-y-auto">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {(selectedItem.customSku || selectedItem.product?.sku) && (
                                    <span className="bg-slate-100 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200">
                                        SKU: {selectedItem.customSku || selectedItem.product?.sku}
                                    </span>
                                )}
                                {(selectedItem.customOrigin) && (
                                    <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-100">
                                        Xuất xứ: {selectedItem.customOrigin}
                                    </span>
                                )}
                            </div>
                            
                            <h2 className="text-3xl font-black text-slate-900 mb-6 leading-tight">
                                {selectedItem.customName || selectedItem.product?.name}
                            </h2>
                            
                            {selectedItem.customNote && (
                                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100/50 flex items-start gap-3">
                                    <ShieldCheck className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-amber-800 font-medium text-sm leading-relaxed">{selectedItem.customNote}</p>
                                </div>
                            )}

                            <div className="prose prose-slate prose-sm sm:prose-base max-w-none text-slate-600 mb-8 whitespace-pre-wrap">
                                {selectedItem.customDesc || selectedItem.product?.description || 'Chưa có mô tả chi tiết.'}
                            </div>

                            <div className="mt-auto pt-8 border-t border-slate-100">
                                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
                                    <div className="space-y-4 w-full sm:w-auto">
                                        {ecatalog.showDealerPrice && (selectedItem.customDealerPrice > 0) && (
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Giá đại lý</div>
                                                <div className="text-xl font-black text-amber-600">
                                                    {formatCurrency(selectedItem.customDealerPrice)}
                                                </div>
                                            </div>
                                        )}
                                        {selectedItem.customRetailPrice > 0 || (selectedItem.customPrice ?? selectedItem.product?.salePrice ?? 0) > 0 ? (
                                            <div>
                                                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">Giá bán lẻ</div>
                                                <div className="text-4xl font-black text-emerald-600">
                                                    {formatCurrency(selectedItem.customRetailPrice || selectedItem.customPrice || selectedItem.product?.salePrice)}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-lg font-bold text-emerald-600 flex items-center gap-2 bg-emerald-50 px-5 py-3 rounded-xl border border-emerald-100">
                                                <CheckCircle size={20} /> Liên hệ báo giá
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        className="w-full sm:w-auto bg-slate-900 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:translate-y-0"
                                    >
                                        Nhận tư vấn ngay
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client'

import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, ShieldAlert, Search, RefreshCw, CheckCircle2, 
    AlertCircle, Clock, Calendar, Package, Tag, Phone, Mail, 
    MapPin, Globe, Copy, Check, Printer, ExternalLink, HelpCircle
} from 'lucide-react';
import { lookupPublicWarranty } from './actions';

interface WarrantyData {
    serialNumber: string;
    productName: string;
    sku: string;
    unit: string;
    description: string | null;
    status: string;
    isNoWarranty: boolean;
    warrantyMonths: number;
    exportDate: string | null;
    warrantyEndDate: string | null;
    isWarrantyValid: boolean;
    isExpired: boolean;
    daysRemaining: number;
    daysExpired: number;
    supportContact: {
        companyName: string;
        phone: string;
        email: string;
        address: string;
        website: string;
        logo: string | null;
    };
}

export default function PublicWarrantyClient({ initialSerial = '', isEmbed = false }: { initialSerial?: string; isEmbed?: boolean }) {
    const [searchQuery, setSearchQuery] = useState(initialSerial);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<WarrantyData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const sn = params.get('sn') || params.get('serial') || initialSerial;
            if (sn && sn.trim()) {
                setSearchQuery(sn.trim());
                handlePerformSearch(sn.trim());
            }
        }
    }, [initialSerial]);

    const handlePerformSearch = async (sn: string) => {
        const clean = sn.trim();
        if (!clean) {
            setError('Vui lòng nhập số Serial hoặc IMEI của thiết bị.');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await lookupPublicWarranty(clean);
            if (res.success && res.data) {
                setResult(res.data as WarrantyData);
            } else {
                setError(res.error || 'Không tìm thấy thông tin bảo hành của số Serial này.');
            }
        } catch (err: any) {
            setError('Có lỗi kết nối đến máy chủ bảo hành. Vui lòng thử lại sau.');
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handlePerformSearch(searchQuery);
    };

    const handleCopy = () => {
        if (!result) return;
        const text = `THÔNG TIN BẢO HÀNH CHÍNH HÃNG\n- Thiết bị: ${result.productName}\n- Mã SKU: ${result.sku}\n- Số Serial: ${result.serialNumber}\n- Ngày xuất hàng: ${result.exportDate ? new Date(result.exportDate).toLocaleDateString('vi-VN') : 'Chưa có'}\n- Thời hạn bảo hành: ${result.isNoWarranty ? 'Không bảo hành (KBH)' : `${result.warrantyMonths} tháng`}\n- Hạn bảo hành đến ngày: ${result.warrantyEndDate ? new Date(result.warrantyEndDate).toLocaleDateString('vi-VN') : 'Không áp dụng'}\n- Tình trạng: ${result.isNoWarranty ? 'Không áp dụng BH' : (result.isWarrantyValid ? `Còn hạn (${result.daysRemaining} ngày)` : 'Đã hết hạn')}`;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50 text-slate-800 ${isEmbed ? 'p-2 sm:p-4 min-h-0' : 'p-4 sm:p-6 md:p-10'}`}>
            <div className="max-w-3xl mx-auto space-y-6">
                
                {/* Header Section */}
                {!isEmbed && (
                    <div className="text-center space-y-3 pt-2 sm:pt-4">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 mb-1">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            Tra Cứu Bảo Hành Điện Tử
                        </h1>
                        <p className="text-sm text-slate-600 max-w-lg mx-auto font-medium">
                            Kiểm tra chính xác xuất xứ nguồn gốc, thời hạn bảo hành và thời gian còn lại của thiết bị chính hãng qua mã Serial / IMEI.
                        </p>
                    </div>
                )}

                {/* Search Box Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border border-slate-200/80 p-5 sm:p-7 space-y-4">
                    <form onSubmit={onSubmit} className="space-y-3">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                            Nhập Số Serial / IMEI Thiết Bị
                        </label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="VD: SN-2026-WIN11, win01-01, 8645020..."
                                    className="w-full h-12 pl-11 pr-4 rounded-2xl bg-slate-50 border border-slate-300 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-inner"
                                    autoFocus={!initialSerial}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="h-12 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm shadow-md shadow-emerald-500/30 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-60"
                            >
                                {loading ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Đang Tra Cứu...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>Kiểm Tra Ngay</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                        <span className="flex items-center gap-1">
                            <HelpCircle size={13} /> Mã Serial thường được in trên tem phụ kiện, vỏ hộp hoặc phía sau thân máy
                        </span>
                        <span className="font-medium text-emerald-700">Hệ Thống Xác Thực Trực Tuyến</span>
                    </div>
                </div>

                {/* Error Alert */}
                {error && (
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start gap-3 shadow-xs animate-in fade-in">
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                            <strong className="font-bold">Không tìm thấy thông tin:</strong>
                            <p className="mt-0.5 text-xs text-rose-700 leading-relaxed">{error}</p>
                        </div>
                    </div>
                )}

                {/* Result Card: Electronic Warranty Certificate */}
                {result && (
                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/80 border-2 border-emerald-500/40 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                        
                        {/* Certificate Top Banner */}
                        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-widest text-emerald-100">
                                    <ShieldCheck className="w-3.5 h-3.5" /> Chứng Nhận Bảo Hành Chính Hãng
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black font-mono tracking-wider pt-1">
                                    {result.serialNumber}
                                </h2>
                                <p className="text-xs text-emerald-100 font-medium">
                                    {result.productName}
                                </p>
                            </div>

                            <div>
                                {result.isNoWarranty ? (
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-slate-800/80 text-white border border-slate-600 shadow-md">
                                        Không áp dụng bảo hành (KBH)
                                    </span>
                                ) : result.status === 'IN_STOCK' ? (
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-amber-400 text-amber-950 shadow-md">
                                        <Clock className="w-4 h-4" />
                                        Thiết Bị Kho (Kích hoạt {result.warrantyMonths} tháng khi bán)
                                    </span>
                                ) : result.isWarrantyValid ? (
                                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-emerald-800 shadow-lg font-extrabold text-xs">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                        <span>CÒN HẠN BẢO HÀNH</span>
                                    </div>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold bg-rose-500 text-white shadow-md">
                                        <ShieldAlert className="w-4 h-4" />
                                        HẾT HẠN BẢO HÀNH
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Certificate Core Info Grid */}
                        <div className="p-6 sm:p-7 space-y-6">
                            
                            {/* Key Parameters Required by User */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                
                                {/* Parameter 1: Tên sản phẩm & Mã SKU */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                        <Package className="w-3.5 h-3.5 text-emerald-600" /> Tên Sản Phẩm
                                    </span>
                                    <p className="font-extrabold text-slate-900 text-sm leading-snug">
                                        {result.productName}
                                    </p>
                                    <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
                                        <span>Mã SP (SKU):</span>
                                        <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                                            {result.sku}
                                        </span>
                                    </div>
                                </div>

                                {/* Parameter 2: Ngày xuất hàng */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-blue-600" /> Ngày Xuất Hàng / Kích Hoạt
                                    </span>
                                    <p className="font-extrabold font-mono text-slate-900 text-sm">
                                        {result.exportDate ? new Date(result.exportDate).toLocaleDateString('vi-VN') : (result.status === 'IN_STOCK' ? 'Chưa xuất bán (Tồn kho)' : 'Đang cập nhật')}
                                    </p>
                                    <p className="text-[11px] text-slate-400 pt-0.5">
                                        {result.exportDate ? 'Thời hạn bảo hành bắt đầu tính từ ngày này' : 'Bảo hành sẽ kích hoạt khi xuất kho giao khách'}
                                    </p>
                                </div>

                                {/* Parameter 3: Thời gian bảo hành */}
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Thời Gian Bảo Hành
                                    </span>
                                    <p className="font-extrabold text-slate-900 text-sm">
                                        {result.isNoWarranty ? 'Không bảo hành (KBH)' : `${result.warrantyMonths} Tháng`}
                                    </p>
                                    <p className="text-[11px] text-slate-400 pt-0.5">
                                        {result.isNoWarranty ? 'Mặt hàng tiêu hao hoặc không áp dụng bảo hành' : 'Chế độ bảo hành chính hãng theo tiêu chuẩn NSX'}
                                    </p>
                                </div>

                                {/* Parameter 4: Hạn bảo hành còn lại & Hạn đến ngày */}
                                <div className={`p-4 rounded-2xl border space-y-1 ${
                                    result.isWarrantyValid 
                                        ? 'bg-emerald-50/70 border-emerald-300' 
                                        : (result.isNoWarranty ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/70 border-rose-300')
                                }`}>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-emerald-700" /> Hạn Bảo Hành Còn Lại
                                    </span>
                                    <p className={`font-black text-sm ${
                                        result.isWarrantyValid 
                                            ? 'text-emerald-800' 
                                            : (result.isNoWarranty ? 'text-slate-700' : 'text-rose-800')
                                    }`}>
                                        {result.isNoWarranty ? (
                                            'Không tính thời hạn'
                                        ) : result.status === 'IN_STOCK' ? (
                                            `Nguyên hạn ${result.warrantyMonths} tháng (Chưa kích hoạt)`
                                        ) : result.isWarrantyValid ? (
                                            `Còn lại ${result.daysRemaining} ngày (~${Math.floor(result.daysRemaining / 30)} tháng ${result.daysRemaining % 30} ngày)`
                                        ) : (
                                            `Đã hết hạn bảo hành (${result.daysExpired} ngày trước)`
                                        )}
                                    </p>
                                    <div className="flex items-center gap-1 text-xs pt-0.5 text-slate-600">
                                        <span>Đến ngày:</span>
                                        <span className="font-bold font-mono text-slate-900">
                                            {result.warrantyEndDate ? new Date(result.warrantyEndDate).toLocaleDateString('vi-VN') : (result.isNoWarranty ? 'Không áp dụng' : 'Chưa kích hoạt')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Root Support & Warranty Contact (Hỗ trợ tại gốc khi không liên hệ được đại lý cũ) */}
                            <div className="p-4.5 rounded-2xl bg-gradient-to-br from-slate-50 via-slate-100/60 to-emerald-50/30 border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        Trung Tâm Tiếp Nhận & Hỗ Trợ Bảo Hành Tại Gốc
                                    </span>
                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                        Chính Hãng
                                    </span>
                                </div>
                                
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Quý khách hàng mua qua đại lý hoặc kênh phân phối nếu không liên hệ được điểm bán cũ, vui lòng gửi thiết bị trực tiếp về trung tâm bảo hành gốc dưới đây để được hỗ trợ kiểm tra và xử lý:
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>Hotline: <strong className="font-bold font-mono text-slate-900">{result.supportContact.phone}</strong></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-700">
                                        <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>Email: <strong className="font-bold text-slate-900">{result.supportContact.email}</strong></span>
                                    </div>
                                    <div className="flex items-start gap-2 text-slate-700 sm:col-span-2">
                                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <span>Địa chỉ tiếp nhận: <strong className="text-slate-900">{result.supportContact.address}</strong></span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons: Copy / Print */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                                <span className="text-[11px] text-slate-400 font-mono">
                                    Xác thực hệ thống WMS ID: {result.serialNumber}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCopy}
                                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                                        <span>{copied ? 'Đã Sao Chép' : 'Sao Chép Thông Tin'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => window.print()}
                                        className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <Printer className="w-3.5 h-3.5 text-slate-500" />
                                        <span>In Thẻ Bảo Hành</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Notes */}
                {!isEmbed && (
                    <div className="text-center text-xs text-slate-400 space-y-1 pb-6">
                        <p>© Hệ thống quản lý và xác thực bảo hành điện tử chính hãng.</p>
                        <p>Cập nhật tự động theo thời gian thực từ cơ sở dữ liệu xuất kho WMS.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
